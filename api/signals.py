from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from .models import User
from .views import reset_user_exercises  # Assuming the function is in utils.py

@receiver(user_logged_in)
def reset_user_exercises_on_login(sender, request, user, **kwargs):
    reset_user_exercises(user)