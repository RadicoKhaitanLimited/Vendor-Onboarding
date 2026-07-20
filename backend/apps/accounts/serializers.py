import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User

# Strict email format check: proper local part (no leading/trailing/consecutive
# dots), a domain with at least one dot and a 2+ letter TLD, no consecutive dots
# in the domain, and the RFC 5321 max length of 254 characters.
EMAIL_RE = re.compile(
    r'^(?!\.)[A-Za-z0-9._%+-]+(?<!\.)@(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$'
)


def is_valid_email(value):
    value = str(value or '').strip()
    if not value or len(value) > 254:
        return False
    if '..' in value:
        return False
    return bool(EMAIL_RE.match(value))


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'bosses': [str(boss_id) for boss_id in self.user.bosses.values_list('id', flat=True)],
            'boss_details': [
                {'id': str(boss.id), 'email': boss.email, 'full_name': boss.full_name}
                for boss in self.user.bosses.order_by('email')
            ],
            'is_superuser': self.user.is_superuser,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    bosses = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='BOSS'),
        required=False,
    )
    boss_emails = serializers.SerializerMethodField()
    boss_details = serializers.SerializerMethodField()
    employee_count = serializers.IntegerField(source='employees.count', read_only=True)
    employee_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'bosses', 'boss_emails',
            'boss_details', 'employee_count', 'employee_details', 'is_active', 'is_superuser', 'created_at',
        ]
        read_only_fields = ['id', 'is_superuser', 'created_at']

    def get_boss_emails(self, obj):
        return list(obj.bosses.order_by('email').values_list('email', flat=True))

    def get_boss_details(self, obj):
        return [
            {'id': str(boss.id), 'email': boss.email, 'full_name': boss.full_name}
            for boss in obj.bosses.order_by('email')
        ]

    def get_employee_details(self, obj):
        return [
            {'id': str(employee.id), 'email': employee.email, 'full_name': employee.full_name}
            for employee in obj.employees.order_by('full_name', 'email')
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """The profile endpoint intentionally permits only personal contact details."""

    class Meta:
        model = User
        fields = ['full_name', 'email']

    def validate_email(self, value):
        if not is_valid_email(value):
            raise serializers.ValidationError('Enter a valid email address.')
        return value


class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """Superuser-only account and reporting-hierarchy editor."""

    bosses = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='BOSS'),
        required=False,
    )
    employees = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='EMPLOYEE'),
        required=False,
    )

    class Meta:
        model = User
        fields = ['full_name', 'email', 'role', 'is_active', 'is_superuser', 'bosses', 'employees']

    def validate_email(self, value):
        if not is_valid_email(value):
            raise serializers.ValidationError('Enter a valid email address.')
        return value

    def validate(self, attrs):
        role = attrs.get('role', self.instance.role)
        if role != 'EMPLOYEE':
            attrs['bosses'] = []
        if role != 'BOSS':
            attrs['employees'] = []
        return attrs

    def update(self, instance, validated_data):
        bosses = validated_data.pop('bosses', None)
        employees = validated_data.pop('employees', None)
        instance = super().update(instance, validated_data)
        if bosses is not None:
            instance.bosses.set(bosses)
        if employees is not None:
            instance.employees.set(employees)
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    bosses = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(role='BOSS'),
        required=False,
    )

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'role', 'bosses']

    def validate_role(self, value):
        if value not in ['ADMIN', 'BOSS', 'EMPLOYEE']:
            raise serializers.ValidationError('Role must be ADMIN, BOSS, or EMPLOYEE.')
        return value

    def validate_email(self, value):
        if not is_valid_email(value):
            raise serializers.ValidationError('Enter a valid email address.')
        return value

    def validate(self, attrs):
        role = attrs.get('role', 'EMPLOYEE')
        bosses = attrs.get('bosses', [])
        if role == 'EMPLOYEE' and not bosses:
            raise serializers.ValidationError({'bosses': 'Select at least one boss for employee users.'})
        if role != 'EMPLOYEE':
            attrs['bosses'] = []
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        bosses = validated_data.pop('bosses', [])
        role = validated_data.get('role', 'EMPLOYEE')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            full_name=validated_data.get('full_name', ''),
            role=role,
            is_staff=True,
        )
        if role == 'EMPLOYEE':
            user.bosses.set(bosses)
        return user


RegisterAdminSerializer = UserCreateSerializer
