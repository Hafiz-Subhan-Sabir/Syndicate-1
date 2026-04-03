"""
Seed RBAC permissions, roles, demo users, and optional social links.

Usage:
  python manage.py seed_portal
  python manage.py seed_portal --password 'YourSecurePass'
  python manage.py seed_portal --no-reset-password   # keep existing passwords

Env:
  PORTAL_DEV_PASSWORD — default password when --password is omitted
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.portal.models import (
    PortalPermission,
    PortalRole,
    SocialLink,
    UserPortalRole,
)

User = get_user_model()

# Documented dev default (override with PORTAL_DEV_PASSWORD or --password)
DEFAULT_DEV_PASSWORD = "SyndicateDev2026!"

PERMISSIONS = [
    ("portal.access", "Access portal APIs"),
    ("deck.view", "View own missions, reminders, notes"),
    ("deck.manage", "Create/update/delete own deck items"),
    ("social.links.view", "View social links"),
    ("social.links.manage", "Manage own social links"),
    ("social.links.manage_all", "Manage all users social links"),
]

ROLES = {
    "viewer": {
        "display_name": "Viewer",
        "perms": ["portal.access", "deck.view", "social.links.view"],
    },
    "operator": {
        "display_name": "Operator",
        "perms": [
            "portal.access",
            "deck.view",
            "deck.manage",
            "social.links.view",
            "social.links.manage",
        ],
    },
    "admin": {
        "display_name": "Portal Admin",
        "perms": [c for c, _ in PERMISSIONS],
    },
}


class Command(BaseCommand):
    help = "Seed portal RBAC, roles, demo users (demo, viewer1, admin1)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=None,
            help="Password for demo, viewer1, admin1 (else PORTAL_DEV_PASSWORD env, else built-in dev default)",
        )
        parser.add_argument(
            "--no-reset-password",
            action="store_true",
            help="Do not overwrite passwords for demo, viewer1, admin1",
        )

    def handle(self, *args, **options):
        pwd = options["password"] or os.environ.get("PORTAL_DEV_PASSWORD") or DEFAULT_DEV_PASSWORD
        no_reset = options["no_reset_password"]

        for codename, name in PERMISSIONS:
            PortalPermission.objects.update_or_create(codename=codename, defaults={"name": name})

        for slug, cfg in ROLES.items():
            role, _ = PortalRole.objects.update_or_create(
                name=slug,
                defaults={"display_name": cfg["display_name"]},
            )
            role.permissions.set(PortalPermission.objects.filter(codename__in=cfg["perms"]))

        viewer_role = PortalRole.objects.get(name="viewer")
        operator_role = PortalRole.objects.get(name="operator")
        admin_role = PortalRole.objects.get(name="admin")

        def ensure_user(username: str, email: str, *, superuser=False, role: PortalRole | None = None):
            u, created = User.objects.get_or_create(
                username=username,
                defaults={"email": email, "is_staff": superuser, "is_superuser": superuser},
            )
            if created and not superuser:
                u.set_password(pwd)
                u.save()
            elif created and superuser:
                u.set_password(pwd)
                u.save()
            if role:
                UserPortalRole.objects.get_or_create(user=u, role=role)
            return u

        ensure_user("demo", "demo@example.com", role=operator_role)
        ensure_user("viewer1", "viewer@example.com", role=viewer_role)
        admin_user = ensure_user("admin1", "admin@example.com", role=admin_role)
        if not admin_user.is_superuser:
            admin_user.is_staff = True
            admin_user.set_password(pwd)
            admin_user.save()

        if not no_reset:
            for username in ("demo", "viewer1", "admin1"):
                u = User.objects.filter(username=username).first()
                if u:
                    u.set_password(pwd)
                    u.save()

        demo = User.objects.get(username="demo")
        if not SocialLink.objects.filter(user=demo).exists():
            SocialLink.objects.create(
                user=demo,
                platform=SocialLink.Platform.CALENDAR,
                url="https://calendar.google.com",
                label="Google Calendar",
            )
            SocialLink.objects.create(
                user=demo,
                platform=SocialLink.Platform.EMAIL,
                url="https://mail.google.com",
                label="Gmail",
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Portal seed complete.\n"
                "  Users: demo, viewer1, admin1 (email login: demo@example.com, etc.)\n"
                f"  Password (this run): {pwd}\n"
                "  Override: --password or PORTAL_DEV_PASSWORD in .env"
            )
        )
