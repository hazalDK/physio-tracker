from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.shortcuts import get_object_or_404
from .models import User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType
from .serializers import (
    UserSerializer, ExerciseSerializer, ExerciseCategorySerializer,
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

        # If a report exists and pain level is greater than 4, update exercise level
        if latest_report and latest_report.pain_level > 4:
            # Force the exercise level to "beginner"
            serializer.validated_data['exercise_level'] = "beginner"
        if not latest_report:
            # No report exists, force the exercise level to "beginner"
            Report.objects.create(user=user, pain_level=0)  # Create a dummy report
        # Save the UserExercise
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
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
        Override create method to handle pain level logic.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the pain level from the created report
        pain_level = serializer.validated_data.get('pain_level', 0)
        user = request.user
        
        # Update exercise level based on pain level
        self.update_exercise_level_based_on_pain(user, pain_level)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Override update method to handle pain level logic.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Get the pain level from the updated report
        pain_level = serializer.validated_data.get('pain_level', 0)
        exercise_name = serializer.validated_data.get('exercises_completed', [])[0].exercise.name
        user = request.user
        
        # Update exercise level based on pain level
        self.update_exercise_level_based_on_pain(user, pain_level, exercise_name)
        
        return Response(serializer.data)