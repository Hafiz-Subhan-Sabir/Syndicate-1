from django.contrib import admin

from apps.membership.models import Article, Video


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_featured", "published_at", "created_at")
    list_filter = ("is_featured",)
    search_fields = ("title", "slug", "description")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ("title", "duration", "created_at")
    search_fields = ("title", "description")
