from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from apps.common.models import BaseModel


class Cart(BaseModel):
    customer = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")

    def __str__(self):
        return f"Cart<{self.customer.email}>"

    @property
    def subtotal(self):
        return sum((item.line_total for item in self.items.select_related("product")), start=0)

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(BaseModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ("cart", "product")

    @property
    def line_total(self):
        return self.product.price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
