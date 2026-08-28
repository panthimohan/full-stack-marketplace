from rest_framework import permissions


class IsVendorOwner(permissions.BasePermission):
    """Allows access only to the vendor who owns the profile, or an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        return request.user.role == "VENDOR" and obj.user_id == request.user.id
