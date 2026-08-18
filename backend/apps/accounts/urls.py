from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, ProfileView, UserProfileDetailView, AdminUsersView,
    ForgotPasswordView, ValidateResetTokenView, ResetPasswordView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', AdminUsersView.as_view(), name='admin_users'),
    path('users/<uuid:user_id>/', UserProfileDetailView.as_view(), name='user_profile_detail'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/<str:token>/', ValidateResetTokenView.as_view(), name='validate_reset_token'),
    path('reset-password/<str:token>/confirm/', ResetPasswordView.as_view(), name='reset_password_confirm'),
]
