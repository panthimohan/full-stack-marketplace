from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomerProfile, Role
from apps.vendors.models import Vendor

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name", "phone_number",
                  "role", "profile_image", "is_email_verified", "date_joined"]
        read_only_fields = ["id", "role", "is_email_verified", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[(Role.CUSTOMER, "Customer"), (Role.VENDOR, "Vendor")],
                                    default=Role.CUSTOMER)
    shop_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "username", "first_name", "last_name", "phone_number",
                  "password", "password_confirm", "role", "shop_name"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if attrs.get("role") == Role.VENDOR and not attrs.get("shop_name"):
            raise serializers.ValidationError({"shop_name": "Shop name is required for vendor registration."})
        return attrs

    def create(self, validated_data):
        shop_name = validated_data.pop("shop_name", "")
        role = validated_data.pop("role", Role.CUSTOMER)
        password = validated_data.pop("password")
        user = User(role=role, **validated_data)
        user.set_password(password)
        user.save()

        if role == Role.CUSTOMER:
            CustomerProfile.objects.create(user=user)
        elif role == Role.VENDOR:
            Vendor.objects.create(user=user, shop_name=shop_name)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/profile claims to the JWT and login response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["default_shipping_name", "default_shipping_phone",
                  "default_shipping_address", "default_shipping_city"]
