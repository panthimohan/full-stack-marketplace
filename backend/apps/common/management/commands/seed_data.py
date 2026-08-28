import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import User, Role, CustomerProfile
from apps.vendors.models import Vendor, VendorStatus
from apps.categories.models import Category
from apps.products.models import Product, ProductStatus
from apps.orders.services import create_order_from_cart
from apps.orders.models import PaymentMethod
from apps.cart.models import Cart, CartItem


class Command(BaseCommand):
    help = "Seed the database with demo admin/vendor/customer accounts, categories, products, and a sample order."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        admin, created = User.objects.get_or_create(
            email="admin@marketplace.local",
            defaults=dict(username="admin", role=Role.ADMIN, is_staff=True, is_superuser=True,
                          first_name="Marketplace", last_name="Admin"),
        )
        if created:
            admin.set_password("Admin@12345")
            admin.save()
        self.stdout.write(self.style.SUCCESS(f"Admin: {admin.email} / Admin@12345"))

        categories = {}
        for name in ["Electronics", "Fashion", "Home & Kitchen", "Books", "Beauty"]:
            cat, _ = Category.objects.get_or_create(name=name)
            categories[name] = cat

        vendor_specs = [
            ("TechHub Nepal", "vendor1@marketplace.local", ["Electronics", "Books"]),
            ("Urban Threads", "vendor2@marketplace.local", ["Fashion"]),
            ("Home Essentials Co", "vendor3@marketplace.local", ["Home & Kitchen", "Beauty"]),
        ]
        vendors = []
        for shop_name, email, cat_names in vendor_specs:
            user, created = User.objects.get_or_create(
                email=email, defaults=dict(username=email.split("@")[0], role=Role.VENDOR,
                                            first_name=shop_name.split()[0])
            )
            if created:
                user.set_password("Vendor@12345")
                user.save()
            vendor, _ = Vendor.objects.get_or_create(
                user=user, defaults=dict(shop_name=shop_name, status=VendorStatus.APPROVED,
                                          approved_at=timezone.now(), city="Kathmandu",
                                          description=f"{shop_name} — quality products, fast delivery.")
            )
            if vendor.status != VendorStatus.APPROVED:
                vendor.status = VendorStatus.APPROVED
                vendor.approved_at = timezone.now()
                vendor.save()
            vendors.append((vendor, cat_names))
            self.stdout.write(self.style.SUCCESS(f"Vendor: {email} / Vendor@12345 ({shop_name})"))

        # One extra pending vendor to demo the approval workflow.
        pending_user, created = User.objects.get_or_create(
            email="vendor4-pending@marketplace.local",
            defaults=dict(username="vendor4pending", role=Role.VENDOR, first_name="Pending"),
        )
        if created:
            pending_user.set_password("Vendor@12345")
            pending_user.save()
        Vendor.objects.get_or_create(user=pending_user, defaults=dict(shop_name="New Gadget Store"))
        self.stdout.write(self.style.SUCCESS("Pending vendor: vendor4-pending@marketplace.local / Vendor@12345"))

        customers = []
        for i in range(1, 4):
            email = f"customer{i}@marketplace.local"
            user, created = User.objects.get_or_create(
                email=email, defaults=dict(username=f"customer{i}", role=Role.CUSTOMER, first_name=f"Customer{i}")
            )
            if created:
                user.set_password("Customer@12345")
                user.save()
                CustomerProfile.objects.create(user=user)
            customers.append(user)
        self.stdout.write(self.style.SUCCESS("Customers: customer1..3@marketplace.local / Customer@12345"))

        product_names = {
            "Electronics": ["Wireless Earbuds", "Smartphone Stand", "USB-C Hub", "Bluetooth Speaker", "Power Bank 20000mAh"],
            "Fashion": ["Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Leather Belt", "Wool Scarf"],
            "Home & Kitchen": ["Non-stick Pan Set", "Ceramic Mug Set", "LED Desk Lamp", "Storage Organizer", "Electric Kettle"],
            "Books": ["The Pragmatic Programmer", "Clean Code", "Atomic Habits", "Deep Work", "Sapiens"],
            "Beauty": ["Vitamin C Serum", "Aloe Vera Gel", "Herbal Shampoo", "Face Moisturizer", "Lip Balm Set"],
        }

        sku_counter = 1000
        for vendor, cat_names in vendors:
            for cat_name in cat_names:
                cat = categories[cat_name]
                for name in product_names[cat_name]:
                    sku_counter += 1
                    Product.objects.get_or_create(
                        vendor=vendor, name=f"{name} — {vendor.shop_name}",
                        defaults=dict(
                            category=cat,
                            sku=f"SKU-{sku_counter}",
                            description=f"High quality {name.lower()} from {vendor.shop_name}.",
                            price=Decimal(random.randrange(500, 15000)),
                            stock=random.randint(0, 60),
                            status=ProductStatus.ACTIVE,
                        ),
                    )
        self.stdout.write(self.style.SUCCESS(f"Seeded products for {len(vendors)} vendors."))

        # Sample order for customer1 (COD) to demonstrate the multi-vendor order flow.
        sample_customer = customers[0]
        cart, _ = Cart.objects.get_or_create(customer=sample_customer)
        cart.items.all().delete()
        sample_products = Product.objects.filter(status=ProductStatus.ACTIVE, stock__gt=0)[:2]
        for p in sample_products:
            CartItem.objects.create(cart=cart, product=p, quantity=1)

        if sample_products:
            try:
                order = create_order_from_cart(
                    customer=sample_customer,
                    shipping_info={"full_name": "Customer One", "phone": "9800000000",
                                    "address": "Baneshwor, Kathmandu", "city": "Kathmandu"},
                    payment_method=PaymentMethod.COD,
                )
                self.stdout.write(self.style.SUCCESS(f"Sample order created: {order.order_number}"))
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"Could not create sample order: {exc}"))

        self.stdout.write(self.style.SUCCESS("Seeding complete."))
