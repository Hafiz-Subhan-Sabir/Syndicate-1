from django.contrib import admin

from apps.portal.models import Mission, Note, PortalPermission, PortalRole, Reminder, SocialLink, UserPortalRole


@admin.register(PortalPermission)
class PortalPermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name")
    search_fields = ("codename", "name")


@admin.register(PortalRole)
class PortalRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "display_name")
    search_fields = ("name", "display_name")
    filter_horizontal = ("permissions",)


@admin.register(UserPortalRole)
class UserPortalRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role")
    autocomplete_fields = ("user", "role")


@admin.register(SocialLink)
class SocialLinkAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "platform", "label", "is_active", "updated_at")
    list_filter = ("platform", "is_active")


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "target_at", "status", "points")


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "date", "time", "status")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "created_at")
