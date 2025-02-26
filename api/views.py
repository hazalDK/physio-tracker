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
        latest_report = Report.objects.filter(user=user).first()

        if not latest_report:
            Report.objects.create(user=user, pain_level=0)
        # Save the UserExercise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Override update method to update completed exercises.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Get the pain level from the updated report
        pain_level = serializer.validated_data.get('pain_level', 0)
        user = request.user
        latest_report = Report.objects.filter(user=user).first()
        
        # update the report with the completed exercise
        if latest_report:
            latest_report.exercises_completed.add(instance)
            latest_report.pain_level = pain_level
            latest_report.save()
        
        return Response(serializer.data)
    
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
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
                                # If the user is already at the beginner level, delete the exercise
                                user_exercise.delete()
                                return
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
        for exercise_data in exercises_completed_data:
            user_exercise_id = exercise_data.get('user_exercise_id')
            completed_reps = exercise_data.get('completed_reps', 0)
            completed_sets = exercise_data.get('completed_sets', 0)

            user_exercise = UserExercise.objects.get(id=user_exercise_id)
            ReportExercise.objects.create(
                report=report,
                user_exercise=user_exercise,
                completed_reps=completed_reps,
                completed_sets=completed_sets,
            )

        # Update exercise level based on pain level
        pain_level = serializer.validated_data.get('pain_level', 0)
        self.update_exercise_level_based_on_pain(request.user, pain_level)

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

        # Clear existing exercises_completed and add new ones
        instance.exercises_completed.clear()
        exercises_completed_data = request.data.get('exercises_completed', [])
        for exercise_data in exercises_completed_data:
            user_exercise_id = exercise_data.get('user_exercise_id')
            completed_reps = exercise_data.get('completed_reps', 0)
            completed_sets = exercise_data.get('completed_sets', 0)

            user_exercise = UserExercise.objects.get(id=user_exercise_id)
            ReportExercise.objects.create(
                report=instance,
                user_exercise=user_exercise,
                completed_reps=completed_reps,
                completed_sets=completed_sets,
            )

        # Update exercise level based on pain level
        pain_level = serializer.validated_data.get('pain_level', 0)
        self.update_exercise_level_based_on_pain(request.user, pain_level)

        return Response(serializer.data)