from django.utils import timezone
from django.db.models import Q
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    Onboarding, OnboardingToken, VendorReferenceMaster, PaymentTermMaster,
    PurchaseOrganizationMaster, CompanyCodeMaster, TDSCodeMaster,
    SearchTermMaster,
    VENDOR_REFERENCE_RANGES, get_vendor_reference_range_for_code,
)
from .serializers import (
    OnboardingListSerializer, OnboardingDetailSerializer,
    CreateOnboardingSerializer, ApproveRejectSerializer,
    OnboardingTokenSerializer, VendorReferenceMasterSerializer,
    VendorReferenceLookupSerializer, gst_state_code_for_state,
)
from apps.accounts.models import User
from apps.notifications.email_service import send_onboarding_invite
from config import settings


def _filter_by_created_date(qs, query_params):
    """Filter a queryset inclusively by ISO-8601 created-date query parameters."""
    start_date_raw = query_params.get('start_date')
    end_date_raw = query_params.get('end_date')
    start_date = parse_date(start_date_raw) if start_date_raw else None
    end_date = parse_date(end_date_raw) if end_date_raw else None

    errors = {}
    if start_date_raw and not start_date:
        errors['start_date'] = 'Use the YYYY-MM-DD format.'
    if end_date_raw and not end_date:
        errors['end_date'] = 'Use the YYYY-MM-DD format.'
    if errors:
        raise ValueError(errors)
    if start_date and end_date and start_date > end_date:
        raise ValueError({'end_date': 'End date must be on or after start date.'})

    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    return qs


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'ADMIN'


# ── Scope helpers ────────────────────────────────────────────────
def _scoped_qs(user):
    """Onboardings visible to this user based on their role."""
    qs = Onboarding.objects.select_related('created_by', 'approved_by').all()
    if user.is_superuser:
        return qs
    if user.role == 'ADMIN':
        return qs.filter(created_by=user)
    return qs.filter(assigned_user=user)


def _can_access(user, onboarding):
    """Whether user may view/edit a specific onboarding."""
    if user.is_superuser:
        return True
    if user.role == 'ADMIN':
        return str(onboarding.created_by_id) == str(user.id)
    return str(onboarding.assigned_user_id) == str(user.id)


def _validate_required_manual_onboarding_fields(data):
    errors = {}
    required_text_fields = {
        'company_name': 'Company name is required.',
        'district': 'District is required.',
        'city': 'City is required.',
        'state': 'State is required.',
        'street1': 'Street address is required.',
        'pan_number': 'PAN number is required.',
        'account_holder_name': 'Account holder name is required.',
        'bank_name': 'Bank name is required.',
        'branch_name': 'Branch name is required.',
        'account_number': 'Account number is required.',
        'ifsc_code': 'IFSC code is required.',
    }
    for field, message in required_text_fields.items():
        if not str(data.get(field, '')).strip():
            errors[field] = [message]

    if not data.get('emails'):
        errors['emails'] = ['At least one email is required.']
    if not data.get('phones'):
        errors['phones'] = ['At least one phone number is required.']

    pincode = str(data.get('pincode', '')).strip()
    if len(pincode) != 6:
        errors['pincode'] = ['6-digit PIN code is required.']

    if data.get('gst_applicable') is None:
        errors['gst_applicable'] = ['Please select GST status.']
    elif data.get('gst_applicable') and not str(data.get('gst_number', '')).strip():
        errors['gst_number'] = ['GST number is required.']

    if data.get('msme_applicable') is None:
        errors['msme_applicable'] = ['Please select MSME status.']
    elif data.get('msme_applicable'):
        if not str(data.get('msme_category', '')).strip():
            errors['msme_category'] = ['MSME category is required.']
        if not str(data.get('udyam_number', '')).strip():
            errors['udyam_number'] = ['Udyam registration number is required.']

    return errors


def _validate_required_onboarding_documents(onboarding):
    existing_types = set(onboarding.documents.values_list('document_type', flat=True))
    errors = {}
    if 'PAN' not in existing_types:
        errors['pan_doc'] = ['PAN Card document is required.']
    if onboarding.gst_applicable and 'GST' not in existing_types:
        errors['gst_doc'] = ['GST Certificate is required.']
    if 'CHEQUE' not in existing_types:
        errors['cheque_doc'] = ['Cancelled cheque is required.']
    if onboarding.msme_applicable and 'MSME' not in existing_types:
        errors['msme_doc'] = ['MSME Certificate is required.']
    return errors


PAN_APPROVAL_PENDING = 'pending'
PAN_APPROVAL_VALID_OPERATIVE = 'valid_operative'
PAN_APPROVAL_VALID_INOPERATIVE = 'valid_inoperative'
PAN_APPROVAL_FAILED = 'failed'
GST_APPROVAL_PENDING = 'pending'
GST_APPROVAL_VALID = 'valid'
GST_APPROVAL_FAILED = 'failed'


def _has_any(value, terms):
    normalized = str(value or '').lower()
    return any(term in normalized for term in terms)


def _classify_pan_approval_status(onboarding):
    verification_status = onboarding.pan_verification_status
    if not onboarding.pan_number or not verification_status:
        return PAN_APPROVAL_PENDING
    if _has_any(verification_status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found']):
        return PAN_APPROVAL_FAILED
    if _has_any(verification_status, ['inoperative', 'not operative']):
        return PAN_APPROVAL_VALID_INOPERATIVE
    if onboarding.pan_verified or _has_any(verification_status, ['valid']):
        return PAN_APPROVAL_VALID_OPERATIVE
    return PAN_APPROVAL_FAILED


def _classify_gst_approval_status(onboarding):
    verification_status = onboarding.gst_verification_status
    if not onboarding.gst_number or not verification_status:
        return GST_APPROVAL_PENDING
    if (
        _has_any(verification_status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found', 'cancelled', 'suspended'])
        or _has_any(verification_status, ['found but status'])
    ):
        return GST_APPROVAL_FAILED
    if onboarding.gst_verified or _has_any(verification_status, ['valid']):
        return GST_APPROVAL_VALID
    return GST_APPROVAL_FAILED


def _validate_approval_verifications(onboarding):
    pan_status = _classify_pan_approval_status(onboarding)
    gst_status = _classify_gst_approval_status(onboarding)

    if pan_status == PAN_APPROVAL_VALID_OPERATIVE and gst_status == GST_APPROVAL_VALID:
        return []

    if pan_status == PAN_APPROVAL_PENDING and gst_status == GST_APPROVAL_PENDING:
        return ['Cannot approve vendor. Both PAN and GST verifications are pending. Please complete both verifications before approval.']
    if pan_status == PAN_APPROVAL_FAILED and gst_status == GST_APPROVAL_FAILED:
        return ['Cannot approve vendor. Both PAN and GST verification have failed. Please correct the details and verify again.']
    if pan_status == PAN_APPROVAL_FAILED and gst_status == GST_APPROVAL_PENDING:
        return ['Cannot approve vendor. PAN verification has failed and GST verification is still pending. Please correct the PAN details and complete GST verification.']
    if pan_status == PAN_APPROVAL_PENDING and gst_status == GST_APPROVAL_FAILED:
        return ['Cannot approve vendor. GST verification has failed and PAN verification is still pending. Please complete PAN verification and correct the GST details.']

    messages = []
    if pan_status == PAN_APPROVAL_PENDING:
        messages.append('Cannot approve vendor. PAN verification is pending. Please verify the PAN first.')
    elif pan_status == PAN_APPROVAL_FAILED:
        messages.append('Cannot approve vendor. PAN verification failed. Please correct the PAN details and verify again.')
    elif pan_status == PAN_APPROVAL_VALID_INOPERATIVE:
        messages.append('Cannot approve vendor. The PAN is valid but currently inoperative. Please provide an operative PAN before approval.')

    if gst_status == GST_APPROVAL_PENDING:
        messages.append('Cannot approve vendor. GST verification is pending. Please verify the GST first.')
    elif gst_status == GST_APPROVAL_FAILED:
        messages.append('Cannot approve vendor. GST verification failed. Please correct the GST details and verify again.')

    return messages


# ── Admin: List onboardings ──────────────────────────────────────
class OnboardingListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = _scoped_qs(request.user)
        try:
            qs = _filter_by_created_date(qs, request.query_params)
        except ValueError as error:
            return Response(error.args[0], status=status.HTTP_400_BAD_REQUEST)

        # Filter by type
        onboarding_type = request.query_params.get('type')
        if onboarding_type:
            qs = qs.filter(onboarding_type=onboarding_type.upper())

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        # Search
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(company_name__icontains=search) |
                Q(onboarding_code__icontains=search) |
                Q(pan_number__icontains=search) |
                Q(contact_person__icontains=search)
            )

        serializer = OnboardingListSerializer(qs, many=True)
        return Response(serializer.data)


class OnboardingExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            queryset = _filter_by_created_date(_scoped_qs(request.user), request.query_params)
        except ValueError as error:
            return Response(error.args[0], status=status.HTTP_400_BAD_REQUEST)

        from openpyxl import Workbook
        from openpyxl.styles import Font

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = 'Onboardings'
        worksheet.append([
            'Code', 'Type', 'Company Name', 'Contact Person', 'Email Address(es)',
            'Phone Number(s)', 'Date of Birth/Commencement', 'PAN Number',
            'GST Number', 'Status', 'Created Date',
        ])

        for onboarding in queryset:
            worksheet.append([
                onboarding.onboarding_code,
                onboarding.get_onboarding_type_display(),
                onboarding.company_name,
                onboarding.contact_person,
                ', '.join(onboarding.emails or []),
                ', '.join(onboarding.phones or []),
                onboarding.date_of_birth.isoformat() if onboarding.date_of_birth else '',
                onboarding.pan_number,
                onboarding.gst_number,
                onboarding.get_status_display(),
                timezone.localtime(onboarding.created_at).strftime('%d-%m-%Y %H:%M'),
            ])

        for column, width in {
            'A': 14, 'B': 12, 'C': 30, 'D': 24, 'E': 32, 'F': 22,
            'G': 28, 'H': 16, 'I': 18, 'J': 16, 'K': 20,
        }.items():
            worksheet.column_dimensions[column].width = width
        for cell in worksheet[1]:
            cell.font = Font(bold=True)

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="onboarding_export.xlsx"'
        workbook.save(response)
        return response


class PanDataExportView(APIView):
    """Export PAN-specific data for records that have a PAN number."""
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            queryset = _filter_by_created_date(_scoped_qs(request.user), request.query_params)
        except ValueError as error:
            return Response(error.args[0], status=status.HTTP_400_BAD_REQUEST)

        from openpyxl import Workbook
        from openpyxl.styles import Font

        queryset = queryset.exclude(pan_number__isnull=True).exclude(pan_number='')
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = 'PAN Data'
        worksheet.append(['PAN Number'])

        for onboarding in queryset:
            worksheet.append([onboarding.pan_number])

        worksheet.column_dimensions['A'].width = 16
        for cell in worksheet[1]:
            cell.font = Font(bold=True)

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="pan_data_export.xlsx"'
        workbook.save(response)
        return response


# ── Admin: Manual onboarding (no email required) ────────────────
class ManualOnboardingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        onboarding_type = request.data.get('onboarding_type', '').upper()
        if onboarding_type not in ['VENDOR', 'CUSTOMER']:
            return Response(
                {'onboarding_type': ['Must be VENDOR or CUSTOMER.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {**request.data, 'onboarding_type': onboarding_type}
        required_errors = _validate_required_manual_onboarding_fields(data)
        if required_errors:
            return Response(required_errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = OnboardingDetailSerializer(
            data=data,
            partial=True,
            context={'require_complete': True},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        onboarding = serializer.save(
            created_by=request.user,
            status='PENDING',
        )
        return Response(OnboardingDetailSerializer(onboarding).data, status=status.HTTP_201_CREATED)


# ── Admin: Create onboarding & send email ────────────────────────
class CreateOnboardingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = CreateOnboardingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        onboarding_type = serializer.validated_data['onboarding_type']

        # Get or create the user for this email
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={'role': onboarding_type, 'is_active': True}
        )

        onboarding = Onboarding.objects.create(
            onboarding_type=onboarding_type,
            created_by=request.user,
            assigned_user=user,
            emails=[email],
        )

        token = OnboardingToken.create_for_onboarding(onboarding)

        try:
            send_onboarding_invite(
                to_email=email,
                onboarding=onboarding,
                token=token.token,
            )
        except Exception as e:
            # Don't fail if email fails — log and continue
            print(f"Email send failed: {e}")

        return Response(
            {
                'onboarding': OnboardingDetailSerializer(onboarding).data,
                'token': token.token,
                'message': f'Onboarding created and invite sent to {email}',
            },
            status=status.HTTP_201_CREATED,
        )


# ── Admin: Get / update single onboarding ────────────────────────
class OnboardingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_onboarding(self, pk):
        try:
            return Onboarding.objects.get(pk=pk)
        except Onboarding.DoesNotExist:
            return None

    def get(self, request, pk):
        onboarding = self._get_onboarding(pk)
        if not onboarding:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(OnboardingDetailSerializer(onboarding).data)

    def patch(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        onboarding = self._get_onboarding(pk)
        if not onboarding:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = OnboardingDetailSerializer(
            onboarding,
            data=request.data,
            partial=True,
            context={'require_complete': True},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


# ── Admin: Approve ───────────────────────────────────────────────
class ApproveOnboardingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            onboarding = Onboarding.objects.get(pk=pk)
        except Onboarding.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        if onboarding.status == 'APPROVED':
            return Response({'detail': 'Already approved.'}, status=status.HTTP_400_BAD_REQUEST)

        approval_messages = _validate_approval_verifications(onboarding)
        if approval_messages:
            return Response(
                {
                    'detail': approval_messages[0],
                    'messages': approval_messages,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_serializer = OnboardingDetailSerializer(
            onboarding,
            data={},
            partial=True,
            context={'require_complete': True},
        )
        if not detail_serializer.is_valid():
            return Response(detail_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        document_errors = _validate_required_onboarding_documents(onboarding)
        if document_errors:
            return Response(document_errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = ApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        onboarding.status = 'APPROVED'
        onboarding.approved_by = request.user
        onboarding.approved_at = timezone.now()
        onboarding.remarks = serializer.validated_data.get('remarks', '')
        onboarding.save()
        return Response(OnboardingDetailSerializer(onboarding).data)


# ── Admin: Reject ────────────────────────────────────────────────
class RejectOnboardingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            onboarding = Onboarding.objects.get(pk=pk)
        except Onboarding.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ApproveRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        onboarding.status = 'REJECTED'
        onboarding.remarks = serializer.validated_data.get('remarks', '')
        onboarding.save()
        return Response(OnboardingDetailSerializer(onboarding).data)


# ── Admin: Re-send invite ────────────────────────────────────────
class ResendInviteView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            onboarding = Onboarding.objects.get(pk=pk)
        except Onboarding.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access(request.user, onboarding):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        token = OnboardingToken.create_for_onboarding(onboarding)
        email = onboarding.emails[0] if onboarding.emails else None
        if not email:
            return Response({'detail': 'No email on record.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_onboarding_invite(to_email=email, onboarding=onboarding, token=token.token)
        except Exception as e:
            return Response({'detail': f'Email failed: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': f'Invite resent to {email}.'})


# ── Public: Validate token & get form ────────────────────────────
class ValidateTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            tok = OnboardingToken.objects.select_related('onboarding').get(token=token)
        except OnboardingToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token has expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        data = OnboardingTokenSerializer(tok).data
        data['onboarding_type'] = tok.onboarding.onboarding_type
        data['entity_type'] = tok.onboarding.get_onboarding_type_display()
        return Response(data)


# ── Public: Submit / update onboarding form ───────────────────────
class SubmitOnboardingView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, token):
        try:
            tok = OnboardingToken.objects.select_related('onboarding').get(token=token)
        except OnboardingToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        onboarding = tok.onboarding
        if onboarding.status == 'APPROVED':
            return Response({'detail': 'Approved onboarding cannot be edited.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OnboardingDetailSerializer(onboarding, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def post(self, request, token):
        """Final submit — moves status to PENDING."""
        try:
            tok = OnboardingToken.objects.select_related('onboarding').get(token=token)
        except OnboardingToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        onboarding = tok.onboarding
        if onboarding.status == 'APPROVED':
            return Response({'detail': 'Approved onboarding cannot be re-submitted.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OnboardingDetailSerializer(
            onboarding,
            data=request.data,
            partial=True,
            context={'require_complete': True},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        instance = serializer.save(status='PENDING')
        document_errors = _validate_required_onboarding_documents(instance)
        if document_errors:
            return Response(document_errors, status=status.HTTP_400_BAD_REQUEST)
        return Response(OnboardingDetailSerializer(instance).data)


# ── Admin: Dashboard stats ────────────────────────────────────────
class DashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        base = _scoped_qs(request.user)
        try:
            base = _filter_by_created_date(base, request.query_params)
        except ValueError as error:
            return Response(error.args[0], status=status.HTTP_400_BAD_REQUEST)

        qs = base
        onboarding_type = request.query_params.get('type')
        if onboarding_type:
            qs = qs.filter(onboarding_type=onboarding_type.upper())

        stats = {
            'total':    qs.count(),
            'pending':  qs.filter(status__in=['PENDING', 'UNDER_REVIEW']).count(),
            'approved': qs.filter(status='APPROVED').count(),
            'rejected': qs.filter(status='REJECTED').count(),
            'msme':     qs.filter(msme_applicable=True).count(),
            'vendor':   base.filter(onboarding_type='VENDOR').count(),
            'customer': base.filter(onboarding_type='CUSTOMER').count(),
        }
        return Response(stats)


class VendorReferenceRangeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ranges = VendorReferenceMaster.objects.order_by('vendor_reference_range').values_list(
            'vendor_reference_range',
            flat=True,
        )
        return Response([
            {'value': value, 'label': value.replace('-', ' - ')}
            for value in ranges
        ])


class PaymentTermListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        terms = PaymentTermMaster.objects.order_by('payment_term')
        return Response([
            {
                'value': term.payment_term,
                'label': f'{term.payment_term} - {term.description}',
                'description': term.description,
            }
            for term in terms
        ])


class PurchaseOrganizationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        organizations = PurchaseOrganizationMaster.objects.order_by('purchase_organization')
        return Response([
            {
                'value': organization.purchase_organization,
                'label': f'{organization.purchase_organization} - {organization.description}',
                'description': organization.description,
            }
            for organization in organizations
        ])


class CompanyCodeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_codes = CompanyCodeMaster.objects.order_by('company_code')
        return Response([
            {
                'value': company_code.company_code,
                'label': f'{company_code.company_code} - {company_code.name}',
                'name': company_code.name,
            }
            for company_code in company_codes
        ])


class TDSCodeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tds_codes = TDSCodeMaster.objects.order_by('tds_code')
        return Response([
            {
                'value': tds_code.tds_code,
                'label': f'{tds_code.tds_code} - {tds_code.description}',
                'description': tds_code.description,
            }
            for tds_code in tds_codes
        ])


class SearchTermListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_terms = SearchTermMaster.objects.order_by('search_term')
        return Response([
            {
                'value': search_term.search_term,
                'label': f'{search_term.search_term} - {search_term.applicable_for}',
                'applicable_for': search_term.applicable_for,
            }
            for search_term in search_terms
        ])


class VendorReferenceMasterListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = VendorReferenceMaster.objects.all()
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(vendor_reference_range__icontains=search) |
                Q(reference_name__icontains=search) |
                Q(gl_account_number__icontains=search) |
                Q(gl_account_description__icontains=search)
            )
        return Response(VendorReferenceMasterSerializer(qs, many=True).data)

    def post(self, request):
        serializer = VendorReferenceMasterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        master = serializer.save()
        return Response(VendorReferenceMasterSerializer(master).data, status=status.HTTP_201_CREATED)


class VendorReferenceMasterDetailView(APIView):
    permission_classes = [IsAdmin]

    def _get_master(self, pk):
        try:
            return VendorReferenceMaster.objects.get(pk=pk)
        except VendorReferenceMaster.DoesNotExist:
            return None

    def get(self, request, pk):
        master = self._get_master(pk)
        if not master:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(VendorReferenceMasterSerializer(master).data)

    def put(self, request, pk):
        master = self._get_master(pk)
        if not master:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = VendorReferenceMasterSerializer(master, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        master = serializer.save()
        return Response(VendorReferenceMasterSerializer(master).data)

    def patch(self, request, pk):
        master = self._get_master(pk)
        if not master:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = VendorReferenceMasterSerializer(master, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        master = serializer.save()
        return Response(VendorReferenceMasterSerializer(master).data)

    def delete(self, request, pk):
        master = self._get_master(pk)
        if not master:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        master.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorReferenceLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VendorReferenceLookupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vendor_reference_range = serializer.validated_data.get('vendor_reference_range')
        if not vendor_reference_range:
            vendor_reference_range = get_vendor_reference_range_for_code(
                serializer.validated_data.get('vendor_reference_code')
            )
        if not vendor_reference_range:
            return Response(
                {'detail': 'Vendor reference code does not fall in a predefined range.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            master = VendorReferenceMaster.objects.get(vendor_reference_range=vendor_reference_range)
        except VendorReferenceMaster.DoesNotExist:
            return Response(
                {
                    'detail': 'No Vendor Reference Master mapping exists for the matched range.',
                    'vendor_reference_range': vendor_reference_range,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(VendorReferenceMasterSerializer(master).data)











from rest_framework.views import APIView
from rest_framework.response import Response

# class VerifyPANAPIView(APIView):

#     def post(self, request):

#         pan = request.data.get("pan_number")
#         dob = request.data.get("date_of_birth")

#         return Response({
#             "status": True,
#             "message": "PAN verification API called successfully",
#             "pan": pan,
#             "dob": dob
#         })
    

import requests

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .utils.sandbox import get_access_token
from datetime import datetime
import requests
# views.py

from datetime import datetime

import requests

from django.conf import settings
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Onboarding
from .utils.sandbox import get_access_token


class VerifyPANAPIView(APIView):

    def post(self, request):

        onboarding_id = request.data.get("onboarding_id")

        pan = request.data.get("pan_number")
        dob = request.data.get("date_of_birth")
        name = request.data.get("name")

        if not pan:
            return Response(
                {"error": "PAN Number is required"},
                status=400
            )

        try:

            onboarding = Onboarding.objects.get(
                id=onboarding_id
            )

            dob = datetime.strptime(
                dob,
                "%Y-%m-%d"
            ).strftime("%d/%m/%Y")

            token = get_access_token()

            payload = {
                "@entity": "in.co.sandbox.kyc.pan_verification.request",
                "pan": pan.upper(),
                "name_as_per_pan": name,
                "date_of_birth": dob,
                "consent": "Y",
                "reason": "Vendor onboarding PAN verification"
            }

            response = requests.post(
                "https://api.sandbox.co.in/kyc/pan/verify",
                json=payload,
                headers={
                    "Authorization": token,
                    "x-api-key": settings.SANDBOX_API_KEY,
                    "x-api-version": "1.0.0",
                    "Content-Type": "application/json"
                },
                timeout=30
            )

            result = response.json()

            pan_data = result.get("data", {})

            is_verified = (
                pan_data.get("status") == "valid"
            )

            if is_verified:

                if pan_data.get(
                    "aadhaar_seeding_status"
                ) == "y":

                    verification_status = (
                        "Valid and Operative (Aadhaar Linked)"
                    )

                else:

                    verification_status = (
                        "Valid and Operative"
                    )

            else:

                verification_status = (
                    pan_data.get(
                        "remarks",
                        "Invalid PAN"
                    )
                )

            onboarding.pan_verified = is_verified

            onboarding.pan_verification_status = (
                verification_status
            )

            onboarding.pan_verification_response = (
                result
            )

            onboarding.save()

            return Response({
                "verified": is_verified,
                "verification_status":
                    verification_status,
                "sandbox_response":
                    result
            })

        except Onboarding.DoesNotExist:

            return Response(
                {
                    "error":
                    "Onboarding record not found"
                },
                status=404
            )

        except Exception as e:

            return Response(
                {
                    "error": str(e)
                },
                status=400
            )


class VerifyGSTAPIView(APIView):

    def post(self, request):

        onboarding_id = request.data.get("onboarding_id")
        gstin = request.data.get("gst_number")

        if not gstin:
            return Response(
                {"error": "GST Number is required"},
                status=400
            )

        try:
            onboarding = Onboarding.objects.get(id=onboarding_id)
            expected_state_code = gst_state_code_for_state(onboarding.state)
            gst_state_code = gstin.upper()[:2]
            if expected_state_code and gst_state_code != expected_state_code:
                return Response(
                    {
                        "error": (
                            f"GST first two digits must be {expected_state_code} "
                            f"for {onboarding.state}"
                        )
                    },
                    status=400
                )

            token = get_access_token()

            payload = {"gstin": gstin.upper()}

            response = requests.post(
                "https://api.sandbox.co.in/gst/compliance/public/gstin/search",
                json=payload,
                headers={
                    "Authorization": token,
                    "x-api-key": settings.SANDBOX_API_KEY,
                    "x-api-version": "1.0.0",
                    "Content-Type": "application/json"
                },
                timeout=30
            )

            result = response.json()

            # Sandbox nests the GSTIN payload under data -> data
            outer = result.get("data", {}) or {}
            gst_data = outer.get("data", {}) or {}

            found = outer.get("status_cd") == "1" and bool(gst_data)
            sts = gst_data.get("sts")  # "Active", "Cancelled", "Suspended"

            is_verified = found and sts == "Active"

            if is_verified:
                verification_status = (
                    f"Valid and Active — {gst_data.get('lgnm', '')}".strip(" —")
                )
            elif found:
                verification_status = f"GSTIN found but status is {sts}"
            else:
                verification_status = "Invalid GSTIN / No records found"

            onboarding.gst_verified = is_verified
            onboarding.gst_verification_status = verification_status
            onboarding.gst_verification_response = result
            onboarding.save()

            return Response({
                "verified": is_verified,
                "verification_status": verification_status,
                "sandbox_response": result
            })

        except Onboarding.DoesNotExist:
            return Response(
                {"error": "Onboarding record not found"},
                status=404
            )
