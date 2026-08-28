from rest_framework import serializers
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "parent", "image", "is_active",
                  "product_count", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]
