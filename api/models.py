from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

# Exercise model
# GET: get a list of all exercises in database
# POST: users can add their own exercises to the database
# PUT: users can edit or update the exercises in the database
class Exercises(models.Model):
    '''
    Exercise model with str and as_dict function, including video link.
    '''
    name = models.CharField(default="Exercise", max_length=100, unique=True)
    description = models.TextField(default="Description", max_length=500)
    reps = models.IntegerField(default=0)
    sets = models.IntegerField(default=0)
    video_link = models.URLField(default="", blank=True, max_length=500)  # New field for video links

    def __str__(self):
        return self.name
    
    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            "reps": self.reps,
            "sets": self.sets,
            "video_link": self.video_link,
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
    exercise = models.ForeignKey(Exercises, on_delete=models.CASCADE)
    sets = models.IntegerField(default=0)
    reps = models.IntegerField(default=0)

    class Meta:
        unique_together = ('user', 'exercise')

    def __str__(self):
        return f"{self.user.full_name} - {self.exercise.name} (Sets: {self.sets}, Reps: {self.reps})"

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
    exercises = models.ManyToManyField(Exercises) #many to many relationship with Hobby model

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