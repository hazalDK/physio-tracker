from django.http import JsonResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.shortcuts import get_object_or_404
from .models import ReportExercise, User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType
from .serializers import (
    ReportExerciseSerializer, UserSerializer, ExerciseSerializer, ExerciseCategorySerializer,
    UserExerciseSerializer, ReportSerializer, InjuryTypeSerializer
)

@api_view(['GET'])
def auth_check(request):
    if request.user.is_authenticated:
        return Response({
            "auth": True,
            "user": UserSerializer(request.user).data
        })
    return Response({"auth": False}, status=status.HTTP_401_UNAUTHORIZED)

def update_exercise_level_based_on_pain(user, pain_level, exercise_name):
    """
    Update exercise level based on pain level.
    Creates a new UserExercise instance with the updated exercise difficulty.
    """
    user_exercises = UserExercise.objects.filter(user=user, is_active=True)
    for user_exercise in user_exercises:
        if user_exercise.exercise.name == exercise_name:
            current_exercise = user_exercise.exercise
            current_category = current_exercise.category

            try:
                # Use match case to handle different difficulty levels
                match current_exercise.difficulty_level:
                    case "Advanced":
                        if pain_level > 4:
                            # If pain level is high, move to intermediate
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Intermediate"
                            ).first()
                        else:
                            # If pain level is low, stay at advanced
                            new_exercise = None
                    case "Intermediate":
                        if pain_level > 4:
                            # If pain level is high, move to beginner
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Beginner"
                            ).first()
                        else:
                            # If pain level is low, move to advanced
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Advanced"
                            ).first()
                    case "Beginner":
                        if pain_level > 4:
                            # If pain level is high, stay at beginner
                            new_exercise = None
                            message = "You are already at the Beginner level."
                            response_data = {
                                'exercise': current_exercise,
                                'message': message,
                            }
                            return JsonResponse(response_data)
                        else:
                            # If pain level is low, move to intermediate
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Intermediate"
                            ).first()
            except Exercise.DoesNotExist as e:
                print(e)

            # Mark the old UserExercise as inactive
            user_exercise.is_active = False
            user_exercise.save()

            # Create a new UserExercise instance with the updated exercise
            if new_exercise:
                new_user_exercise = UserExercise.objects.create(
                    user=user,
                    exercise=new_exercise,
                    sets=user_exercise.sets,
                    reps=user_exercise.reps,
                    pain_level=pain_level,
                    is_active=True,  # Mark the new instance as active
                )
                print(f"User {user} reassigned to {new_exercise.name} ({new_exercise.difficulty_level}).")
            else:
                # If no new exercise is found, create a new UserExercise with the same exercise
                new_user_exercise = UserExercise.objects.create(
                    user=user,
                    exercise=current_exercise,
                    sets=user_exercise.sets,
                    reps=user_exercise.reps,
                    pain_level=pain_level,
                    is_active=True,  # Mark the new instance as active
                )
                print(f"No suitable exercise found in category '{current_category.name}' for user {user}.")

            return new_user_exercise
    
def has_consistent_low_pain(report, user_exercise, num_reports=3, max_pain_level=4):
    """
    Check if the user has consistent low pain levels in their recent reports.
    """
    # Debug: Print filter criteria
    print("Report ID:", report.id)
    print("UserExercise ID:", user_exercise.id)

    # Retrieve the most recent ReportExercise entries for today
    recent_reports = ReportExercise.objects.filter(
        report=report,
        user_exercise=user_exercise
    ).order_by('-id')[:num_reports]

    # Debug: Print recent reports
    print("Recent Reports:")
    for re in recent_reports:
        print(re.id, re.report.date, re.user_exercise.exercise.name, re.pain_level)

    # Ensure there are enough reports
    if len(recent_reports) < num_reports:
        return False
    
    # Check if all recent reports have pain levels below the threshold
    return all(report.pain_level < max_pain_level for report in recent_reports)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['GET'])
    def me(self, request):
        if request.user.is_authenticated:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

class InjuryTypeViewSet(viewsets.ModelViewSet):
    queryset = InjuryType.objects.all()
    serializer_class = InjuryTypeSerializer

class ReportExerciseViewSet(viewsets.ModelViewSet):
    queryset = ReportExercise.objects.all()
    serializer_class = ReportExerciseSerializer

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

class ExerciseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExerciseCategory.objects.all()
    serializer_class = ExerciseCategorySerializer

class UserExerciseViewSet(viewsets.ModelViewSet):
    queryset = UserExercise.objects.all()
    serializer_class = UserExerciseSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user, is_active=True)
    
    def create(self, request, *args, **kwargs):
        """
        Override create method to update exercise level based on pain level.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get the user and check their latest report
        user = request.user
        today = timezone.now().date()
        # Get the report for today or create one if it doesn't exist
        latest_report = Report.objects.filter(user=user, date=today).first()
        if not latest_report:
            latest_report = Report.objects.create(user=user, date=today)
        # Save the UserExercise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Override update method to update UserExercise and preserve historical data.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Get the updated data
        completed_sets = serializer.validated_data.get('sets', instance.sets)
        completed_reps = serializer.validated_data.get('reps', instance.reps)
        updated_pain_level = serializer.validated_data.get('pain_level', instance.pain_level)

        # Mark the old UserExercise as inactive
        # instance.is_active = False
        # instance.save()

        # Create a new UserExercise instance with the updated data
        new_user_exercise = update_exercise_level_based_on_pain(request.user, updated_pain_level, instance.exercise.name)

        # Get today's date
        today = timezone.now().date()

        # Get the latest report for the user for today
        latest_report = Report.objects.filter(user=request.user, date=today).first()
        if not latest_report:
            latest_report = Report.objects.create(user=request.user, date=today)
        
        if has_consistent_low_pain(latest_report, instance):
            new_user_exercise = update_exercise_level_based_on_pain(request.user, updated_pain_level, instance.exercise.name)

        # Retrieve the latest ReportExercise for today
        latest_report_exercise = ReportExercise.objects.filter(
            user_exercise=instance,
            report__date=today  # Filter by today's date
        ).order_by('-id').first()
        print("Latest Report Exercise:", latest_report_exercise)
        print("Completed Sets:", completed_sets)
        print("Completed Reps:", completed_reps)
        print("User Exercise Pain Level:", instance.pain_level)

        # If no report exists, create one
        if not latest_report_exercise:
            print("Creating new Report Exercise")
            ReportExercise.objects.create(
                report=latest_report,
                user_exercise=instance,
                completed_sets=completed_sets,
                completed_reps=completed_reps,
                pain_level=instance.pain_level,
            )
        else:
            print("Updating existing Report Exercise")
            # Update the latest report exercise with the completed sets and reps
            latest_report_exercise.completed_sets = completed_sets
            latest_report_exercise.completed_reps = completed_reps
            latest_report_exercise.pain_level = instance.pain_level
            latest_report_exercise.save()
        

        # Add the new UserExercise to the Report's exercises_completed
        latest_report.exercises_completed.add(new_user_exercise)

        return Response(serializer.data)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Override create method to handle pain level logic and track completed reps/sets.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)


        # Create the report
        report = Report.objects.create(
            user=request.user,
            date=serializer.validated_data.get('date'),
            pain_level=serializer.validated_data.get('pain_level', 0),
            notes=serializer.validated_data.get('notes', ''),
        )

        # Add exercises with completed reps/sets
        exercises_completed_data = request.data.get('exercises_completed', [])
        total_pain_level = 0
        num_exercises = instance.exercises_completed.count()

        for exercise_data in exercises_completed_data:
            user_exercise_id = exercise_data.get('user_exercise_id')
            completed_reps = exercise_data.get('completed_reps', 0)
            completed_sets = exercise_data.get('completed_sets', 0)

            user_exercise = UserExercise.objects.get(id=user_exercise_id)
            latest_report_exercise = ReportExercise.objects.filter(user_exercise = user_exercise).order_by('-id').first()
            exercise_pain_level = latest_report_exercise.pain_level


            # If no report exists, create one
            if not latest_report_exercise:
                ReportExercise.objects.create(
                    report=latest_report,
                    user_exercise=user_exercise,
                    completed_sets=completed_sets,
                    completed_reps=completed_reps,
                    pain_level=user_exercise.pain_level,
                )
            else:
                # Update the latest report exercise with the completed sets and reps
                latest_report_exercise.completed_sets = completed_sets
                latest_report_exercise.completed_reps = completed_reps
                latest_report_exercise.pain_level = user_exercise.pain_level
                latest_report_exercise.save()

            # Add the UserExercise to the Report's exercises_completed
            report.exercises_completed.add(user_exercise)

            # Accumulate pain level for average calculation
            total_pain_level += exercise_pain_level

            # Update exercise level based on pain level
            update_exercise_level_based_on_pain(request.user, exercise_pain_level, )

            # Add the UserExercise to the Report's exercises_completed
            report.exercises_completed.add(user_exercise)

            if has_consistent_low_pain(instance, user_exercise):
                increase_difficulty(request.user)
            
        # Calculate average pain level for the report
        if num_exercises > 0:
            average_pain_level = total_pain_level / num_exercises
            report.pain_level = average_pain_level  # Update report's pain level with the average
            report.save()
        report.pain_level = average_pain_level

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Override update method to handle pain level logic and track completed reps/sets.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update the report
        instance.pain_level = serializer.validated_data.get('pain_level', instance.pain_level)
        instance.notes = serializer.validated_data.get('notes', instance.notes)
        instance.save()

        # Add new exercises_completed without clearing existing ones
        exercises_completed_data = request.data.get('exercises_completed', [])
        total_pain_level = instance.pain_level * instance.exercises_completed.count()  # Start with existing pain levels
        num_exercises = instance.exercises_completed.count()
        print('exercise_data:', exercises_completed_data)
        for exercise_data in exercises_completed_data:
            print('exercise_data:', exercise_data)
            # user_exercise_id = exercise_data.get('user_exercise_id')


            user_exercise = UserExercise.objects.get(id=exercise_data)
            user_exercise.is_active = False
            user_exercise.save()
            instance.exercises_completed.remove(user_exercise)
            exercise_pain_level = user_exercise.pain_level
            print(exercise_pain_level)

            if not instance.exercises_completed.filter(id=user_exercise.id).exists():
                latest_report_exercise = ReportExercise.objects.filter(user_exercise = user_exercise).order_by('-id').first()

                # If no report exists, create one
                if not latest_report_exercise:
                    ReportExercise.objects.create(
                        report=latest_report,
                        user_exercise=user_exercise,
                        # completed_sets=completed_sets,
                        # completed_reps=completed_reps,
                        pain_level=user_exercise.pain_level,
                    )
                else:
                    # Update the latest report exercise with the completed sets and reps
                    # latest_report_exercise.completed_sets = completed_sets
                    # latest_report_exercise.completed_reps = completed_reps
                    latest_report_exercise.pain_level = user_exercise.pain_level
                    latest_report_exercise.save()

            # Accumulate pain level for average calculation
            total_pain_level += exercise_pain_level

            print("exercise", user_exercise.exercise.name)
            # Update exercise level based on pain level
            user_exercise = update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name)

            # Add the UserExercise to the Report's exercises_completed
            instance.exercises_completed.add(user_exercise)
            print("instance.exercises_completed", instance.exercises_completed)

            if has_consistent_low_pain(instance, user_exercise):
                user_exercise = update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name)
            
        # Calculate average pain level for the report
        if num_exercises > 0:
            average_pain_level = total_pain_level / num_exercises
            instance.pain_level = average_pain_level  # Update report's pain level with the average
            instance.save()


        return Response(serializer.data)