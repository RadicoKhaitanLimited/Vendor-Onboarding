from django.urls import path
from .views import (
    OnboardingListView, CreateOnboardingView, ManualOnboardingView, OnboardingDetailView,
    ApproveOnboardingView, RejectOnboardingView, ResendInviteView,
    ValidateTokenView, SubmitOnboardingView, DashboardStatsView, OnboardingExportView, PanDataExportView,
    VendorReferenceRangeListView, VendorReferenceMasterListCreateView,
    VendorReferenceMasterDetailView, VendorReferenceLookupView, PaymentTermListView,
    PurchaseOrganizationListView, CompanyCodeListView, TDSCodeListView,
    SearchTermListView,VerifyPANAPIView,VerifyPANAPIView,VerifyGSTAPIView
)

urlpatterns = [
    path('', OnboardingListView.as_view(), name='onboarding_list'),
    path('create/', CreateOnboardingView.as_view(), name='onboarding_create'),
    path('manual/', ManualOnboardingView.as_view(), name='onboarding_manual'),
    path('stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('export/', OnboardingExportView.as_view(), name='onboarding_export'),
    path('export/pan/', PanDataExportView.as_view(), name='pan_data_export'),
    path('<uuid:pk>/', OnboardingDetailView.as_view(), name='onboarding_detail'),
    path('<uuid:pk>/approve/', ApproveOnboardingView.as_view(), name='onboarding_approve'),
    path('<uuid:pk>/reject/', RejectOnboardingView.as_view(), name='onboarding_reject'),
    path('<uuid:pk>/resend-invite/', ResendInviteView.as_view(), name='resend_invite'),
    path('form/<str:token>/', ValidateTokenView.as_view(), name='validate_token'),
    path('form/<str:token>/submit/', SubmitOnboardingView.as_view(), name='submit_onboarding'),
    path('vendor-reference-master/ranges/', VendorReferenceRangeListView.as_view(), name='vendor_reference_ranges'),
    path('vendor-reference-master/process/', VendorReferenceLookupView.as_view(), name='vendor_reference_lookup'),
    path('vendor-reference-master/', VendorReferenceMasterListCreateView.as_view(), name='vendor_reference_master_list'),
    path('vendor-reference-master/<int:pk>/', VendorReferenceMasterDetailView.as_view(), name='vendor_reference_master_detail'),
    path('payment-terms/', PaymentTermListView.as_view(), name='payment_term_list'),
    path('purchase-organizations/', PurchaseOrganizationListView.as_view(), name='purchase_organization_list'),
    path('company-codes/', CompanyCodeListView.as_view(), name='company_code_list'),
    path('tds-codes/', TDSCodeListView.as_view(), name='tds_code_list'),
    path('search-terms/', SearchTermListView.as_view(), name='search_term_list'),
    # path('verify-pan/', VerifyPANAPIView.as_view(),name='verify-pan'),
    path("verify-pan/",VerifyPANAPIView.as_view(), name="verify-pan"),
    path("verify-gst/", VerifyGSTAPIView.as_view(), name="verify-gst"),
    
]
