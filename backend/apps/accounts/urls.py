from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView, ProfileView, UserProfileDetailView, AdminUsersView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', AdminUsersView.as_view(), name='admin_users'),
    path('users/<uuid:user_id>/', UserProfileDetailView.as_view(), name='user_profile_detail'),
]
