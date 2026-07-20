import re
from rest_framework import serializers
from .models import (
    Onboarding, OnboardingToken, VendorReferenceMaster, OnboardingApprovalHistory,
    VENDOR_REFERENCE_RANGES, ExtensionEditRequest,
)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PHONE_RE = re.compile(r'^(?:\+91|91|0)?[6-9]\d{9}$')
ACCOUNT_NUMBER_RE = re.compile(r'^[A-Za-z0-9]{9,34}$')

GST_STATE_CODES = {
    'Jammu And Kashmir': '01',
    'Jammu & Kashmir': '01',
    'Himachal Pradesh': '02',
    'Punjab': '03',
    'Chandigarh': '04',
    'Uttarakhand': '05',
    'Haryana': '06',
    'Delhi': '07',
    'Rajasthan': '08',
    'Uttar Pradesh': '09',
    'Bihar': '10',
    'Sikkim': '11',
    'Arunachal Pradesh': '12',
    'Nagaland': '13',
    'Manipur': '14',
    'Mizoram': '15',
    'Tripura': '16',
    'Meghalaya': '17',
    'Assam': '18',
    'West Bengal': '19',
    'Jharkhand': '20',
    'Orissa': '21',
    'Odisha': '21',
    'Chhattisgarh': '22',
    'Madhya Pradesh': '23',
    'Gujarat': '24',
    'Dadra And Nagar Haveli & Daman And Diu': '26',
    'Dadra & Nagar Haveli': '26',
    'Daman & Diu': '26',
    'Maharashtra': '27',
    'Karnataka': '29',
    'Goa': '30',
    'Lakshadweep': '31',
    'Kerala': '32',
    'Tamil Nadu': '33',
    'Puducherry': '34',
    'Andaman And Nicobar': '35',
    'Andaman & Nicobar Islands': '35',
    'Telangana': '36',
    'Andhra Pradesh': '37',
    'Ladakh': '38',
    'Other Territory': '97',
    'Other Country': '99',
}


def gst_state_code_for_state(state):
    return GST_STATE_CODES.get(str(state or '').strip(), '')


PAN_EDITABLE_HOLDER_TYPES = {'P', 'H'}


def pan_name_is_editable(pan_number):
    normalized = str(pan_number or '').strip().upper()
    return len(normalized) >= 4 and normalized[3] in PAN_EDITABLE_HOLDER_TYPES


def normalize_purchase_org_list(value):
    if isinstance(value, list):
        raw_values = value
    else:
        raw_values = str(value or '').split(',')

    normalized_values = []
    for item in raw_values:
        normalized = str(item or '').strip().upper()
        if normalized and normalized not in normalized_values:
            normalized_values.append(normalized)
    return normalized_values


def company_code_for_purchase_org(purchase_org):
    normalized = str(purchase_org or '').strip().upper()
    if not normalized:
        return ''
    return normalized if normalized.startswith('T') else 'R001'


class OnboardingListSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    assigned_boss_email = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Onboarding
        fields = [
            'id', 'onboarding_code', 'onboarding_type', 'company_name',
            'contact_person', 'pan_number', 'status', 'msme_status',
            'created_at', 'updated_at', 'created_by_email', 'approved_by_email',
            'assigned_boss_email', 'remarks',
            'document_count','date_of_birth', "pan_verified",
            "pan_verification_status",
            "gst_number", "gst_verified", "gst_verification_status",

        ]

    def get_document_count(self, obj):
        return obj.documents.count()

    def get_assigned_boss_email(self, obj):
        if obj.assigned_user and obj.assigned_user.role == 'BOSS':
            return obj.assigned_user.email
        return ''


class OnboardingDetailSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    created_by_role = serializers.CharField(source='created_by.role', read_only=True)
    assigned_boss_email = serializers.SerializerMethodField()
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    documents = serializers.SerializerMethodField()
    approval_history = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Onboarding
        fields = '__all__'
        read_only_fields = [
            'id', 'onboarding_code', 'created_by', 'approved_by', 'approved_at', 'created_at', 'updated_at',
        ]

    def to_internal_value(self, data):
        # DateField rejects '' outright (it only tolerates omission or null),
        # but the frontend sends '' for an unset date — normalize before DRF's
        # own parsing runs, otherwise an untouched, non-required DOB field
        # blocks the entire save with an error the user never sees tied to it.
        if 'date_of_birth' in data and data.get('date_of_birth') == '':
            data = data.copy()
            data['date_of_birth'] = None
        return super().to_internal_value(data)

    def get_documents(self, obj):
        from apps.documents.serializers import DocumentSerializer
        return DocumentSerializer(obj.documents.all(), many=True).data

    def get_assigned_boss_email(self, obj):
        if obj.assigned_user and obj.assigned_user.role == 'BOSS':
            return obj.assigned_user.email
        return ''

    def get_approval_history(self, obj):
        return OnboardingApprovalHistorySerializer(obj.approval_history.select_related('actor').all(), many=True).data

    def validate_pan_number(self, value):
        value = (value or '').upper()
        if value and not self.context.get('draft') and not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', value):
            raise serializers.ValidationError('Invalid PAN format. Expected: ABCDE1234F')
        return value

    def validate_gst_number(self, value):
        value = (value or '').upper()
        if value and not self.context.get('draft') and not re.match(r'^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$', value):
            raise serializers.ValidationError('Invalid GST format. Expected 15-character GSTIN.')
        return value

    def validate_ifsc_code(self, value):
        value = (value or '').upper()
        if value and not self.context.get('draft') and not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', value):
            raise serializers.ValidationError('Invalid IFSC format. Expected: ABCD0123456')
        return value

    def validate_account_number(self, value):
        value = re.sub(r'\s+', '', value or '')
        if value and not self.context.get('draft') and not ACCOUNT_NUMBER_RE.match(value):
            raise serializers.ValidationError('Account number must be 9-34 alphanumeric characters, no spaces.')
        return value

    def validate_vendor_reference_range(self, value):
        if not value:
            return value
        if not VendorReferenceMaster.objects.filter(vendor_reference_range=value).exists():
            raise serializers.ValidationError('Select a valid vendor reference range.')
        return value

    def validate(self, data):
        def current(field, default=''):
            if field in data:
                return data.get(field)
            return getattr(self.instance, field, default)

        pan = current('pan_number', '') or ''
        gst = current('gst_number', '') or ''
        company_name = current('company_name', '') or ''
        if pan:
            if pan_name_is_editable(pan):
                if self.context.get('require_complete') and not str(current('pan_name', '') or '').strip():
                    raise serializers.ValidationError({'pan_name': 'PAN name is required.'})
            else:
                data['pan_name'] = company_name
        elif 'pan_name' not in data:
            data['pan_name'] = company_name

        if pan and gst and len(gst) == 15 and not self.context.get('draft'):
            # GST digits 3-12 must match PAN
            if gst[2:12].upper() != pan.upper():
                raise serializers.ValidationError(
                    {'gst_number': 'GST number does not match PAN. Characters 3–12 of GST must equal PAN.'}
                )
            state = current('state', '')
            expected_state_code = gst_state_code_for_state(state)
            if expected_state_code and gst[:2] != expected_state_code:
                raise serializers.ValidationError({
                    'gst_number': f'GST first two digits must be {expected_state_code} for {state}.'
                })
        if self.context.get('require_complete'):
            errors = {}
            onboarding_type = str(current('onboarding_type', '') or '').strip().upper()
            is_customer = onboarding_type == 'CUSTOMER'
            required_text_fields = {
                'company_name': 'Company name is required.',
                'city': 'City is required.',
                'state': 'State is required.',
                'street1': 'Street address is required.',
                'pan_number': 'PAN number is required.',
            }
            if not is_customer:
                required_text_fields.update({
                    'account_holder_name': 'Account holder name is required.',
                    'bank_name': 'Bank name is required.',
                    'branch_name': 'Branch name is required.',
                    'account_number': 'Account number is required.',
                    'ifsc_code': 'IFSC code is required.',
                })
            for field, message in required_text_fields.items():
                if not str(current(field, '') or '').strip():
                    errors[field] = [message]

            emails = current('emails', []) or []
            phones = current('phones', []) or []
            non_empty_emails = [str(email or '').strip() for email in emails if str(email or '').strip()]
            non_empty_phones = [str(phone or '').strip() for phone in phones if str(phone or '').strip()]
            if not non_empty_emails:
                errors['emails'] = ['At least one email is required.']
            elif [email for email in non_empty_emails if not EMAIL_RE.match(email)]:
                errors['emails'] = ['Enter valid email address(es).']
            if not non_empty_phones:
                errors['phones'] = ['At least one phone number is required.']
            elif [phone for phone in non_empty_phones if not PHONE_RE.match(phone)]:
                errors['phones'] = ['Enter valid 10-digit phone number(s).']

            pincode = str(current('pincode', '') or '').strip()
            if len(pincode) != 6:
                errors['pincode'] = ['6-digit PIN code is required.']

            if current('gst_applicable', False) and not str(current('gst_number', '') or '').strip():
                errors['gst_number'] = ['GST number is required.']

            if not is_customer and current('msme_applicable', False):
                if not str(current('msme_category', '') or '').strip():
                    errors['msme_category'] = ['MSME category is required.']
                if not str(current('udyam_number', '') or '').strip():
                    errors['udyam_number'] = ['Udyam registration number is required.']

            if errors:
                raise serializers.ValidationError(errors)

        created_purchase_orgs = []
        if 'purchase_orgs_to_open' in data:
            created_purchase_orgs = normalize_purchase_org_list(data.get('purchase_orgs_to_open'))
            data['purchase_orgs_to_open'] = ', '.join(created_purchase_orgs)

        if created_purchase_orgs:
            data['reference_purchase_orgs'] = created_purchase_orgs
            data['company_code_to_open'] = company_code_for_purchase_org(created_purchase_orgs[0])
        elif 'reference_purchase_orgs' in data:
            data['reference_purchase_orgs'] = normalize_purchase_org_list(data.get('reference_purchase_orgs'))
            selected_reference_org = data['reference_purchase_orgs'][0] if data['reference_purchase_orgs'] else ''
            data['company_code_to_open'] = company_code_for_purchase_org(selected_reference_org)
        return data


class CreateOnboardingSerializer(serializers.Serializer):
    email = serializers.EmailField()
    onboarding_type = serializers.ChoiceField(choices=['VENDOR', 'CUSTOMER'])
    approval_boss = serializers.UUIDField(required=False, allow_null=True)


class ApproveRejectSerializer(serializers.Serializer):
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class OnboardingApprovalHistorySerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)

    class Meta:
        model = OnboardingApprovalHistory
        fields = ['id', 'action', 'comments', 'actor_email', 'actor_name', 'created_at']


class ExtensionEditRequestListSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    assigned_boss_email = serializers.SerializerMethodField()

    class Meta:
        model = ExtensionEditRequest
        fields = [
            'id', 'request_code', 'request_type', 'target_type', 'account_number',
            'company_name', 'status', 'created_at', 'updated_at',
            'created_by_email', 'approved_by_email', 'assigned_boss_email', 'remarks',
        ]

    def get_assigned_boss_email(self, obj):
        if obj.assigned_user and obj.assigned_user.role == 'BOSS':
            return obj.assigned_user.email
        return ''


class ExtensionEditRequestSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    created_by_role = serializers.CharField(source='created_by.role', read_only=True)
    assigned_boss_email = serializers.SerializerMethodField()
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    approval_history = serializers.SerializerMethodField()

    class Meta:
        model = ExtensionEditRequest
        fields = '__all__'
        read_only_fields = [
            'id', 'request_code', 'created_by', 'approved_by', 'approved_at', 'created_at', 'updated_at',
        ]

    def get_assigned_boss_email(self, obj):
        if obj.assigned_user and obj.assigned_user.role == 'BOSS':
            return obj.assigned_user.email
        return ''

    def get_approval_history(self, obj):
        return OnboardingApprovalHistorySerializer(obj.approval_history.select_related('actor').all(), many=True).data

    def validate_bank_account_number(self, value):
        value = re.sub(r'\s+', '', value or '')
        if value and not ACCOUNT_NUMBER_RE.match(value):
            raise serializers.ValidationError('Account number must be 9-34 alphanumeric characters, no spaces.')
        return value

    def validate_ifsc_code(self, value):
        value = (value or '').upper()
        if value and not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', value):
            raise serializers.ValidationError('Invalid IFSC format. Expected: ABCD0123456')
        return value

    def validate_vendor_reference_range(self, value):
        if not value:
            return value
        if not VendorReferenceMaster.objects.filter(vendor_reference_range=value).exists():
            raise serializers.ValidationError('Select a valid vendor reference range.')
        return value

    def validate(self, data):
        created_purchase_orgs = []
        if 'purchase_orgs_to_open' in data:
            created_purchase_orgs = normalize_purchase_org_list(data.get('purchase_orgs_to_open'))
            data['purchase_orgs_to_open'] = ', '.join(created_purchase_orgs)

        if created_purchase_orgs:
            data['reference_purchase_orgs'] = created_purchase_orgs
            data['company_code_to_open'] = company_code_for_purchase_org(created_purchase_orgs[0])
        elif 'reference_purchase_orgs' in data:
            data['reference_purchase_orgs'] = normalize_purchase_org_list(data.get('reference_purchase_orgs'))
            selected_reference_org = data['reference_purchase_orgs'][0] if data['reference_purchase_orgs'] else ''
            data['company_code_to_open'] = company_code_for_purchase_org(selected_reference_org)

        return data


class OnboardingTokenSerializer(serializers.ModelSerializer):
    onboarding = OnboardingDetailSerializer(read_only=True)

    class Meta:
        model = OnboardingToken
        fields = ['token', 'expiry', 'is_used', 'onboarding']


class VendorReferenceRangeSerializer(serializers.Serializer):
    value = serializers.CharField()
    label = serializers.CharField()


class VendorReferenceMasterSerializer(serializers.ModelSerializer):
    vendor_reference_range_display = serializers.SerializerMethodField()

    class Meta:
        model = VendorReferenceMaster
        fields = [
            'id', 'vendor_reference_range', 'vendor_reference_range_display',
            'group_code', 'nr_group', 'reference_name',
            'gl_account_number', 'gl_account_description',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_group_code(self, value):
        return str(value or '').strip().upper()

    def validate_nr_group(self, value):
        return str(value or '').strip()

    def validate_vendor_reference_range(self, value):
        normalized = value.replace(' ', '')
        if not re.match(r'^\d+-\d+$', normalized):
            raise serializers.ValidationError('Use range format FROM-TO, for example 10000-19999.')

        start, end = [int(part) for part in normalized.split('-')]
        if start > end:
            raise serializers.ValidationError('Range start must be less than or equal to range end.')

        existing = VendorReferenceMaster.objects.exclude(pk=getattr(self.instance, 'pk', None))
        for current in existing.values_list('vendor_reference_range', flat=True):
            try:
                current_start, current_end = [int(part) for part in current.split('-')]
            except (TypeError, ValueError):
                continue
            if start <= current_end and end >= current_start:
                raise serializers.ValidationError(f'This range overlaps with existing range {current}.')
        return normalized

    def get_vendor_reference_range_display(self, obj):
        return obj.vendor_reference_range.replace('-', ' - ')


class VendorReferenceLookupSerializer(serializers.Serializer):
    vendor_reference_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    vendor_reference_range = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('vendor_reference_code') and not data.get('vendor_reference_range'):
            raise serializers.ValidationError('Provide vendor_reference_code or vendor_reference_range.')
        selected_range = data.get('vendor_reference_range')
        if selected_range and not VendorReferenceMaster.objects.filter(vendor_reference_range=selected_range).exists():
            raise serializers.ValidationError({'vendor_reference_range': 'Select a valid vendor reference range.'})
        return data
