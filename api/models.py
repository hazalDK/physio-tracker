from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError


# Create your models here.

# Exercise model
# GET: get a list of all exercises in database
# POST: users can add their own exercises to the database
# PUT: users can edit or update the exercises in the database
class ExerciseCategory(models.Model):
    '''
    Exercise model with str and as_dict function, including video link.
    '''
    name = models.CharField(default="Exercise", max_length=100, unique=True)
    description = models.TextField(default="Description", max_length=500)
    video_link = models.URLField(default="", blank=True, max_length=500)  

    def __str__(self):
        return self.name
    
    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'video_link': self.video_link,
        }
    

# Exercise Variant Model (Different versions of the same exercise)
class Exercise(models.Model):
    '''
    A variant of an exercise with a specific difficulty level.
    '''
    exercise = models.ForeignKey(ExerciseCategory, on_delete=models.CASCADE)
    name = models.CharField(default="", max_length=100)

    BEGINNER = 'Beginner'
    INTERMEDIATE = 'Intermediate'
    ADVANCED = 'Advanced'
    DIFFICULTY_LEVEL_CHOICES = [
        (BEGINNER, 'Beginner'),
        (INTERMEDIATE, 'Intermediate'),
        (ADVANCED, 'Advanced'),
    ]

    difficulty_level = models.CharField(
        max_length=12,
        choices=DIFFICULTY_LEVEL_CHOICES,
        default=BEGINNER,
    )
    additional_notes = models.TextField(default="", blank=True)

    def __str__(self):
        return f"{self.exercise.name} ({self.difficulty_level})"

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'exercise': self.exercise.as_dict(),
            'difficulty_level': self.difficulty_level,
            'additional_notes': self.additional_notes,
        }


# User Exercise model
# GET: get a list of all exercises the current user has
# POST: users can add exercises to their list
# PUT: users can edit or update the amount of exercises they have
# DELETE: users can remove assigned exercises from themselves.
class UserExercise(models.Model):
    '''
    Through table for storing user-specific exercise details.
    '''
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    exercise = models.ForeignKey('Exercise', on_delete=models.CASCADE)
    sets = models.IntegerField(default=0)
    reps = models.IntegerField(default=0)

    class Meta:
        unique_together = ('user', 'exercise')

    def __str__(self):
        return f"{self.user.full_name} - {self.exercise.name} (Sets: {self.sets}, Reps: {self.reps})"
    
    def as_dict(self):
        return {
            'id': self.id,
            'user': self.user.priv_as_dict(),
            'username': self.user.username,
            'exercise': self.exercise.as_dict(),
            'sets': self.sets,
            'reps': self.reps,
        }

# Custom user model
# GET: two variants: get physiotherapist user's details (viewing their profile etc)
#                    get patient user's details (viewing their profile etc)
# POST: signup - no access via views should be available
# PUT: edit or update details about the user - name, dob, exercise list
# DELETE: delete user in profile (only for current user)
class User(AbstractUser):
    '''
    User account model with str and as_dict function.
    '''
    # Fields 
    full_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(blank=True, null=True)
    exercises = models.ManyToManyField(Exercise,  through="UserExercise") #many to many relationship with Exercises model
    pain_level = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.full_name}, {self.email}"
    
    def as_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'email': self.email,
            'date_of_birth': self.date_of_birth,
            'exercises': list(self.exercises.values('id', 'name')),
        }
    
    def priv_as_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'date_of_birth': self.date_of_birth,
            'exercises': list(self.exercises.values('id', 'name')),
        }
    
    def save(self, *args, **kwargs):
        # Update full_name with first_name and last_name from Abstract User
        self.full_name = f"{self.first_name} {self.last_name}"
        super().save(*args, **kwargs)

# Report model for tracking user progress over time
class Report(models.Model):
    '''
    Tracks user progress, pain levels, and exercise completion over time.
    '''
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    date = models.DateField(auto_now_add=True)
    pain_level = models.IntegerField(default=0)  # Pain rating at the time of report
    exercises_completed = models.ManyToManyField(UserExercise, blank=True)  # Exercises performed during the session
    notes = models.TextField(default="", blank=True)  # Optional notes on progress
    summary = models.TextField(default="", blank=True)
    
    def clean(self):
        if self.pain_level < 0 or self.pain_level > 10:
            raise ValidationError("Pain level must be between 0 and 10.")

    class Meta:
        unique_together = ('user', 'date')  # Ensures one report per user per day

    def __str__(self):
        return f"Report for {self.user.full_name} on {self.date}"

    def as_dict(self):
        return {
            'id': self.id,
            'user': self.user.priv_as_dict(),
            'date': self.date,
            'pain_level': self.pain_level,
            'exercises_completed': list(self.exercises_completed.values('id', 'exercise__name', 'sets', 'reps')),
            'notes': self.notes,
        }