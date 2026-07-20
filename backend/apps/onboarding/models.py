import uuid
import secrets
from django.db import models
from django.db.models import Q
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
        ('PENDING_BOSS_APPROVAL', 'Pending Boss Approval'),
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
    pan_name = models.CharField(max_length=255, blank=True)
    gst_applicable = models.BooleanField(default=False)
    gst_number = models.CharField(max_length=15, blank=True)

    # Bank
    account_holder_name = models.CharField(max_length=255, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    branch_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=34, blank=True)
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

    # SAP / ERP Reference (Customer)
    sales_reference_orgs = models.JSONField(default=list, blank=True)
    customer_search_term = models.CharField(max_length=50, blank=True)
    transportation_zone = models.CharField(max_length=50, blank=True)
    customer_company_code = models.CharField(max_length=20, blank=True)

    # Sales Area (Customer)
    sales_organization = models.JSONField(default=list, blank=True)
    distribution_channel = models.CharField(max_length=50, blank=True)
    division = models.CharField(max_length=50, blank=True)
    delivery_plant = models.CharField(max_length=20, blank=True)

    # Workflow
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='DRAFT')
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


def generate_extension_edit_code(request_type, target_type):
    prefix = ('V' if target_type == 'VENDOR' else 'C') + ('E' if request_type == 'EXTENSION' else 'D')
    last = (
        ExtensionEditRequest.objects.filter(request_type=request_type, target_type=target_type)
        .order_by('-created_at')
        .first()
    )
    if last and last.request_code:
        try:
            num = int(last.request_code[len(prefix):]) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"{prefix}{num}"


class ExtensionEditRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        ('EXTENSION', 'Extension'),
        ('EDIT', 'Edit'),
    ]
    TARGET_TYPE_CHOICES = [
        ('VENDOR', 'Vendor'),
        ('CUSTOMER', 'Customer'),
    ]
    STATUS_CHOICES = Onboarding.STATUS_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_code = models.CharField(max_length=20, unique=True, blank=True)
    request_type = models.CharField(max_length=10, choices=REQUEST_TYPE_CHOICES)
    target_type = models.CharField(max_length=10, choices=TARGET_TYPE_CHOICES)

    account_number = models.CharField(max_length=34, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    remarks_request = models.TextField(blank=True)

    # Vendor SAP / ERP reference fields
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

    # Vendor bank account details
    account_holder_name = models.CharField(max_length=255, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    branch_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=34, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)

    # Customer SAP / ERP reference fields
    sales_reference_orgs = models.JSONField(default=list, blank=True)
    customer_search_term = models.CharField(max_length=50, blank=True)
    sales_organization = models.JSONField(default=list, blank=True)
    distribution_channel = models.CharField(max_length=50, blank=True)
    division = models.CharField(max_length=50, blank=True)
    delivery_plant = models.CharField(max_length=20, blank=True)
    transportation_zone = models.CharField(max_length=50, blank=True)
    customer_company_code = models.CharField(max_length=20, blank=True)

    # Workflow
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='DRAFT')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_extension_edit_requests'
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_extension_edit_requests'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_extension_edit_requests'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extension_edit_requests'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.request_code:
            self.request_code = generate_extension_edit_code(self.request_type, self.target_type)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_code} - {self.account_number}"


class OnboardingApprovalHistory(models.Model):
    ACTION_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    onboarding = models.ForeignKey(
        Onboarding, on_delete=models.CASCADE, related_name='approval_history',
        null=True, blank=True,
    )
    extension_edit_request = models.ForeignKey(
        ExtensionEditRequest, on_delete=models.CASCADE, related_name='approval_history',
        null=True, blank=True,
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='onboarding_approval_actions',
    )
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'onboarding_approval_history'
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(onboarding__isnull=False, extension_edit_request__isnull=True)
                    | Q(onboarding__isnull=True, extension_edit_request__isnull=False)
                ),
                name='approval_history_exactly_one_target',
            ),
        ]

    def __str__(self):
        return f"{self.onboarding or self.extension_edit_request} - {self.action}"


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


class SalesOrganizationMaster(models.Model):
    sales_organization = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_organization_masters'
        ordering = ['sales_organization']

    def clean(self):
        self.sales_organization = self.sales_organization.strip().upper()
        if not self.sales_organization:
            raise ValidationError({'sales_organization': 'Sales organization is required.'})

    def __str__(self):
        return f"{self.sales_organization} - {self.description}"


class DistributionChannelMaster(models.Model):
    distribution_channel = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'distribution_channel_masters'
        ordering = ['distribution_channel']

    def clean(self):
        self.distribution_channel = self.distribution_channel.strip().upper()
        if not self.distribution_channel:
            raise ValidationError({'distribution_channel': 'Distribution channel is required.'})

    def __str__(self):
        return f"{self.distribution_channel} - {self.description}"


class DivisionMaster(models.Model):
    division = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'division_masters'
        ordering = ['division']

    def clean(self):
        self.division = self.division.strip().upper()
        if not self.division:
            raise ValidationError({'division': 'Division is required.'})

    def __str__(self):
        return f"{self.division} - {self.description}"


class TransportationZoneMaster(models.Model):
    zone = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transportation_zone_masters'
        ordering = ['zone']

    def clean(self):
        self.zone = self.zone.strip().upper()
        if not self.zone:
            raise ValidationError({'zone': 'Zone is required.'})

    def __str__(self):
        return f"{self.zone} - {self.description}"


class CustomerCompanyCodeMaster(models.Model):
    company_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_company_code_masters'
        ordering = ['company_code']

    def clean(self):
        self.company_code = self.company_code.strip().upper()
        if not self.company_code:
            raise ValidationError({'company_code': 'Company code is required.'})

    def __str__(self):
        return f"{self.company_code} - {self.name}"


class CustomerSearchTermMaster(models.Model):
    search_term = models.CharField(max_length=50, unique=True)
    applicable_for = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_search_term_masters'
        ordering = ['search_term']

    def clean(self):
        self.search_term = self.search_term.strip().upper()
        if not self.search_term:
            raise ValidationError({'search_term': 'Search term is required.'})

    def __str__(self):
        return f"{self.search_term} - {self.applicable_for}"


class DeliveryPlantMaster(models.Model):
    plant = models.CharField(max_length=20, unique=True)
    plant_name = models.CharField(max_length=255)
    sales_organization = models.CharField(max_length=20, blank=True)
    distribution_channel = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_plant_masters'
        ordering = ['plant']

    def clean(self):
        self.plant = self.plant.strip().upper()
        if not self.plant:
            raise ValidationError({'plant': 'Plant is required.'})

    def __str__(self):
        return f"{self.plant} - {self.plant_name}"
