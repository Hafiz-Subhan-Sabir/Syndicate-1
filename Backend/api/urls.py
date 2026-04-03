from django.urls import include, path

from apps.portal import views as portal_views

from . import views

# Fallback when ROOT_URLCONF only mounts `path("api/", include("api.urls"))`.
# Names omitted to avoid clashing with syndicate_backend.urls (same paths, first match wins).
urlpatterns = [
    path("auth/login/", portal_views.LoginView.as_view()),
    path("auth/refresh/", portal_views.RefreshView.as_view()),
    path("auth/logout/", portal_views.LogoutView.as_view()),
    path("auth/me/", portal_views.MeView.as_view()),
    path("portal/", include("apps.portal.urls")),
    path("health/", views.health),
    path("mindset/status/", views.mindset_status),
    path("documents/upload/", views.upload_document),
    path("documents/ingest/", views.ingest_document),
    path("syndicate/bootstrap/", views.syndicate_bootstrap),
]
