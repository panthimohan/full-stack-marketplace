from rest_framework import serializers
from .models import Vendor, VendorStatus


class VendorPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "shop_name", "slug", "description", "logo", "city", "country", "created_at"]


class VendorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Vendor
        fields = ["id", "shop_name", "slug", "description", "logo", "contact_email", "contact_phone",
                  "address_line", "city", "country", "status", "status_reason", "approved_at",
                  "email", "product_count", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "status", "status_reason", "approved_at", "created_at", "updated_at"]


class VendorStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=VendorStatus.choices)
    reason = serializers.CharField(required=False, allow_blank=True)
