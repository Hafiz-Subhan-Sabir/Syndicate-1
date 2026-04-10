"""
URL configuration for syndicate_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.portal import views as portal_views

urlpatterns = [
    path('admin/', admin.site.urls),
    # Explicit routes (do not rely on include) so /api/auth/login/ always resolves.
    path('api/auth/login/', portal_views.LoginView.as_view(), name='auth-login'),
    path('api/auth/refresh/', portal_views.RefreshView.as_view(), name='auth-refresh'),
    path('api/auth/logout/', portal_views.LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/', portal_views.MeView.as_view(), name='auth-me'),
    # No-trailing-slash aliases: proxies/clients sometimes POST to /api/auth/login (APPEND_SLASH cannot redirect POST).
    path('api/auth/login', portal_views.LoginView.as_view(), name='auth-login-noslash'),
    path('api/auth/refresh', portal_views.RefreshView.as_view(), name='auth-refresh-noslash'),
    path('api/auth/logout', portal_views.LogoutView.as_view(), name='auth-logout-noslash'),
    path('api/portal/', include('apps.portal.urls')),
    path('api/challenges/', include('apps.challenges.urls')),
    path('api/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
