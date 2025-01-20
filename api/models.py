from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

# Exercise model
# GET: get a list of all exercises in database
# POST: not needed - hobby additions shouldn't be done by client users (maybe)
# PUT: not needed - client users cannot edit the disc (for now?)
# DELETE: also not needed for the client user
class Exercises(models.Model):
    '''
    Hobby model with str and as_dict function.
    '''
    name = models.CharField(default="Hobby", max_length=100, unique=True)
    description = models.TextField(default="Description", max_length=500)
    reps = models.IntegerField(default=0)
    sets = models.IntegerField(default=0)

    def __str__(self):
        return self.name
    
    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            "reps": self.reps,
            "sets": self.sets,
        }


# Custom user model
# GET: two variants: get another user's profile (viewing other profiles)
#                    get current user's details (viewing their profile etc)
# POST: signup - no access via views should be available
# PUT: edit or update details about the user - name(?), dob, hobby list
# DELETE: delete user in profile (only for current user)
# BONUS GET: search for users with a particular hobby(s) and output - TODO
#   this leads to the profile page GET (1st one)

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
            'hobbies': list(self.exercises.values('id', 'name')),
        }
    
    def priv_as_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'date_of_birth': self.date_of_birth,
            'hobbies': list(self.exercises.values('id', 'name')),
        }
    
    def save(self, *args, **kwargs):
        # Update full_name with first_name and last_name from Abstract User
        self.full_name = f"{self.first_name} {self.last_name}"
        super().save(*args, **kwargs)