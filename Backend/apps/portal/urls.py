from django.urls import path

from apps.portal import views

urlpatterns = [
    path("social-links/", views.SocialLinkListCreateView.as_view(), name="social-link-list"),
    path("social-links/<int:pk>/", views.SocialLinkDetailView.as_view(), name="social-link-detail"),
    path("missions/", views.MissionListCreateView.as_view(), name="mission-list"),
    path("missions/<int:pk>/", views.MissionDetailView.as_view(), name="mission-detail"),
    path("reminders/", views.ReminderListCreateView.as_view(), name="reminder-list"),
    path("reminders/<int:pk>/", views.ReminderDetailView.as_view(), name="reminder-detail"),
    path("notes/", views.NoteListCreateView.as_view(), name="note-list"),
    path("notes/<int:pk>/", views.NoteDetailView.as_view(), name="note-detail"),
]
