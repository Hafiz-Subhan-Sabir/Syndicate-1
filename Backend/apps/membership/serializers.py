from rest_framework import serializers

from apps.membership.models import Article, Video


class ArticleSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "content",
            "source_url",
            "thumbnail",
            "published_at",
            "tags",
            "is_featured",
            "created_at",
            "pdf_url",
        )

    def get_pdf_url(self, obj: Article):
        if not obj.pdf_file:
            return None
        return f"/api/portal/membership/articles/{obj.pk}/pdf/"


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ("id", "title", "description", "video_url", "thumbnail", "duration", "created_at")
