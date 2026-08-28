from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsVendorRole(permissions.BasePermission):
    message = "Only vendors can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "VENDOR")


class IsCustomerRole(permissions.BasePermission):
    message = "Only customers can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "CUSTOMER")


class IsApprovedVendorOwner(permissions.BasePermission):
    """Object-level permission: only the vendor who owns the object (or admin) may write to it."""
    message = "You do not have permission to access this vendor resource."

    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        if request.user.role != "VENDOR":
            return False
        vendor = getattr(request.user, "vendor_profile", None)
        owner_vendor = getattr(obj, "vendor", obj if obj.__class__.__name__ == "Vendor" else None)
        return bool(vendor and owner_vendor and vendor.id == owner_vendor.id)


class ReadOnlyOrIsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")
