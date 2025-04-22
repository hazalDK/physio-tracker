from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import User, UserExercise 

def reset_user_exercises(user):
    """Resets exercises for a single user."""
    now = timezone.now()
    if user.last_reset is None or (now - user.last_reset) >= timedelta(hours=24):
        UserExercise.objects.filter(user=user, is_active=True).update(
            completed=False, 
            pain_level=0
        )
        user.last_reset = now
        user.save()
        print(f"Reset exercises for {user.username} at {now}")

class Command(BaseCommand):
    help = "Resets all users' exercises daily"

    def handle(self, *args, **options):
        users = User.objects.all()
        for user in users:
            reset_user_exercises(user)
        self.stdout.write(self.style.SUCCESS(f"Reset exercises for {users.count()} users."))