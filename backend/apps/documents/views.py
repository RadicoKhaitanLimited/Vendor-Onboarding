from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Document
from .serializers import DocumentUploadSerializer, DocumentSerializer
from apps.onboarding.models import Onboarding, OnboardingToken
from django.utils import timezone
from .utils.scan import scan_document


def _can_access(user, onboarding):
    if user.is_superuser or user.role == 'ADMIN':
        return True
    if user.role == 'BOSS':
        return (
            str(onboarding.created_by_id) == str(user.id)
            or str(onboarding.assigned_user_id) == str(user.id)
        )
    if user.role == 'EMPLOYEE':
        return str(onboarding.created_by_id) == str(user.id)
    return str(onboarding.assigned_user_id) == str(user.id)


def _can_mutate_documents(user, onboarding):
    if user.is_superuser or user.role == 'ADMIN':
        return True
    if user.role == 'EMPLOYEE':
        return str(onboarding.created_by_id) == str(user.id) and onboarding.status != 'APPROVED'
    return False


class AdminDocumentUploadView(APIView):
    """Admin: upload/replace or delete a document for a specific onboarding."""
    permission_classes = [IsAuthenticated]

    def _get_onboarding(self, pk):
        try:
            return Onboarding.objects.get(pk=pk)
        except Onboarding.DoesNotExist:
            return None

    def post(self, request, onboarding_id):
        onboarding = self._get_onboarding(onboarding_id)
        if not onboarding:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if not _can_mutate_documents(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doc_type = serializer.validated_data['document_type']
        label = serializer.validated_data.get('label', '')
        file = serializer.validated_data['file']

        if doc_type != 'OTHER':
            Document.objects.filter(onboarding=onboarding, document_type=doc_type).delete()
        doc = Document.objects.create(
            onboarding=onboarding,
            document_type=doc_type,
            label=label,
            file=file,
            original_filename=file.name,
        )
        return Response(DocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def delete(self, request, onboarding_id):
        onboarding = self._get_onboarding(onboarding_id)
        if not onboarding:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        if not _can_mutate_documents(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        doc_id = request.query_params.get('id')
        if doc_id:
            Document.objects.filter(onboarding_id=onboarding_id, id=doc_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        doc_type = request.query_params.get('type')
        if not doc_type:
            return Response({'detail': "'type' or 'id' query param required."}, status=status.HTTP_400_BAD_REQUEST)
        Document.objects.filter(onboarding_id=onboarding_id, document_type=doc_type).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentUploadView(APIView):
    """Upload document using onboarding token (public)."""
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            tok = OnboardingToken.objects.select_related('onboarding').get(token=token)
        except OnboardingToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token expired.'}, status=status.HTTP_400_BAD_REQUEST)

        onboarding = tok.onboarding
        if onboarding.status == 'APPROVED':
            return Response({'detail': 'Approved forms are locked.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        doc_type = serializer.validated_data['document_type']
        label = serializer.validated_data.get('label', '')
        file = serializer.validated_data['file']

        # Replace if already uploaded (single-slot types only)
        if doc_type != 'OTHER':
            Document.objects.filter(onboarding=onboarding, document_type=doc_type).delete()

        doc = Document.objects.create(
            onboarding=onboarding,
            document_type=doc_type,
            label=label,
            file=file,
            original_filename=file.name,
        )
        return Response(DocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AdminDocumentListView(APIView):
    """Admin views documents for a specific onboarding."""
    permission_classes = [IsAuthenticated]

    def get(self, request, onboarding_id):
        try:
            onboarding = Onboarding.objects.get(pk=onboarding_id)
        except Onboarding.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        docs = Document.objects.filter(onboarding=onboarding)
        return Response(DocumentSerializer(docs, many=True, context={'request': request}).data)
    

class DocumentScanView(APIView):
    """Admin: extract structured fields from an uploaded document via Claude vision."""
    permission_classes = [IsAuthenticated]

    def post(self, request, document_id):
        try:
            doc = Document.objects.select_related('onboarding').get(pk=document_id)
        except Document.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access(request.user, doc.onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            doc.file.open('rb')
            file_bytes = doc.file.read()
            doc.file.close()
        except Exception:
            return Response({'detail': 'Could not read file.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            extracted = scan_document(
                file_bytes,
                doc.original_filename or doc.file.name,
                doc.document_type,
            )
        except Exception as e:
            return Response({'detail': f'Scan failed: {e}'}, status=status.HTTP_502_BAD_GATEWAY)

        doc.extracted_data = extracted
        doc.scanned_at = timezone.now()
        doc.save(update_fields=['extracted_data', 'scanned_at'])

        return Response({
            'document_type': doc.document_type,
            'extracted_data': extracted,
            'scanned_at': doc.scanned_at,
        })
