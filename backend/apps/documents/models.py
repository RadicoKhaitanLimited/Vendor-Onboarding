import uuid
from django.db import models


def document_upload_path(instance, filename):
    return f"documents/{instance.onboarding.onboarding_code}/{instance.document_type}/{filename}"


class Document(models.Model):
    DOCUMENT_TYPES = [
        ('PAN', 'PAN Card'),
        ('GST', 'GST Certificate'),
        ('CHEQUE', 'Cancelled Cheque'),
        ('MSME', 'MSME Certificate'),
        ('OTHER', 'Additional Document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    onboarding = models.ForeignKey(
        'onboarding.Onboarding', on_delete=models.CASCADE, related_name='documents'
    )
    document_type = models.CharField(max_length=10, choices=DOCUMENT_TYPES)
    label = models.CharField(max_length=100, blank=True)
    file = models.FileField(upload_to=document_upload_path)
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    extracted_data = models.JSONField(null=True, blank=True)
    scanned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'documents'
        constraints = [
            models.UniqueConstraint(
                fields=['onboarding', 'document_type'],
                condition=~models.Q(document_type='OTHER'),
                name='unique_single_slot_document_type',
            ),
        ]

    def __str__(self):
        return f"{self.onboarding.onboarding_code} - {self.document_type}"
