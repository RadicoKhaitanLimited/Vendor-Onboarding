import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, PasswordResetToken
from .serializers import (
    CustomTokenObtainPairSerializer, ProfileUpdateSerializer,
    UserSerializer, UserCreateSerializer, UserAdminUpdateSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
)
from apps.notifications.email_service import send_password_reset_email

logger = logging.getLogger(__name__)


class IsSuperuser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser


class IsSystemAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and (request.user.is_superuser or request.user.role == 'ADMIN')
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out successfully.'})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Only superusers can edit profile details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = UserAdminUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class UserProfileDetailView(APIView):
    """Read-only profiles for users visible in the management list."""

    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            profile_user = User.objects.prefetch_related('bosses', 'employees').get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        can_view = (
            request.user.pk == profile_user.pk
            or request.user.is_superuser
            or request.user.role == 'ADMIN'
            or (
                request.user.role == 'BOSS'
                and profile_user.role == 'EMPLOYEE'
                and profile_user.bosses.filter(pk=request.user.pk).exists()
            )
        )
        if not can_view:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(UserSerializer(profile_user).data)

    def patch(self, request, user_id):
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Only superusers can edit profile details.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            profile_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserAdminUpdateSerializer(profile_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(profile_user).data)


class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'BOSS':
            users = User.objects.filter(bosses=request.user, role='EMPLOYEE').prefetch_related('bosses').order_by('-created_at')
        elif request.user.is_superuser or request.user.role == 'ADMIN':
            users = User.objects.filter(role__in=['ADMIN', 'BOSS', 'EMPLOYEE']).prefetch_related('bosses').order_by('-created_at')
        else:
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        if not (request.user.is_superuser or request.user.role == 'ADMIN'):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


GENERIC_FORGOT_PASSWORD_RESPONSE = {
    'detail': 'If an account exists for that email, a password reset link has been sent.'
}


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            token = PasswordResetToken.create_for_user(user)
            try:
                send_password_reset_email(user.email, token.token)
            except Exception:
                logger.exception('Failed to send password reset email to %s', user.email)

        return Response(GENERIC_FORGOT_PASSWORD_RESPONSE)


class ValidateResetTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            tok = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token has expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'valid': True})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            tok = PasswordResetToken.objects.select_related('user').get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_404_NOT_FOUND)

        if not tok.is_valid():
            return Response({'detail': 'Token has expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ResetPasswordSerializer(data=request.data, context={'user': tok.user})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tok.user.set_password(serializer.validated_data['password'])
        tok.user.save(update_fields=['password'])

        PasswordResetToken.objects.filter(user=tok.user, is_used=False).update(is_used=True)

        return Response({'detail': 'Password has been reset successfully.'})
