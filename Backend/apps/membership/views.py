from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, views
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.membership.models import Article, Video
from apps.membership.permissions import MembershipPublicReadOrAuthenticated
from apps.portal.permissions import IsAuthenticatedStrict
from apps.membership.redis_index import cache_get_merged_ids, cache_set_merged_ids, search_article_ids, tokenize
from apps.membership.serializers import ArticleSerializer, VideoSerializer


class MembershipPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


def _ordered_qs(qs, sort: str):
    if sort == "oldest":
        return qs.order_by("published_at", "id")
    return qs.order_by("-published_at", "-id")


def _merge_search_pks(qs, q: str, cache_params: str) -> tuple[set[int], str]:
    """
    Union of Redis inverted-index hits and DB substring matches.
    Returns (set of primary keys, source label).
    """
    q = (q or "").strip()
    if not q:
        return set(qs.values_list("pk", flat=True)), "database"

    cached = cache_get_merged_ids(cache_params)
    if cached is not None:
        return set(cached), "redis_cache"

    db_q = Q(title__icontains=q) | Q(description__icontains=q) | Q(content__icontains=q)
    db_ids = set(qs.filter(db_q).values_list("pk", flat=True))
    redis_ids = search_article_ids(q)

    if redis_ids is None:
        merged = db_ids
        src = "database"
    else:
        merged = redis_ids | db_ids
        if db_ids and not redis_ids:
            src = "database"
        elif redis_ids and not db_ids:
            src = "redis"
        else:
            src = "mixed"

    cache_set_merged_ids(cache_params, list(merged))
    return merged, src


def build_article_queryset(request) -> tuple:
    """Returns (queryset, search_meta dict or None). search_meta set when q is non-empty."""
    qs = Article.objects.all()
    tag = (request.query_params.get("tag") or "").strip()
    sort = (request.query_params.get("sort") or "newest").lower()
    if sort not in ("newest", "oldest"):
        sort = "newest"
    q = (request.query_params.get("q") or "").strip()

    if tag:
        qs = qs.filter(tags__contains=[tag])

    meta = None
    if q:
        # Merged id set does not depend on sort order; keep cache key small.
        cache_params = f"tag={tag}&q={q}"
        merged, src = _merge_search_pks(qs, q, cache_params)
        meta = {"search_source": src, "tokens": list(tokenize(q))}
        if not merged:
            qs = qs.none()
        else:
            qs = qs.filter(pk__in=merged)

    qs = _ordered_qs(qs, sort)
    return qs, meta


class ArticleListView(generics.ListAPIView):
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedStrict]
    pagination_class = MembershipPagination

    def get_queryset(self):
        qs, self._membership_search_meta = build_article_queryset(self.request)
        return qs

    def list(self, request, *args, **kwargs):
        self._membership_search_meta = None
        response = super().list(request, *args, **kwargs)
        meta = getattr(self, "_membership_search_meta", None)
        if meta and isinstance(response.data, dict):
            response.data["search_source"] = meta["search_source"]
            response.data["tokens"] = meta["tokens"]
        return response


class VideoListView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [MembershipPublicReadOrAuthenticated]
    pagination_class = MembershipPagination

    def get_queryset(self):
        return Video.objects.all().order_by("-created_at", "-id")


class MembershipSearchView(generics.ListAPIView):
    """Same filtering as /articles/; response always includes search meta when q is set."""

    serializer_class = ArticleSerializer
    permission_classes = [MembershipPublicReadOrAuthenticated]
    pagination_class = MembershipPagination

    def get_queryset(self):
        qs, self._membership_search_meta = build_article_queryset(self.request)
        return qs

    def list(self, request, *args, **kwargs):
        self._membership_search_meta = None
        response = super().list(request, *args, **kwargs)
        q = (request.query_params.get("q") or "").strip()
        if isinstance(response.data, dict):
            if q:
                meta = getattr(self, "_membership_search_meta", None) or {"search_source": "database", "tokens": []}
                response.data["search_source"] = meta["search_source"]
                response.data["tokens"] = meta["tokens"]
            else:
                response.data["search_source"] = "database"
                response.data["tokens"] = []
        return response


class ArticleTagsView(views.APIView):
    permission_classes = [MembershipPublicReadOrAuthenticated]

    def get(self, request):
        tags: set[str] = set()
        for row in Article.objects.values_list("tags", flat=True):
            if isinstance(row, list):
                tags.update(str(t) for t in row if t)
        return Response(sorted(tags))


class ArticlePdfView(APIView):
    """Serve stored PDF to authenticated members (JWT)."""

    permission_classes = [IsAuthenticatedStrict]

    def get(self, request, pk: int):
        article = get_object_or_404(Article, pk=pk)
        if not article.pdf_file:
            raise Http404()
        try:
            fh = article.pdf_file.open("rb")
        except Exception:
            raise Http404()
        name = article.pdf_file.name.rsplit("/", 1)[-1]
        resp = FileResponse(fh, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{name}"'
        return resp
