from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils.text import slugify


# ExerciseCategory model
# GET: get a list of all exercise categories
# POST: add a new exercise category
# PUT: edit or update an exercise category
# DELETE: delete an exercise category
class ExerciseCategory(models.Model):
    name = models.CharField(default="Exercise", max_length=100, unique=True)
    description = models.TextField(default="Description", max_length=500)
    slug = models.SlugField(unique=True, blank=True, null=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'slug': self.slug,
        }

    class Meta:
        verbose_name = "Exercise Category"
        verbose_name_plural = "Exercise Categories"
        ordering = ['name']


# Exercise model
# GET: get a list of all exercises
# POST: add a new exercise
# PUT: edit or update an exercise
# DELETE: delete an exercise
class Exercise(models.Model):
    category = models.ForeignKey(ExerciseCategory, on_delete=models.CASCADE, related_name='exercises')
    name = models.CharField(default="", max_length=100)
    slug = models.SlugField(unique=True, blank=True, null=True)
    video_link = models.URLField(default="", blank=True, max_length=500)
    video_id = models.CharField(default="", max_length=100, blank=True)
    reps = models.IntegerField(default=0)
    sets = models.IntegerField(default=0)
    hold = models.IntegerField(default=0) 
    start = models.IntegerField(default=0, blank=True)
    end = models.IntegerField(default=0, blank=True) 

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
        return f"{self.category.name} ({self.difficulty_level})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category.name,
            'video_link': self.video_link,
            'video_id': self.video_id,
            'difficulty_level': self.difficulty_level,
            'additional_notes': self.additional_notes,
            'reps': self.reps,
            'sets': self.sets,
            'hold': self.hold,
            'start': self.start,
            'end': self.end,
            'slug': self.slug,
        }

    class Meta:
        ordering = ['name']


# User Exercise model
# GET: get a list of all exercises the current user has
# POST: users can add exercises to their list
# PUT: users can edit or update the amount of exercises they have
# DELETE: users can remove assigned exercises from themselves.
class UserExercise(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    exercise = models.ForeignKey('Exercise', on_delete=models.CASCADE)
    sets = models.IntegerField(default=0)
    reps = models.IntegerField(default=0)
    hold = models.IntegerField(default=0)  
    pain_level = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  
    date_activated = models.DateField(auto_now_add=True)
    date_deactivated = models.DateField(null=True, blank=True)  


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
            'hold': self.hold,
            'pain_level': self.pain_level,
            'completed': self.completed,
            'is_active': self.is_active,
        }

    def clean(self):
        if self.sets < 0 or self.reps < 0:
            raise ValidationError("Sets and reps must be non-negative.")
        
    def save(self, *args, **kwargs):
        # If is_active is changing from True to False, set date_deactivated
        if self.pk:  # Only for existing instances
            old_instance = UserExercise.objects.get(pk=self.pk)
            if old_instance.is_active and not self.is_active:
                self.date_deactivated = timezone.now().date()
        super().save(*args, **kwargs)
    

# InjuryType model
# GET: get a list of all injury types
# POST: add a new injury type
# PUT: edit or update an injury type
# DELETE: delete an injury type
class InjuryType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(default="", max_length=500)
    treatment = models.ManyToManyField(Exercise, blank=True)

    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'treatment': list(self.treatment.values('id', 'name', 'category', 'difficulty_level')),
        }

# Custom user model
# GET: get patient user's details (viewing their profile etc)
# POST: signup - no access via views should be available
# PUT: edit or update details about the user - name, dob, exercise list, username, password
# DELETE: delete user in profile (only for current user)
class User(AbstractUser):
    full_name = models.CharField(max_length=100)
    injury_type = models.ForeignKey(InjuryType, on_delete=models.CASCADE, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    exercises = models.ManyToManyField(Exercise, through="UserExercise")
    last_reset = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.full_name}, {self.email}"

    def as_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'date_of_birth': self.date_of_birth,
            'injury_type': self.injury_type.as_dict() if self.injury_type else None,
            'exercises': list(self.exercises.values('id', 'name', 'category', 'difficulty_level')),
            'last_reset': self.last_reset,
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

        # Assign exercises based on injury type
        if self.injury_type:
            for exercise in self.injury_type.treatment.all():
                UserExercise.objects.get_or_create(user=self, exercise=exercise, defaults={'sets': exercise.sets, 'reps': exercise.reps, 'hold': exercise.hold, 'pain_level': 0, 'completed': False, 'is_active': True})

        super().save(*args, **kwargs)


# ReportExercise model for tracking exercises in reports
# GET: get a list of all exercises in a report
# POST: add a new exercise to a report
# PUT: edit or update an exercise in a report
# DELETE: delete an exercise from a report
class ReportExercise(models.Model):
    report = models.ForeignKey('Report', on_delete=models.CASCADE, related_name='report_exercises')
    user_exercise = models.ForeignKey('UserExercise', on_delete=models.CASCADE)
    completed_reps = models.IntegerField(default=0)  # Track completed reps
    completed_sets = models.IntegerField(default=0)  # Track completed sets
    pain_level = models.IntegerField(default=0)  # Pain level during exercise

    def __str__(self):
        return f"{self.user_exercise.exercise} - {self.completed_reps} reps"
    
    def as_dict(self):
        return {
            'id': self.id,
            'report': self.report.as_dict(),
            'user_exercise': self.user_exercise.as_dict(),
            'completed_reps': self.completed_reps,
            'completed_sets': self.completed_sets,
            'pain_level': self.pain_level,
        }

# Report model for tracking user progress over time
# GET: get a list of all reports for a user
# POST: add a new report for a user
# PUT: edit or update a report for a user
# DELETE: delete a report for a user
class Report(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    date = models.DateField(auto_now_add=True)
    pain_level = models.IntegerField(default=0)
    exercises_completed = models.ManyToManyField(UserExercise, through=ReportExercise) 
    notes = models.TextField(default="", blank=True)  

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
            'exercises_completed': list(self.exercises_completed.values('id', 'exercise_name', 'sets', 'reps')),
            'notes': self.notes,
        }