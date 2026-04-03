"""
Set passwords for seeded portal users (demo, viewer1, admin1).

Usage (from Backend directory):
  python scripts/reset_portal_passwords.py
  python scripts/reset_portal_passwords.py MyCustomPass
"""
import os
import sys

import django

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _BACKEND)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "syndicate_backend.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
pwd = (
    sys.argv[1]
    if len(sys.argv) > 1
    else os.environ.get("PORTAL_DEV_PASSWORD", "SyndicateDev2026!")
)

for username in ("demo", "viewer1", "admin1"):
    u = User.objects.filter(username=username).first()
    if u:
        u.set_password(pwd)
        u.save()
        print(f"Updated: {username}")
    else:
        print(f"Missing user: {username} (run: python manage.py seed_portal)")

print(f"Password set to: {pwd}")
