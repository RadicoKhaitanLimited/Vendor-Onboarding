from django.urls import path
from .views import DocumentUploadView, AdminDocumentListView, AdminDocumentUploadView,DocumentScanView

urlpatterns = [
    path('upload/<str:token>/', DocumentUploadView.as_view(), name='document_upload'),
    path('onboarding/<uuid:onboarding_id>/', AdminDocumentListView.as_view(), name='admin_documents'),
    path('admin/<uuid:onboarding_id>/', AdminDocumentUploadView.as_view(), name='admin_document_upload'),
    path('scan/<uuid:document_id>/', DocumentScanView.as_view(), name='document_scan'),
]

