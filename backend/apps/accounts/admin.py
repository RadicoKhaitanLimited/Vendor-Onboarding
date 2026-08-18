from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PasswordResetToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'boss_list', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['email', 'full_name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('full_name',)}),
        ('Permissions', {'fields': ('role', 'bosses', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'role', 'bosses', 'password1', 'password2'),
        }),
    )
    filter_horizontal = ['bosses', 'groups', 'user_permissions']

    def boss_list(self, obj):
        return ', '.join(obj.bosses.values_list('email', flat=True)) or '-'


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_used', 'expiry', 'created_at']
    list_filter = ['is_used']
    search_fields = ['user__email']
    readonly_fields = ['id', 'user', 'token', 'expiry', 'is_used', 'created_at']
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False
