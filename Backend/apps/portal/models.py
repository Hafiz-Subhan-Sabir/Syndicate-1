from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class PortalPermission(models.Model):
    """Fine-grained permission codename (e.g. social.links.manage)."""

    codename = models.SlugField(max_length=80, unique=True, db_index=True)
    name = models.CharField(max_length=160)

    class Meta:
        ordering = ["codename"]

    def __str__(self) -> str:
        return self.codename


class PortalRole(models.Model):
    name = models.SlugField(max_length=64, unique=True, db_index=True)
    display_name = models.CharField(max_length=128)
    permissions = models.ManyToManyField(
        PortalPermission,
        blank=True,
        related_name="roles",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.display_name


class UserPortalRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="portal_role_links",
    )
    role = models.ForeignKey(PortalRole, on_delete=models.CASCADE, related_name="user_links")

    class Meta:
        unique_together = [["user", "role"]]
        indexes = [models.Index(fields=["user"])]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.role.name}"


class SocialLink(models.Model):
    class Platform(models.TextChoices):
        FACEBOOK = "facebook", "Facebook"
        INSTAGRAM = "instagram", "Instagram"
        X = "x", "X (Twitter)"
        LINKEDIN = "linkedin", "LinkedIn"
        YOUTUBE = "youtube", "YouTube"
        TIKTOK = "tiktok", "TikTok"
        DISCORD = "discord", "Discord"
        WEBSITE = "website", "Website"
        CALENDAR = "calendar", "Calendar"
        EMAIL = "email", "Email"
        OTHER = "other", "Other"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_links",
    )
    platform = models.CharField(max_length=32, choices=Platform.choices, default=Platform.OTHER)
    url = models.URLField(max_length=512)
    label = models.CharField(max_length=160, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "is_active"])]

    def clean(self):
        if self.url and not str(self.url).lower().startswith(("http://", "https://")):
            raise ValidationError({"url": "URL must start with http:// or https://"})


class Mission(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        MISSED = "missed", "Missed"
        DONE = "done", "Done"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="missions",
    )
    title = models.CharField(max_length=255)
    target_at = models.DateTimeField()
    points = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-target_at"]
        indexes = [models.Index(fields=["user", "status"])]


class Reminder(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    title = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField()
    points = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-time"]
        indexes = [models.Index(fields=["user", "status"])]


class Note(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deck_notes",
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user"])]
