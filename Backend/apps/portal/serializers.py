from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.portal.models import Mission, Note, PortalPermission, PortalRole, Reminder, SocialLink
from apps.portal.rbac import user_permission_codenames

User = get_user_model()


class PortalPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalPermission
        fields = ("codename", "name")


class PortalRoleSerializer(serializers.ModelSerializer):
    permissions = PortalPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = PortalRole
        fields = ("id", "name", "display_name", "permissions")


class UserMeSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_staff", "roles", "permissions")

    def get_roles(self, obj):
        links = obj.portal_role_links.select_related("role").all()
        return [{"name": l.role.name, "display_name": l.role.display_name} for l in links]

    def get_permissions(self, obj):
        return sorted(user_permission_codenames(obj))


class SyndicateTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login: return tokens + user envelope for frontend."""

    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        cred = (attrs.get(self.username_field) or "").strip()
        if cred:
            if "@" in cred:
                match = User.objects.filter(email__iexact=cred).first()
            else:
                match = User.objects.filter(username__iexact=cred).first()
            if match:
                attrs[self.username_field] = match.get_username()
        data = super().validate(attrs)
        data["user"] = UserMeSerializer(self.user).data
        update_last_login(None, self.user)
        return data


class SocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLink
        fields = ("id", "platform", "url", "label", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_url(self, value: str):
        v = (value or "").strip()
        if not v.lower().startswith(("http://", "https://")):
            raise serializers.ValidationError("URL must use http or https.")
        return v

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ("id", "title", "target_at", "points", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ("id", "title", "date", "time", "points", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ("id", "title", "body", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
