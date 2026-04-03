"""Portal auth, RBAC, social links, and deck API tests."""

from datetime import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.portal.models import PortalRole, SocialLink, UserPortalRole

User = get_user_model()


def _attach_role(user, role_name: str):
    role = PortalRole.objects.get(name=role_name)
    UserPortalRole.objects.get_or_create(user=user, role=role)


class PortalAuthTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command

        call_command("seed_portal", password="testpass-portal")

    def setUp(self):
        self.client = APIClient()

    def test_login_success_returns_tokens_and_user(self):
        url = reverse("auth-login")
        res = self.client.post(url, {"username": "demo", "password": "testpass-portal"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("user", res.data)
        self.assertEqual(res.data["user"]["username"], "demo")

    def test_login_with_email_case_insensitive(self):
        url = reverse("auth-login")
        res = self.client.post(
            url, {"username": "DEMO@EXAMPLE.COM", "password": "testpass-portal"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user"]["username"], "demo")

    def test_login_failure(self):
        url = reverse("auth-login")
        res = self.client.post(url, {"username": "demo", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_auth(self):
        res = self.client.get(reverse("auth-me"))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_with_token(self):
        tok = self.client.post(
            reverse("auth-login"),
            {"username": "demo", "password": "testpass-portal"},
            format="json",
        ).data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        res = self.client.get(reverse("auth-me"))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "demo")
        self.assertIn("permissions", res.data)

    def test_logout_authenticated_returns_204(self):
        tok = self.client.post(
            reverse("auth-login"),
            {"username": "demo", "password": "testpass-portal"},
            format="json",
        ).data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        res = self.client.post(reverse("auth-logout"))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)


class SocialLinksRbacTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command

        call_command("seed_portal", password="testpass-portal")

    def setUp(self):
        self.client = APIClient()

    def _token(self, username: str, password: str = "testpass-portal") -> str:
        return self.client.post(
            reverse("auth-login"),
            {"username": username, "password": password},
            format="json",
        ).data["access"]

    def test_viewer_can_list_cannot_create(self):
        tok = self._token("viewer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        r = self.client.get("/api/portal/social-links/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r2 = self.client.post(
            "/api/portal/social-links/",
            {"platform": "website", "url": "https://example.com", "label": "Ex"},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)

    def test_operator_crud_own_link(self):
        tok = self._token("demo")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        r = self.client.post(
            "/api/portal/social-links/",
            {"platform": "youtube", "url": "https://youtube.com/@x", "label": "YT"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        pk = r.data["id"]
        r2 = self.client.patch(f"/api/portal/social-links/{pk}/", {"label": "YouTube"}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        r3 = self.client.delete(f"/api/portal/social-links/{pk}/")
        self.assertEqual(r3.status_code, status.HTTP_204_NO_CONTENT)


class DeckRbacTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command

        call_command("seed_portal", password="testpass-portal")

    def setUp(self):
        self.client = APIClient()

    def _token(self, username: str) -> str:
        return self.client.post(
            reverse("auth-login"),
            {"username": username, "password": "testpass-portal"},
            format="json",
        ).data["access"]

    def test_viewer_get_missions_forbidden_post(self):
        tok = self._token("viewer1")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        g = self.client.get("/api/portal/missions/")
        self.assertEqual(g.status_code, status.HTTP_200_OK)
        p = self.client.post(
            "/api/portal/missions/",
            {
                "title": "T",
                "target_at": datetime(2030, 1, 1, 12, 0, 0).isoformat(),
                "points": 1,
                "status": "active",
            },
            format="json",
        )
        self.assertEqual(p.status_code, status.HTTP_403_FORBIDDEN)

    def test_operator_mission_crud(self):
        tok = self._token("demo")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        p = self.client.post(
            "/api/portal/missions/",
            {
                "title": "Op",
                "target_at": datetime(2030, 6, 1, 9, 0, 0).isoformat(),
                "points": 5,
                "status": "active",
            },
            format="json",
        )
        self.assertEqual(p.status_code, status.HTTP_201_CREATED)
        pk = p.data["id"]
        d = self.client.delete(f"/api/portal/missions/{pk}/")
        self.assertEqual(d.status_code, status.HTTP_204_NO_CONTENT)


class CrossUserObjectTests(TestCase):
    def setUp(self):
        from django.core.management import call_command

        call_command("seed_portal", password="testpass-portal")
        self.client = APIClient()

        self.u_a = User.objects.create_user("user_a", "a@x.com", "pa")
        _attach_role(self.u_a, "operator")
        self.u_b = User.objects.create_user("user_b", "b@x.com", "pb")
        _attach_role(self.u_b, "operator")

        self.link_a = SocialLink.objects.create(
            user=self.u_a,
            platform=SocialLink.Platform.WEBSITE,
            url="https://a.example.com",
            label="A",
        )

    def test_b_cannot_delete_a_social_link(self):
        tok = self.client.post(
            reverse("auth-login"),
            {"username": "user_b", "password": "pb"},
            format="json",
        ).data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        r = self.client.delete(f"/api/portal/social-links/{self.link_a.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
