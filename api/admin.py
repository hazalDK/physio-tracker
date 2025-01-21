from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Exercises, UserExercise

# Makes sure we can see the extra added fields in admin portal
class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'full_name', 'date_of_birth', 'exercises')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'full_name', 'date_of_birth', 'exercises'),
        }),
    )
    list_display = ('username', 'email', 'full_name', 'date_of_birth', 'is_staff')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('username',)

admin.site.register(User, CustomUserAdmin)
admin.site.register(Exercises)
admin.site.register(UserExercise)
