from rest_framework import permissions

from apps.portal.rbac import user_has_permission


class IsAuthenticatedStrict(permissions.IsAuthenticated):
    message = "Authentication required."


class HasPortalPermission(permissions.BasePermission):
    """Require a specific portal permission codename (see seed_portal)."""

    required_permission = "portal.access"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        code = getattr(view, "required_permission", None) or self.required_permission
        return user_has_permission(request.user, code)


class SocialLinkPermission(permissions.BasePermission):
    """
    social.links.view — read own
    social.links.manage — create/update/delete own
    social.links.manage_all — any user's links (admin)
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return user_has_permission(user, "social.links.view") or user_has_permission(
                user, "social.links.manage"
            )
        return user_has_permission(user, "social.links.manage") or user_has_permission(
            user, "social.links.manage_all"
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user_has_permission(user, "social.links.manage_all"):
            return True
        return getattr(obj, "user_id", None) == user.id


class DeckPermission(permissions.BasePermission):
    """deck.manage — CRUD own deck entities."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return user_has_permission(user, "deck.view") or user_has_permission(user, "deck.manage")
        return user_has_permission(user, "deck.manage")

    def has_object_permission(self, request, view, obj):
        return getattr(obj, "user_id", None) == request.user.id
