from django.apps import AppConfig


class MembershipConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.membership"
    verbose_name = "Membership content hub"

    def ready(self):
        # Register signal handlers for Redis indexing.
        import apps.membership.signals  # noqa: F401
