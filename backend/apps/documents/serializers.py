from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'document_type', 'label', 'original_filename', 'file_url', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class DocumentUploadSerializer(serializers.ModelSerializer):
    label = serializers.CharField(required=False, allow_blank=True, max_length=100)

    class Meta:
        model = Document
        fields = ['document_type', 'label', 'file']

    def validate_file(self, value):
        allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError('Only PDF, JPG and PNG files are allowed.')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('File size must be under 10 MB.')
        return value
