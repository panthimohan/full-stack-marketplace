from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("admin/vendors", views.AdminVendorViewSet, basename="admin-vendor")

urlpatterns = [
    path("vendors/", views.PublicVendorListView.as_view(), name="vendor-list"),
    path("vendors/<slug:slug>/", views.PublicVendorDetailView.as_view(), name="vendor-detail"),
    path("vendor/me/", views.MyVendorProfileView.as_view(), name="vendor-me"),
] + router.urls
