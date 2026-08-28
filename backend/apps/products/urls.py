from rest_framework.routers import DefaultRouter
from .views import PublicProductViewSet, VendorProductViewSet, AdminProductViewSet

router = DefaultRouter()
router.register("products", PublicProductViewSet, basename="product")
router.register("vendor/products", VendorProductViewSet, basename="vendor-product")
router.register("admin/products", AdminProductViewSet, basename="admin-product")
urlpatterns = router.urls
