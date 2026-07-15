from django.contrib import admin
from .models import (
    Onboarding, OnboardingToken, VendorReferenceMaster,
    PaymentTermMaster, PurchaseOrganizationMaster, CompanyCodeMaster,
    TDSCodeMaster, SearchTermMaster,
    SalesOrganizationMaster, DistributionChannelMaster, DivisionMaster,
    TransportationZoneMaster, CustomerCompanyCodeMaster, CustomerSearchTermMaster,
    DeliveryPlantMaster,
)


@admin.register(Onboarding)
class OnboardingAdmin(admin.ModelAdmin):
    list_display = [
        'onboarding_code', 'onboarding_type', 'company_name',
        'pan_number', 'status', 'msme_status', 'created_at',
    ]
    list_filter = ['onboarding_type', 'status', 'msme_applicable']
    search_fields = ['onboarding_code', 'company_name', 'pan_number', 'gst_number']
    readonly_fields = ['id', 'onboarding_code', 'created_at', 'updated_at']


@admin.register(OnboardingToken)
class OnboardingTokenAdmin(admin.ModelAdmin):
    list_display = ['onboarding', 'token', 'expiry', 'is_used', 'created_at']
    list_filter = ['is_used']
    readonly_fields = ['id', 'token', 'created_at']


@admin.register(VendorReferenceMaster)
class VendorReferenceMasterAdmin(admin.ModelAdmin):
    list_display = [
        'vendor_reference_range', 'group_code', 'nr_group', 'reference_name',
        'gl_account_number', 'gl_account_description', 'updated_at',
    ]
    search_fields = [
        'vendor_reference_range', 'group_code', 'nr_group', 'reference_name',
        'gl_account_number', 'gl_account_description',
    ]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentTermMaster)
class PaymentTermMasterAdmin(admin.ModelAdmin):
    list_display = ['payment_term', 'description', 'updated_at']
    search_fields = ['payment_term', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PurchaseOrganizationMaster)
class PurchaseOrganizationMasterAdmin(admin.ModelAdmin):
    list_display = ['purchase_organization', 'description', 'updated_at']
    search_fields = ['purchase_organization', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CompanyCodeMaster)
class CompanyCodeMasterAdmin(admin.ModelAdmin):
    list_display = ['company_code', 'name', 'updated_at']
    search_fields = ['company_code', 'name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TDSCodeMaster)
class TDSCodeMasterAdmin(admin.ModelAdmin):
    list_display = ['tds_code', 'description', 'updated_at']
    search_fields = ['tds_code', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SearchTermMaster)
class SearchTermMasterAdmin(admin.ModelAdmin):
    list_display = ['search_term', 'applicable_for', 'updated_at']
    search_fields = ['search_term', 'applicable_for']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SalesOrganizationMaster)
class SalesOrganizationMasterAdmin(admin.ModelAdmin):
    list_display = ['sales_organization', 'description', 'updated_at']
    search_fields = ['sales_organization', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DistributionChannelMaster)
class DistributionChannelMasterAdmin(admin.ModelAdmin):
    list_display = ['distribution_channel', 'description', 'updated_at']
    search_fields = ['distribution_channel', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DivisionMaster)
class DivisionMasterAdmin(admin.ModelAdmin):
    list_display = ['division', 'description', 'updated_at']
    search_fields = ['division', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TransportationZoneMaster)
class TransportationZoneMasterAdmin(admin.ModelAdmin):
    list_display = ['zone', 'description', 'updated_at']
    search_fields = ['zone', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CustomerCompanyCodeMaster)
class CustomerCompanyCodeMasterAdmin(admin.ModelAdmin):
    list_display = ['company_code', 'name', 'updated_at']
    search_fields = ['company_code', 'name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CustomerSearchTermMaster)
class CustomerSearchTermMasterAdmin(admin.ModelAdmin):
    list_display = ['search_term', 'applicable_for', 'updated_at']
    search_fields = ['search_term', 'applicable_for']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DeliveryPlantMaster)
class DeliveryPlantMasterAdmin(admin.ModelAdmin):
    list_display = ['plant', 'plant_name', 'sales_organization', 'distribution_channel', 'updated_at']
    search_fields = ['plant', 'plant_name', 'sales_organization', 'distribution_channel']
    list_filter = ['sales_organization', 'distribution_channel']
    readonly_fields = ['created_at', 'updated_at']
