from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login
from django.contrib.auth.hashers import check_password
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from .models import ReportExercise, User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType
from .serializers import (
    ReportExerciseSerializer, UserSerializer, ExerciseSerializer, ExerciseCategorySerializer,
    UserExerciseSerializer, ReportSerializer, InjuryTypeSerializer
)

def reset_user_exercises(user):
    now = timezone.now()
    if user.last_reset is None or (now - user.last_reset) > timedelta(days=1):
        # Reset completed and pain_level for the user's active exercises
        UserExercise.objects.filter(user=user, is_active=True).update(completed=False, pain_level=0)
        user.last_reset = now
        user.save()
        print(f"Reset UserExercise for {user.username}.")

@api_view(['GET'])
def auth_check(request):
    if request.user.is_authenticated:
        print(f"User {request.user} is authenticated.")
        reset_user_exercises(request.user)
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
            new_exercise = None

            try:
                # Use match case to handle different difficulty levels
                match current_exercise.difficulty_level:
                    case "Advanced":
                        if pain_level >= 4:
                            print("Pain level is high - advanced")
                            # If pain level is high, move to intermediate
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Intermediate"
                            ).first()
                    case "Intermediate":
                        if pain_level >= 4:
                            print("Pain level is high - intermediate")
                            # If pain level is high, move to beginner
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Beginner"
                            ).first()
                    case "Beginner":
                        if pain_level >= 4:
                            print("Pain level is high - beginner")
                            # If pain level is high, stay at beginner
                            message = "You are already at the Beginner level."
                            response_data = {
                                'exercise': current_exercise,
                                'message': message,
                            }
                            return JsonResponse(response_data)
            except Exercise.DoesNotExist as e:
                print(e)

            # Create a new UserExercise instance with the updated exercise
            if new_exercise:
                user_exercises = UserExercise.objects.filter(user=user, exercise = new_exercise)
                if user_exercises.exists():
                    new_user_exercise = user_exercises.first()
                    new_user_exercise.pain_level = 0
                    new_user_exercise.completed = False
                    new_user_exercise.is_active = True
                    new_user_exercise.save()
                else:
                    new_user_exercise = UserExercise.objects.create(
                        user=user,
                        exercise=new_exercise,
                        sets=user_exercise.sets,
                        reps=user_exercise.reps,
                        pain_level=0,
                        is_active=True,  # Mark the new instance as active
                    )
                print(f"User {user} reassigned to {new_exercise.name} ({new_exercise.difficulty_level}).")

                return new_user_exercise
            return None
    
def has_consistent_low_pain(user_exercise, num_reports=3, max_pain_level=4):
    """
    Check if the user has consistent low pain levels in their recent reports.
    """
    # # Debug: Print filter criteria
    # print("Report ID:", report.id)
    # print("UserExercise ID:", user_exercise.id)

    # Retrieve all ReportExercise entries for the given report and user_exercise
    all_reports = ReportExercise.objects.filter(
        user_exercise=user_exercise,  
    ).order_by('-id') 

    # Debug: Print total number of reports
    # print("Total Reports Found:", all_reports.count())

    # Retrieve the most recent `num_reports`
    recent_reports = all_reports[:num_reports]

    # Debug: Print recent reports
    # print("Recent Reports:")
    # for re in recent_reports:
    #     print(re.id, re.report.date, re.user_exercise.exercise.name, re.pain_level)

    # Ensure there are enough reports
    if len(recent_reports) < num_reports:
        print(f"Not enough reports. Expected {num_reports}, found {len(recent_reports)}")
        return False
    
    # Check if all recent reports have pain levels below or equal to the threshold
    return all(report.pain_level < max_pain_level for report in recent_reports)

def increase_difficulty(user, exercise_name):
    user_exercises = UserExercise.objects.filter(user=user, is_active=True)
    for user_exercise in user_exercises:
        if user_exercise.exercise.name == exercise_name:
            current_exercise = user_exercise.exercise
            current_category = current_exercise.category

            try:
                # Use match case to handle different difficulty levels
                match current_exercise.difficulty_level:
                    case "Advanced":
                            print("Pain level is low - advanced")
                            # If pain level is low, stay at advanced
                            new_exercise = None
                    case "Intermediate":
                            print("Pain level is low - intermediate")
                            # If pain level is low, move to advanced
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Advanced"
                            ).first()
                    case "Beginner":
                            print("Pain level is low - beginner")
                            # If pain level is low, move to intermediate
                            new_exercise = Exercise.objects.filter(
                                category=current_category,
                                difficulty_level="Intermediate"
                            ).first()
            except Exercise.DoesNotExist as e:
                print(e)

            # Create a new UserExercise instance with the updated exercise
            if new_exercise:
                user_exercises = UserExercise.objects.filter(user=user, exercise = new_exercise)
                if user_exercises.exists():
                    new_user_exercise = user_exercises.first()
                    new_user_exercise.pain_level = 0
                    new_user_exercise.completed = False
                    new_user_exercise.is_active = True
                    new_user_exercise.save()
                else:
                    new_user_exercise = UserExercise.objects.create(
                        user=user,
                        exercise=new_exercise,
                        sets=user_exercise.sets,
                        reps=user_exercise.reps,
                        pain_level=0,
                        is_active=True,  # Mark the new instance as active
                    )
                print(f"User {user} reassigned to {new_exercise.name} ({new_exercise.difficulty_level}).")

            return new_user_exercise

@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    # Convert a user token into user data
    def get(self, request, format=None):

        if request.user.is_authenticated == False or request.user.is_active == False:
            return Response("Invalid Credentials", status=403)

        user = UserSerializer(request.user)
        return Response(user.data, status=200)

    def post(self, request, format=None):
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        if user is not None:

            if user.is_active:
                login(request, user)  # <--- This sets the session
                user_serializer = UserSerializer(user)
                return Response(user_serializer.data, status=200)

        return Response("Invalid Credentials", status=403)
    
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def me(self, request):
        if request.user.is_authenticated:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['POST'], permission_classes=[AllowAny])
    def register(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['PUT'])
    def update_password(self, request):
        user = request.user  # Get the currently authenticated user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        # Validation checks
        if not current_password or not new_password:
            return Response(
                {'error': 'Both current and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(current_password, user.password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the password
        user.set_password(new_password)
        user.save()

        return Response(
            {'success': 'Password updated successfully'},
            status=status.HTTP_200_OK
        )
    

    @action(detail=False, methods=['GET'])
    def active_exercises(self, request):
        """Get only active exercises for the current user"""
        print("Request received, authenticated:", request.user.is_authenticated)
        if request.user.is_authenticated:
            # print("User is authenticated")
            active_user_exercises = UserExercise.objects.filter(
                user=request.user, 
                is_active=True
            ).select_related('exercise')
            
            active_exercises = [ue.exercise for ue in active_user_exercises]
            # Pass the request in the context
            serializer = ExerciseSerializer(active_exercises, many=True, context={'request': request})
            return Response(serializer.data)
        return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)


class InjuryTypeViewSet(viewsets.ModelViewSet):
    permission_classes =[AllowAny]
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
        completed = serializer.validated_data.get('completed', instance.completed)
        completed_sets = serializer.validated_data.get('sets', instance.sets)
        completed_reps = serializer.validated_data.get('reps', instance.reps)
        instance.exercise = serializer.validated_data.get('exercise', instance.exercise)
        instance.save()

        if not completed:
            return Response(serializer.data)
        
        updated_pain_level = serializer.validated_data.get('pain_level', instance.pain_level)

        # Create a new UserExercise instance with the updated data
        new_user_exercise = update_exercise_level_based_on_pain(request.user, updated_pain_level, instance.exercise.name)

        # Get today's date
        today = timezone.now().date()

        # Get the latest report for the user for today
        latest_report = Report.objects.filter(user=request.user, date=today).first()
        if not latest_report:
            latest_report = Report.objects.create(user=request.user, date=today)
        
        if has_consistent_low_pain(instance):
            new_user_exercise = increase_difficulty(request.user, instance.exercise.name)

        # Retrieve the latest ReportExercise for today
        latest_report_exercise = ReportExercise.objects.filter(
            user_exercise=instance,
            report__date=today  # Filter by today's date
        ).order_by('-id').first()

        # If no report exists, create one
        if not latest_report_exercise:
            ReportExercise.objects.create(
                report=latest_report,
                user_exercise=instance,
                completed_sets=completed_sets,
                completed_reps=completed_reps,
                pain_level=instance.pain_level,
            )
        else:
            # Update the latest report exercise with the completed sets and reps
            latest_report_exercise.completed_sets = completed_sets
            latest_report_exercise.completed_reps = completed_reps
            latest_report_exercise.pain_level = instance.pain_level
            latest_report_exercise.save()
        

        # Add the new UserExercise to the Report's exercises_completed
        if completed:
            instance.pain_level = updated_pain_level
            instance.completed = completed
            instance.is_active = True
            instance.save()
            latest_report.exercises_completed.add(instance)
        if new_user_exercise:
            if new_user_exercise.completed:
                latest_report.exercises_completed.add(new_user_exercise)
            # Mark the old UserExercise as inactive
            instance.is_active = False
            instance.save()


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
        instance = self.get_object()
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

            user_exercise = UserExercise.objects.get(id=user_exercise_id)
            latest_report_exercise = ReportExercise.objects.filter(user_exercise = user_exercise).order_by('-id').first()
            exercise_pain_level = latest_report_exercise.pain_level


            # If no report exists, create one
            if not latest_report_exercise:
                ReportExercise.objects.create(
                    report=instance,
                    user_exercise=user_exercise,
                    pain_level=user_exercise.pain_level,
                )
            else:
                # Update the latest report exercise with the completed sets and reps
                latest_report_exercise.pain_level = user_exercise.pain_level
                latest_report_exercise.save()

            # Add the UserExercise to the Report's exercises_completed
            report.exercises_completed.add(user_exercise)

            # Accumulate pain level for average calculation
            total_pain_level += exercise_pain_level

            # Update exercise level based on pain level
            if update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name) is not None:
                user_exercise = update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name)

            if has_consistent_low_pain(user_exercise):
                if increase_difficulty(request.user, user_exercise.exercise.name) is not None:
                    user_exercise = increase_difficulty(request.user, user_exercise.exercise.name)
            
            # Add the UserExercise to the Report's exercises_completed
            instance.exercises_completed.add(user_exercise)
            user_exercise.is_active = True
            user_exercise.save()
            
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
        for exercise_data in exercises_completed_data:

            
            user_exercise = UserExercise.objects.get(id=exercise_data)
            user_exercise.is_active = False
            user_exercise.save()
            instance.exercises_completed.remove(user_exercise)
            exercise_pain_level = user_exercise.pain_level

            if not instance.exercises_completed.filter(id=user_exercise.id).exists():
                latest_report_exercise = ReportExercise.objects.filter(user_exercise = user_exercise).order_by('-id').first()

                # If no report exists, create one
                if not latest_report_exercise:
                    ReportExercise.objects.create(
                        report=instance,
                        user_exercise=user_exercise,
                        pain_level=user_exercise.pain_level,
                    )
                else:
                    # Update the latest report exercise with the completed sets and reps
                    latest_report_exercise.pain_level = user_exercise.pain_level
                    latest_report_exercise.save()

            # Accumulate pain level for average calculation
            total_pain_level += exercise_pain_level

            # Update exercise level based on pain level
            if update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name) is not None:
                user_exercise = update_exercise_level_based_on_pain(request.user, exercise_pain_level, user_exercise.exercise.name)

            if has_consistent_low_pain(user_exercise): 
                if increase_difficulty(request.user, user_exercise.exercise.name) is not None:
                    user_exercise = increase_difficulty(request.user, user_exercise.exercise.name)
            
            # Add the UserExercise to the Report's exercises_completed
            instance.exercises_completed.add(user_exercise)
            user_exercise.is_active = True
            user_exercise.save()
            
        # Calculate average pain level for the report
        if num_exercises > 0:
            average_pain_level = total_pain_level / num_exercises
            instance.pain_level = average_pain_level  # Update report's pain level with the average
            instance.save()


        return Response(serializer.data)