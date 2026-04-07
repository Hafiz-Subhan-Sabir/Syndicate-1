from django.urls import path

from apps.membership import views

urlpatterns = [
    # Trailing slash is canonical; duplicate patterns avoid APPEND_SLASH 301 when proxies/clients
    # request .../articles?q= (no slash before ?) — a 301 to :8000 breaks fetch via Next proxy.
    path("articles/", views.ArticleListView.as_view(), name="membership-articles"),
    path("articles", views.ArticleListView.as_view()),
    path("videos/", views.VideoListView.as_view(), name="membership-videos"),
    path("videos", views.VideoListView.as_view()),
    path("search/", views.MembershipSearchView.as_view(), name="membership-search"),
    path("search", views.MembershipSearchView.as_view()),
    path("tags/", views.ArticleTagsView.as_view(), name="membership-tags"),
    path("tags", views.ArticleTagsView.as_view()),
]
