from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Exercise, UserExercise

class UserExerciseInline(admin.TabularInline):  # Use StackedInline for a different layout
    model = UserExercise
    extra = 1  # Number of empty forms shown by default

# Makes sure we can see the extra added fields in admin portal
class CustomUserAdmin(UserAdmin):
    model = User
    inlines = [UserExerciseInline]  # Add inline admin for UserExercise

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'full_name', 'date_of_birth')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'full_name', 'date_of_birth'),
        }),
    )

    list_display = ('username', 'email', 'full_name', 'date_of_birth', 'is_staff')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('username',)

# Register models in admin
admin.site.register(User, CustomUserAdmin)
admin.site.register(Exercise)
admin.site.register(UserExercise)
