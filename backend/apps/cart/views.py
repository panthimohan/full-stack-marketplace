import logging
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction

from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer, UpdateQuantitySerializer
from apps.products.models import Product
from apps.common.permissions import IsCustomerRole

logger = logging.getLogger("marketplace")


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(customer=user)
    return cart


class CartView(APIView):
    """View current cart, or clear it."""
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    def delete(self, request):
        cart = get_or_create_cart(request.user)
        cart.items.all().delete()
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemAddView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    @transaction.atomic
    def post(self, request):
        serializer = CartItemSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = Product.objects.select_for_update().get(pk=serializer.validated_data["product_id"])
        quantity = serializer.validated_data.get("quantity", 1)

        cart = get_or_create_cart(request.user)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": quantity})
        if not created:
            item.quantity += quantity

        if item.quantity > product.stock:
            return Response({"quantity": f"Only {product.stock} units in stock."}, status=status.HTTP_400_BAD_REQUEST)
        item.save()
        return Response(CartSerializer(cart, context={"request": request}).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerRole]

    def _get_item(self, request, item_id):
        return CartItem.objects.select_related("product", "cart").get(cart__customer=request.user, id=item_id)

    @transaction.atomic
    def patch(self, request, item_id):
        serializer = UpdateQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = self._get_item(request, item_id)
        except CartItem.DoesNotExist:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        quantity = serializer.validated_data["quantity"]
        if quantity > item.product.stock:
            return Response({"quantity": f"Only {item.product.stock} units in stock."}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = quantity
        item.save()
        return Response(CartSerializer(item.cart, context={"request": request}).data)

    def delete(self, request, item_id):
        try:
            item = self._get_item(request, item_id)
        except CartItem.DoesNotExist:
            return Response({"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)
        cart = item.cart
        item.delete()
        return Response(CartSerializer(cart, context={"request": request}).data)
