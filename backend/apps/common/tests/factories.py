import factory
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.vendors.models import Vendor, VendorStatus
from apps.categories.models import Category
from apps.products.models import Product, ProductStatus

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@test.local")
    username = factory.Sequence(lambda n: f"user{n}")
    role = Role.CUSTOMER

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "TestPass@123")
        if create:
            self.save()


class VendorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Vendor

    user = factory.SubFactory(UserFactory, role=Role.VENDOR)
    shop_name = factory.Sequence(lambda n: f"Test Shop {n}")
    status = VendorStatus.APPROVED


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f"Category {n}")


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    vendor = factory.SubFactory(VendorFactory)
    category = factory.SubFactory(CategoryFactory)
    name = factory.Sequence(lambda n: f"Product {n}")
    sku = factory.Sequence(lambda n: f"SKU-TEST-{n}")
    price = Decimal("100.00")
    stock = 20
    status = ProductStatus.ACTIVE
