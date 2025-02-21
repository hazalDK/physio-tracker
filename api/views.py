from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.shortcuts import get_object_or_404
from .models import User, Exercise, ExerciseCategory, UserExercise, Report
from .serializers import (
    UserSerializer, ExerciseSerializer, ExerciseCategorySerializer,
    UserExerciseSerializer, ReportSerializer
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

    def update_exercise_level_based_on_pain(self, user, pain_level):
        """
        Helper method to update exercise level based on pain level.
        """
        if pain_level > 4:
            # Get the user's exercises
            user_exercises = UserExercise.objects.filter(user=user)
            for user_exercise in user_exercises:
                # Update exercise level to "beginner" or remove the exercise
                user_exercise.exercise_level = "beginner"  # Assuming exercise_level is a field in UserExercise
                user_exercise.save()
                # Alternatively, to remove the exercise:
                # user_exercise.delete()

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
        user = request.user
        
        # Update exercise level based on pain level
        self.update_exercise_level_based_on_pain(user, pain_level)
        
        return Response(serializer.data)