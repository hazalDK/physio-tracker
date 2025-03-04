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
        return self.queryset.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Override create method to update exercise level based on pain level.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get the user and check their latest report
        user = request.user
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
        Override update method to update completed exercises and link to Report.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update the UserExercise
        self.perform_update(serializer)

        # Get the latest report for the user
        # Get today's date
        today = timezone.now().date()

        user = request.user
        # Get the report for today or create one if it doesn't exist
        latest_report = Report.objects.filter(user=user, date=today).first()
        if not latest_report:
            latest_report = Report.objects.create(user=user, date=today)

        # Create a ReportExercise entry for the completed exercise
        completed_sets = serializer.validated_data.get('sets', instance.sets)
        completed_reps = serializer.validated_data.get('reps', instance.reps)

        # Get today's date
        today = timezone.now().date()

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

        # Add the UserExercise to the Report's exercises_completed
        latest_report.exercises_completed.add(instance)

        return Response(serializer.data)
    
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    # @staticmethod
    def update_exercise_level_based_on_pain(self, user, pain_level, exercise_name):
        """
        Helper method to update exercise level based on pain level.
        Reassigns the user to a different exercise in the same category using match case.
        """
        if pain_level > 4:
            # Get the user's current exercise
            user_exercises = UserExercise.objects.filter(user=user)
            for user_exercise in user_exercises:
                if user_exercise.exercise.name == exercise_name:
                    current_exercise = user_exercise.exercise
                    current_category = current_exercise.category

                    try:
                        # Use match case to handle different difficulty levels
                        match current_exercise.difficulty_level:
                            case "Advanced":
                                new_exercise = Exercise.objects.filter(
                                    category=current_category,
                                    difficulty_level="Intermediate"
                                ).first()
                            case "Intermediate":
                                new_exercise = Exercise.objects.filter(
                                    category=current_category,
                                    difficulty_level="Beginner"
                                ).first()
                            case "Beginner":
                                # If the user is already at the beginner level, will print a message on frontend
                                message = "You are already at the Beginner level."
                                response_data = {
                                    'exercise': current_exercise,
                                    'message': message if new_exercise is None else None,
                                }
                                return JsonResponse(response_data)
                    except Exercise.DoesNotExist as e:
                        print(e)

                    # If a new exercise is found, reassign the user to it
                    if new_exercise:
                        user_exercise.exercise = new_exercise
                        user_exercise.save()
                        print(f"User {user} reassigned to {new_exercise.name} ({new_exercise.difficulty_level}).")
                    else:
                        print(f"No suitable exercise found in category '{current_category.name}' for user {user}.")
                    break
    
    @staticmethod
    def has_consistent_low_pain(report, exercise, num_reports=3, max_pain_level=4):
        """
        Check if the user has consistent low pain levels in their recent reports.
        """
        recent_reports = ReportExercise.objects.filter(report=report, user_exercise=exercise).order_by('-id')[:num_reports]
        
        # Ensure there are enough reports
        if len(recent_reports) < num_reports:
            return False
        
        # Check if all recent reports have pain levels below the threshold
        return all(report.pain_level < max_pain_level for report in recent_reports)
    
    @staticmethod
    def increase_difficulty(user, exercise_name):
        """
        Increase the difficulty level of the user's exercises and return a message.
        """
        user_exercises = UserExercise.objects.filter(user=user)
        message = None

        for user_exercise in user_exercises:
            current_exercise = user_exercise.exercise
            current_category = current_exercise.category
            if user_exercise.exercise.name == exercise_name:
                match current_exercise.difficulty_level:
                    case "Beginner":
                        new_exercise = Exercise.objects.filter(
                            category=current_category,
                            difficulty_level="Intermediate"
                        ).first()
                    case "Intermediate":
                        new_exercise = Exercise.objects.filter(
                            category=current_category,
                            difficulty_level="Advanced"
                        ).first()
                    case "Advanced":
                        new_exercise = None
                if new_exercise:
                    user_exercise.exercise = new_exercise
                    user_exercise.save()
                    message = f"Your difficulty level has been increased to {new_exercise.difficulty_level}."
        return message

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
            self.update_exercise_level_based_on_pain(request.user, exercise_pain_level, )

            # Add the UserExercise to the Report's exercises_completed
            report.exercises_completed.add(user_exercise)

            if self.has_consistent_low_pain(instance, user_exercise):
                self.increase_difficulty(request.user)
            
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
            self.update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name)

            # Add the UserExercise to the Report's exercises_completed
            instance.exercises_completed.add(user_exercise)
            print("instance.exercises_completed", instance.exercises_completed)

            if self.has_consistent_low_pain(instance, user_exercise):
                self.increase_difficulty(request.user)
            
        # Calculate average pain level for the report
        if num_exercises > 0:
            average_pain_level = total_pain_level / num_exercises
            instance.pain_level = average_pain_level  # Update report's pain level with the average
            instance.save()


        return Response(serializer.data)