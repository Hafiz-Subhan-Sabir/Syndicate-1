"""
Membership API access: list/search/tags/video GET can be opened without JWT in DEBUG
(see MEMBERSHIP_ALLOW_ANONYMOUS_READ). PDF download stays authenticated-only.
"""

from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class MembershipPublicReadOrAuthenticated(BasePermission):
    """
    Safe methods (GET, HEAD, OPTIONS) allowed without auth when
    settings.MEMBERSHIP_ALLOW_ANONYMOUS_READ is True.
    Otherwise requires an authenticated user (JWT).
    """

    message = "Authentication required."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS and getattr(
            settings, "MEMBERSHIP_ALLOW_ANONYMOUS_READ", False
        ):
            return True
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)
