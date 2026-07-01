import uuid
import secrets
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings


VENDOR_REFERENCE_RANGES = [
    ('10000-19999', '10000 - 19999'),
    ('20000-39999', '20000 - 39999'),
    ('40000-59999', '40000 - 59999'),
    ('60000-69999', '60000 - 69999'),
    ('70000-99999', '70000 - 99999'),
    ('100000-109999', '100000 - 109999'),
    ('110000-119999', '110000 - 119999'),
    ('120000-129999', '120000 - 129999'),
    ('130000-139999', '130000 - 139999'),
    ('140000-149999', '140000 - 149999'),
    ('150000-159999', '150000 - 159999'),
    ('160000-169999', '160000 - 169999'),
    ('170000-179999', '170000 - 179999'),
    ('200000-201999', '200000 - 201999'),
    ('400000-499999', '400000 - 499999'),
]

MSME_CHOICES = [
    ('MME', 'Micro or A or D'),
    ('MSE', 'Small or B or E'),
    ('MSM', 'Medium or C or F'),
    ('MET', 'Micro Enterprises - Trading'),
    ('MMT', 'Medium Enterprise - Trading'),
    ('MST', 'Small Enterprise - Trading'),
    ('MNA', 'Not MSME Registered/Applicable'),
]

MSME_REGISTERED_CHOICES = [choice for choice in MSME_CHOICES if choice[0] != 'MNA']


def get_vendor_reference_range_for_code(vendor_reference_code):
    digits = ''.join(ch for ch in str(vendor_reference_code or '') if ch.isdigit())
    if not digits:
        return None

    code = int(digits)
    for value in VendorReferenceMaster.objects.values_list('vendor_reference_range', flat=True):
        try:
            start, end = [int(part) for part in value.split('-')]
        except (TypeError, ValueError):
            continue
        if start <= code <= end:
            return value
    return None


def generate_onboarding_id(onboarding_type):
    prefix = 'V' if onboarding_type == 'VENDOR' else 'C'
    last = (
        Onboarding.objects.filter(onboarding_type=onboarding_type)
        .order_by('-created_at')
        .first()
    )
    if last and last.onboarding_code:
        try:
            num = int(last.onboarding_code[len(prefix):]) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"{prefix}{num}"


class Onboarding(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    TYPE_CHOICES = [
        ('VENDOR', 'Vendor'),
        ('CUSTOMER', 'Customer'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    onboarding_code = models.CharField(max_length=20, unique=True, blank=True)
    onboarding_type = models.CharField(max_length=10, choices=TYPE_CHOICES)

    # Company
    company_name = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    emails = models.JSONField(default=list)
    phones = models.JSONField(default=list)
    date_of_birth = models.DateField(
    null=True,
    blank=True
)

    # Address
    district = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=6, blank=True)
    country = models.CharField(max_length=100, default='India')
    street1 = models.CharField(max_length=35, blank=True)
    street2 = models.CharField(max_length=40, blank=True)
    street3 = models.CharField(max_length=40, blank=True)
    street4 = models.CharField(max_length=40, blank=True)

    # Tax
    pan_number = models.CharField(max_length=10, blank=True)
    gst_applicable = models.BooleanField(default=False)
    gst_number = models.CharField(max_length=15, blank=True)

    # Bank
    account_holder_name = models.CharField(max_length=255, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    branch_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=30, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)

    # MSME
    msme_applicable = models.BooleanField(default=False)
    msme_status = models.CharField(max_length=20, choices=MSME_CHOICES, default='MNA')
    msme_category = models.CharField(max_length=10, choices=MSME_REGISTERED_CHOICES, blank=True)
    udyam_number = models.CharField(max_length=30, blank=True)

    # SAP / ERP Reference
    reference_vendor_code = models.CharField(max_length=50, blank=True)
    vendor_reference_range = models.CharField(max_length=20, blank=True)
    reference_name = models.CharField(max_length=255, blank=True)
    gl_account_number = models.CharField(max_length=50, blank=True)
    gl_account_description = models.CharField(max_length=255, blank=True)
    reference_purchase_orgs = models.JSONField(default=list, blank=True)
    purchase_orgs_to_open = models.CharField(max_length=50, blank=True)
    search_term = models.CharField(max_length=50, blank=True)
    company_code_to_open = models.CharField(max_length=20, blank=True)
    payment_terms = models.CharField(max_length=50, blank=True)
    tds_codes = models.CharField(max_length=255, blank=True)

    # Workflow
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='DRAFT')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_onboardings'
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_onboardings'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_onboardings'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    pan_verified = models.BooleanField(default=False)

    pan_verification_status = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    pan_verification_response = models.JSONField(
        blank=True,
        null=True
    )

    gst_verified = models.BooleanField(default=False)

    gst_verification_status = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    gst_verification_response = models.JSONField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'onboardings'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.onboarding_code:
            self.onboarding_code = generate_onboarding_id(self.onboarding_type)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.onboarding_code} - {self.company_name or 'Unnamed'}"


class OnboardingToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    onboarding = models.ForeignKey(Onboarding, on_delete=models.CASCADE, related_name='tokens')
    token = models.CharField(max_length=64, unique=True)
    expiry = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'onboarding_tokens'

    def is_valid(self):
        return not self.is_used and self.expiry > timezone.now()

    @classmethod
    def create_for_onboarding(cls, onboarding):
        from datetime import timedelta
        expiry_hours = getattr(settings, 'ONBOARDING_TOKEN_EXPIRY_HOURS', 72)
        return cls.objects.create(
            onboarding=onboarding,
            token=secrets.token_urlsafe(32),
            expiry=timezone.now() + timedelta(hours=expiry_hours),
        )


class VendorReferenceMaster(models.Model):
    vendor_reference_range = models.CharField(
        max_length=20,
        unique=True,
    )
    reference_name = models.CharField(max_length=255)
    gl_account_number = models.CharField(max_length=50)
    gl_account_description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    group_code = models.CharField(max_length=20, blank=True, default='')
    nr_group = models.CharField(max_length=10, blank=True, default='')

    class Meta:
        db_table = 'vendor_reference_masters'
        ordering = ['vendor_reference_range']

    def clean(self):
        normalized = self.vendor_reference_range.replace(' ', '')
        try:
            start, end = [int(part) for part in normalized.split('-')]
        except (AttributeError, TypeError, ValueError):
            raise ValidationError({
                'vendor_reference_range': 'Use range format FROM-TO, for example 10000-19999.'
            })

        if start > end:
            raise ValidationError({
                'vendor_reference_range': 'Range start must be less than or equal to range end.'
            })

        existing = VendorReferenceMaster.objects.exclude(pk=self.pk)
        for current in existing.values_list('vendor_reference_range', flat=True):
            try:
                current_start, current_end = [int(part) for part in current.split('-')]
            except (TypeError, ValueError):
                continue
            if start <= current_end and end >= current_start:
                raise ValidationError({
                    'vendor_reference_range': f'This range overlaps with existing range {current}.'
                })

        self.vendor_reference_range = normalized

    def __str__(self):
        return f"{self.vendor_reference_range} - {self.reference_name}"


class PaymentTermMaster(models.Model):
    payment_term = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_term_masters'
        ordering = ['payment_term']

    def clean(self):
        self.payment_term = self.payment_term.strip().upper()
        if not self.payment_term:
            raise ValidationError({'payment_term': 'Payment term is required.'})

    def __str__(self):
        return f"{self.payment_term} - {self.description}"


class PurchaseOrganizationMaster(models.Model):
    purchase_organization = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_organization_masters'
        ordering = ['purchase_organization']

    def clean(self):
        self.purchase_organization = self.purchase_organization.strip().upper()
        if not self.purchase_organization:
            raise ValidationError({'purchase_organization': 'Purchase organization is required.'})

    def __str__(self):
        return f"{self.purchase_organization} - {self.description}"


class CompanyCodeMaster(models.Model):
    company_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_code_masters'
        ordering = ['company_code']

    def clean(self):
        self.company_code = self.company_code.strip().upper()
        if not self.company_code:
            raise ValidationError({'company_code': 'Company code is required.'})

    def __str__(self):
        return f"{self.company_code} - {self.name}"


class TDSCodeMaster(models.Model):
    tds_code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tds_code_masters'
        ordering = ['tds_code']

    def clean(self):
        self.tds_code = self.tds_code.strip()
        if not self.tds_code:
            raise ValidationError({'tds_code': 'TDS code is required.'})

    def __str__(self):
        return f"{self.tds_code} - {self.description}"


class SearchTermMaster(models.Model):
    search_term = models.CharField(max_length=50, unique=True)
    applicable_for = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'search_term_masters'
        ordering = ['search_term']

    def clean(self):
        self.search_term = self.search_term.strip().upper()
        if not self.search_term:
            raise ValidationError({'search_term': 'Search term is required.'})

    def __str__(self):
        return f"{self.search_term} - {self.applicable_for}"
