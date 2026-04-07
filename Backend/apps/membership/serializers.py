from rest_framework import serializers

from apps.membership.models import Article, Video


class ArticleSerializer(serializers.ModelSerializer):
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
        )


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ("id", "title", "description", "video_url", "thumbnail", "duration", "created_at")
