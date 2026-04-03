"""RBAC helpers: resolve permissions from roles + superuser bypass."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser


def user_permission_codenames(user: AbstractUser | None) -> set[str]:
    from apps.portal.models import UserPortalRole

    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return {"*"}
    out: set[str] = set()
    links = (
        UserPortalRole.objects.filter(user=user)
        .select_related("role")
        .prefetch_related("role__permissions")
    )
    for link in links:
        for p in link.role.permissions.all():
            out.add(p.codename)
    return out


def user_has_permission(user, codename: str) -> bool:
    perms = user_permission_codenames(user)
    if "*" in perms:
        return True
    return codename in perms
