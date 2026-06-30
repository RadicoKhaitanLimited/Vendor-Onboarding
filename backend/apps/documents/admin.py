from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['onboarding', 'document_type', 'original_filename', 'uploaded_at']
    list_filter = ['document_type']
    search_fields = ['onboarding__onboarding_code', 'original_filename']
    readonly_fields = ['id', 'uploaded_at']
