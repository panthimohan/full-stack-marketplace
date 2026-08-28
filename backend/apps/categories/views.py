from rest_framework import viewsets, permissions
from django.db.models import Count
from .models import Category
from .serializers import CategorySerializer
from apps.common.permissions import ReadOnlyOrIsAdmin


class CategoryViewSet(viewsets.ModelViewSet):
    """Public read access; admin-only write access."""
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrIsAdmin]
    lookup_field = "slug"
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name"]

    def get_queryset(self):
        qs = Category.objects.annotate(product_count=Count("products", distinct=True))
        if self.request.user.is_authenticated and self.request.user.role == "ADMIN":
            return qs
        return qs.filter(is_active=True)
