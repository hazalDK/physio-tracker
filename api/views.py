import json
import os
import openai
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from .models import ReportExercise, User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType
from .serializers import (
    ReportExerciseSerializer, UserSerializer, ExerciseSerializer, ExerciseCategorySerializer,
    UserExerciseSerializer, ReportSerializer, InjuryTypeSerializer
)


# Set up OpenAI API key
openai.api_key = os.environ.get('OPENAI_API_KEY') 

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot(request):
    """
    Chatbot endpoint to interact with OpenAI's GPT-4 model.
    It processes user messages, retrieves exercise and report data, and generates a response.
    The response is based on the user's injury type, exercise history, and recent reports.
    """
    # Check if the OpenAI API key is set
    if openai.api_key is None:
        return Response({'message': 'OpenAI API key is not set.', 'status': 'error'}, status=500)
    try:
        user_message = request.data.get('message', '')
        exercise_context_json = request.data.get('exerciseContext', '{}')
        exercise_context = json.loads(exercise_context_json)

        user = request.user

        user_exercises = UserExercise.objects.filter(user=user, is_active=True)
        recent_reports = Report.objects.filter(user=user).order_by('-date')[:5]

        exercises_info = [
            {
                'name': ue.exercise.name,
                'category': ue.exercise.category.name,
                'difficulty': ue.exercise.difficulty_level,
                'sets': ue.sets,
                'reps': ue.reps,
                'pain_level': ue.pain_level,
                'completed': ue.completed
            }
            for ue in user_exercises
        ]

        reports_info = [
            {
                'date': report.date.strftime('%Y-%m-%d'),
                'pain_level': report.pain_level,
                'notes': report.notes
            }
            for report in recent_reports
        ]

        system_prompt = f"""
        You are a physiotherapy assistant AI for a rehabilitation app. Keep all responses brief and focused.

        GUIDELINES:
        1. Keep responses under 100 words
        2. Be encouraging but concise
        3. Focus on the most important safety points only
        4. Tailor brief suggestions to the user's pain level and exercise history
        5. Never diagnose
        6. If needed, briefly recommend seeking professional help

        USER PROFILE:
        - Injury: {user.injury_type.name if user.injury_type else "Not specified"}
        - Exercises: {json.dumps(exercises_info)}
        - Reports: {json.dumps(reports_info)}
        - Exercise Context: {json.dumps(exercise_context)}
        """

        # -- Chat Memory: Pull from session or init --
        if 'chat_history' not in request.session:
            request.session['chat_history'] = []

        chat_history = request.session['chat_history']

        # Build message history: system + chat memory + new user message
        messages = [{"role": "system", "content": system_prompt}]
        messages += chat_history
        messages.append({"role": "user", "content": user_message})

        # Call OpenAI
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        ai_message = response.choices[0].message.content

        # Update chat history in session
        chat_history.append({"role": "user", "content": user_message})
        chat_history.append({"role": "assistant", "content": ai_message})
        request.session['chat_history'] = chat_history

        return Response({'message': ai_message, 'status': 'success'})

    except Exception as e:
        import traceback
        print("Chatbot error:", str(e))
        traceback.print_exc()  


        return Response({'message': f"Sorry, error: {str(e)}", 'status': 'error'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_chat_history(request):
    """
    Reset the chat history for the user, clearing the session data.
    """
    request.session['chat_history'] = []
    return Response({'message': 'Chat history reset.'})

def update_exercise_level_based_on_pain(user, pain_level, exercise_name):
    """
    Update exercise level based on pain level.
    Creates a new UserExercise instance with the updated exercise difficulty.
    Returns special flag 'consider_removal' if a beginner exercise causes high pain.
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
                            # If pain level is high on beginner exercise, consider removal
                            return "consider_removal"

            except Exercise.DoesNotExist as e:
                print(e)
                return None

            # Create a new UserExercise instance with the updated exercise
            if new_exercise:
                user_exercises = UserExercise.objects.filter(user=user, exercise=new_exercise)
                if user_exercises.exists():
                    new_user_exercise = user_exercises.first()
                    new_user_exercise.pain_level = 0
                    new_user_exercise.completed = False
                    new_user_exercise.is_active = True
                    new_user_exercise.date_deactivated = None
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
                return new_user_exercise
            return None
    
def has_consistent_low_pain(user_exercise, num_reports=3, max_pain_level=4):
    """
    Check if the user has consistent low pain levels in their recent reports.
    """
    # Retrieve all ReportExercise entries for the given report and user_exercise
    all_reports = ReportExercise.objects.filter(
        user_exercise=user_exercise,  
    ).order_by('-id') 

    # Retrieve the most recent `num_reports`
    recent_reports = all_reports[:num_reports]

    # Ensure there are enough reports
    if len(recent_reports) < num_reports:
        print(f"Not enough reports. Expected {num_reports}, found {len(recent_reports)}")
        return False
    
    # Check if all recent reports have pain levels below or equal to the threshold
    return all(report.pain_level < max_pain_level for report in recent_reports)

def increase_difficulty(user, exercise_name):
    """
    Increase the difficulty level of the exercise for the user.
    """
    # Initialise new_user_exercise to None
    new_user_exercise = None
    
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
                user_exercises = UserExercise.objects.filter(user=user, exercise=new_exercise)
                if user_exercises.exists():
                    new_user_exercise = user_exercises.first()
                    new_user_exercise.pain_level = 0
                    new_user_exercise.completed = False
                    new_user_exercise.is_active = True
                    new_user_exercise.date_deactivated = None
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
            else:
                # If no new exercise (already at max difficulty), return the current one
                new_user_exercise = user_exercise

            return new_user_exercise
    
    # Return None if the exercise was not found
    return None
    
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model.
    Provides endpoints for user registration, profile retrieval, password update and active exercises.
    """
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
        """
        Register a new user and return JWT tokens with the user data.
        """
        errors = {}
        
        # Check if email exists in request and validate it's not already in use
        if 'email' in request.data:
            new_email = request.data.get('email')
            # Get the User model
            User = get_user_model()
            if User.objects.filter(email=new_email).exists():
                errors['email'] = ["This email address is already in use."]
        
        # Return errors if any validation failed
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        
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
    def update_profile(self, request):
        """
        Update the profile of the authenticated user.
        """
        user = request.user
        errors = {}
        
        # Check if username is being updated and validate
        if 'username' in request.data:
            new_username = request.data.get('username')
            # Check if the username is different from current and already exists
            if new_username != user.username:
                # Get the User model
                User = get_user_model()
                if User.objects.filter(username=new_username).exists():
                    errors['username'] = ["This username is already taken."]
        
        # Check if email is being updated and validate
        if 'email' in request.data:
            new_email = request.data.get('email')
            # Check if the email is different from current and already exists
            if new_email != user.email:
                # Get the User model
                User = get_user_model()
                if User.objects.filter(email=new_email).exists():
                    errors['email'] = ["This email address is already in use."]
        
        # Return errors if any validation failed
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Proceed with update if validations pass
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['PUT'])
    def update_password(self, request):
        """
        Update the password for the authenticated user.
        Requires current password and new password.
        """
        # Get the currently authenticated user
        user = request.user 
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
        if request.user.is_authenticated:
            active_user_exercises = UserExercise.objects.filter(
                user=request.user, 
                is_active=True
            ).select_related('exercise')
            
            active_exercises = [ue.exercise for ue in active_user_exercises]
            # Pass the request in the context
            serializer = ExerciseSerializer(active_exercises, many=True, context={'request': request})
            return Response(serializer.data)
        return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['GET'])
    def inactive_exercises(self, request):
        """Get only inactive exercises for the current user"""
        if request.user.is_authenticated:
            inactive_user_exercises = UserExercise.objects.filter(
                user=request.user, 
                is_active=False
            ).select_related('exercise')
            
            inactive_exercises = [ue.exercise for ue in inactive_user_exercises]
            # Pass the request in the context
            serializer = ExerciseSerializer(inactive_exercises, many=True, context={'request': request})
            return Response(serializer.data)
        return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)


class InjuryTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for InjuryType model.
    Provides endpoints for listing and retrieving injury types.
    """
    permission_classes =[AllowAny]
    queryset = InjuryType.objects.all()
    serializer_class = InjuryTypeSerializer

class ReportExerciseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ReportExercise model.
    Provides endpoints for listing and retrieving report exercises.
    """
    queryset = ReportExercise.objects.all()
    serializer_class = ReportExerciseSerializer

class ExerciseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Exercise model.
    Provides endpoints for listing and retrieving exercises.
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

class ExerciseCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ExerciseCategory model.
    Provides endpoints for listing and retrieving exercise categories.
    """
    queryset = ExerciseCategory.objects.all()
    serializer_class = ExerciseCategorySerializer

class UserExerciseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserExercise model.
    Provides endpoints for listing, creating, and updating user exercises.
    """
    queryset = UserExercise.objects.all()
    serializer_class = UserExerciseSerializer

    def get_queryset(self):
        base_qs = UserExercise.objects.filter(user=self.request.user)
        self.reset_user_exercises()
        return base_qs
    
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
        Override update method to update UserExercise and create/update Report
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Get the updated data
        completed = serializer.validated_data.get('completed', instance.completed)
        completed_sets = serializer.validated_data.get('sets', instance.sets)
        completed_reps = serializer.validated_data.get('reps', instance.reps)
        updated_pain_level = serializer.validated_data.get('pain_level', instance.pain_level)
        
        # Update the UserExercise instance
        instance.completed = completed
        instance.pain_level = updated_pain_level
        instance.save()

        # Initialise flags for potential actions
        should_decrease = False
        should_increase = False
        should_remove = False

        # If the exercise is marked as completed, create/update the Report
        if completed:
            # Get today's date
            today = timezone.now().date()
            
            # Get or create Report for today
            report, created = Report.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={
                    'pain_level': updated_pain_level,
                    'notes': ''
                }
            )
            
            # Create or update the ReportExercise entry
            report_exercise, re_created = ReportExercise.objects.update_or_create(
                report=report,
                user_exercise=instance,
                defaults={
                    'completed_sets': completed_sets,
                    'completed_reps': completed_reps,
                    'pain_level': updated_pain_level
                }
            )
            
            # Check pain level and difficulty conditions but only set flags
            if updated_pain_level >= 4:
                if instance.exercise.difficulty_level == "Beginner":
                    should_remove = True
                else:
                    should_decrease = True
            elif has_consistent_low_pain(instance):
                if instance.exercise.difficulty_level != "Advanced":
                    should_increase = True
            
            # Recalculate the report's overall pain level (average across all exercises)
            report_exercises = report.report_exercises.all()
            if report_exercises.exists():
                avg_pain = sum(re.pain_level for re in report_exercises) / report_exercises.count()
                report.pain_level = avg_pain
                report.save()

        # Return the serialized data with flags for potential actions
        return Response({
            **serializer.data,
            'should_decrease': should_decrease,
            'should_increase': should_increase,
            'should_remove': should_remove
        })
        
    @action(detail=True, methods=['POST'])
    def confirm_increase(self, request, pk=None):
        user_exercise = self.get_object()
        
        # Check if user confirmed
        if request.data.get('confirm') == 'yes':
            # Get the current exercise and increase difficulty
            increased_exercise = increase_difficulty(
                request.user,
                user_exercise.exercise.name
            )
            
            if increased_exercise:
                # Mark the old exercise as inactive
                user_exercise.is_active = False
                user_exercise.save()
                
                serializer = self.get_serializer(increased_exercise)
                return Response({
                    'message': "Exercise difficulty increased successfully",
                    'user_exercise': serializer.data
                })
            else:
                return Response({
                    'message': "Already at maximum difficulty level",
                    'user_exercise': self.get_serializer(user_exercise).data
                })
        else:
            return Response({
                'message': "Increase cancelled",
                'user_exercise': self.get_serializer(user_exercise).data
            })

    @action(detail=True, methods=['POST'])
    def confirm_decrease(self, request, pk=None):
        user_exercise = self.get_object()
        
        # Check if user confirmed
        if request.data.get('confirm') == 'yes':
            # Get the current exercise and decrease difficulty
            decreased_exercise = update_exercise_level_based_on_pain(
                request.user,
                user_exercise.pain_level,
                user_exercise.exercise.name
            )
            
            if decreased_exercise:
                # Mark the old exercise as inactive
                user_exercise.is_active = False
                user_exercise.save()
                
                serializer = self.get_serializer(decreased_exercise)
                return Response({
                    'message': "Exercise difficulty decreased successfully",
                    'user_exercise': serializer.data
                })
            else:
                return Response({
                    'message': "Already at minimum difficulty level",
                    'user_exercise': self.get_serializer(user_exercise).data
                })
        else:
            return Response({
                'message': "Decrease cancelled",
                'user_exercise': self.get_serializer(user_exercise).data
            
            })

    @action(detail=True, methods=['POST'])
    def confirm_removal(self, request, pk=None):
        """
        Endpoint to handle removal of exercises that cause pain even at beginner level.
        """
        # Gets the UserExercise instance
        user_exercise = self.get_object()
        
        # Checks if user confirmed
        if request.data.get('confirm') == 'yes':
            # Marks the exercise as inactive
            user_exercise.is_active = False
            user_exercise.save()
            
            return Response({
                'message': "Exercise removed from your routine due to high pain level. Please consult your healthcare provider.",
                'removed': True
            })
        else:
            # If the user opts to keep the exercise it returns a message
            return Response({
                'message': "Exercise kept in your routine. Consider modifying how you perform it or consulting your healthcare provider.",
                'removed': False
            })  
          
    @action(detail=True, methods=['PUT'])
    def remove_exercise(self, request, pk=None):
        """
        Endpoint to remove an exercise from the user's routine.
        """
        user_exercise = self.get_object()
        
        # Mark the exercise as inactive
        user_exercise.is_active = False
        user_exercise.date_deactivated = timezone.now()
        user_exercise.save()
        
        return Response({
            'message': "Exercise removed from your routine.",
            'removed': True
        })
    
    @action(detail=True, methods=['PUT'])
    def reactivate_exercise(self, request, pk=None):
        """
        Endpoint to add a removed exercise back to the user's routine.
        Ensures only one exercise per category at a given difficulty level.
        """
        user_exercise = self.get_object()
        
        # Check if there's already an active exercise of the same category and difficulty
        existing_exercise = UserExercise.objects.filter(
            user=request.user,
            exercise__category=user_exercise.exercise.category,
            is_active=True
        ).first()
        
        if existing_exercise:
            return Response({
                'message': f"You already have an active {user_exercise.exercise.difficulty_level} exercise in the {user_exercise.exercise.category.name} category.",
                'added': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Marks the exercise as active again
        user_exercise.is_active = True
        user_exercise.date_deactivated = None
        user_exercise.save()
        
        return Response({
            'message': "Exercise added back to your routine.",
            'added': True
        })

    def reset_user_exercises(self):
        """
        Reset the UserExercise instances for the user if it's a new day (midnight has passed)
        since the last reset.
        """
        now = timezone.now()
        today = now.date()

        user = self.request.user
        
        if user.last_reset is None or user.last_reset.date() < today:
            # Reset completed and pain_level for the user's active exercises
            UserExercise.objects.filter(user=user).update(completed=False, pain_level=0)
            user.last_reset = now
            user.save()

class ReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Report model.
    Provides endpoints for listing, creating, and updating reports.
    """
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
        num_exercises = 0

        # Handle both string and list formats
        if isinstance(exercises_completed_data, str):
            try:
                # Try to parse as JSON if it's a string
                import json
                exercises_ids = json.loads(exercises_data)
            except json.JSONDecodeError:
                # If not valid JSON, try to evaluate it as a Python literal (list)
                try:
                    import ast
                    exercises_ids = ast.literal_eval(exercises_completed_data)
                except (ValueError, SyntaxError):
                    # If that fails too, try to split it if it's a comma-separated string
                    exercises_ids = [id.strip() for id in exercises_completed_data.split(',')]
        else:
            exercises_ids = exercises_completed_data
        
        
        # Ensure we have a list of integers
        if isinstance(exercises_ids, list):
            processed_ids = []
            for id_item in exercises_ids:
                if isinstance(id_item, (int, str)):
                    try:
                        processed_ids.append(int(id_item))  # Convert to integer
                    except ValueError:
                        print(f"Could not convert {id_item} to integer")
                elif isinstance(id_item, dict) and 'id' in id_item:
                    try:
                        processed_ids.append(int(id_item['id']))
                    except ValueError:
                        print(f"Could not convert {id_item['id']} to integer")
        else:
            # Handle single integer case
            try:
                processed_ids = [int(exercises_ids)]
            except (ValueError, TypeError):
                print(f"Could not process exercises_ids: {exercises_ids}")
                processed_ids = []

        # Handle both string and list formats
        for exercise_id in processed_ids:
            try:
                # Get the UserExercise instance
                user_exercise = UserExercise.objects.get(id=exercise_id, user=request.user)  # Ensure exercise belongs to current user
                
                # Check if the exercise belongs to the current user
                latest_report_exercise = ReportExercise.objects.filter(
                    user_exercise=user_exercise
                ).order_by('-id').first()
                
                # Default exercise pain level
                exercise_pain_level = user_exercise.pain_level
                
                # If report exercise exists, get its pain level
                if latest_report_exercise:
                    exercise_pain_level = latest_report_exercise.pain_level
                    
                    # Update the latest report exercise
                    latest_report_exercise.pain_level = user_exercise.pain_level
                    latest_report_exercise.save()
                else:
                    # Create a new report exercise
                    ReportExercise.objects.create(
                        report=report,  # ISSUE 4: Was using 'instance' instead of 'report'
                        user_exercise=user_exercise,
                        pain_level=user_exercise.pain_level,
                        completed_sets=user_exercise.sets,  # ISSUE 5: Missing these fields
                        completed_reps=user_exercise.reps
                    )

                # Add the UserExercise to the Report's exercises_completed
                report.exercises_completed.add(user_exercise)  # ISSUE 6: Was using 'instance' in some places

                # Accumulate pain level for average calculation
                total_pain_level += exercise_pain_level
                num_exercises += 1 
                
            except UserExercise.DoesNotExist:
                continue  # Skip if exercise not found
        
        # Calculate average pain level for the report
        if num_exercises > 0:
            average_pain_level = total_pain_level / num_exercises
            report.pain_level = average_pain_level
            report.save()

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
        
        # Get exercises_completed data with proper handling
        exercises_data = request.data.get('exercises_completed', [])
        
        # Handle both string and list formats
        if isinstance(exercises_data, str):
            try:
                # Try to parse as JSON if it's a string
                import json
                exercises_ids = json.loads(exercises_data)
            except json.JSONDecodeError:
                # If not valid JSON, try to evaluate it as a Python literal (list)
                try:
                    import ast
                    exercises_ids = ast.literal_eval(exercises_data)
                except (ValueError, SyntaxError):
                    # If that fails too, try to split it if it's a comma-separated string
                    exercises_ids = [id.strip() for id in exercises_data.split(',')]
        else:
            exercises_ids = exercises_data
        
        
        # Ensure we have a list of integers
        if isinstance(exercises_ids, list):
            processed_ids = []
            for id_item in exercises_ids:
                if isinstance(id_item, (int, str)):
                    try:
                        processed_ids.append(int(id_item))  # Convert to integer
                    except ValueError:
                        print(f"Could not convert {id_item} to integer")
                elif isinstance(id_item, dict) and 'id' in id_item:
                    try:
                        processed_ids.append(int(id_item['id']))
                    except ValueError:
                        print(f"Could not convert {id_item['id']} to integer")
        else:
            # Handle single integer case
            try:
                processed_ids = [int(exercises_ids)]
            except (ValueError, TypeError):
                print(f"Could not process exercises_ids: {exercises_ids}")
                processed_ids = []

        
        # Initialise pain calculation
        total_pain_level = instance.pain_level * instance.exercises_completed.count()
        num_exercises = instance.exercises_completed.count()
        
        # Now process each exercise with the properly processed IDs
        for exercise_id in processed_ids:
            try:
                user_exercise = UserExercise.objects.get(
                    id=exercise_id,
                    user=request.user  # Ensure exercise belongs to current user
                )
                
                
                # Remove from report if present
                if instance.exercises_completed.filter(id=user_exercise.id).exists():
                    instance.exercises_completed.remove(user_exercise)
                
                # Get pain level from exercise
                exercise_pain_level = user_exercise.pain_level
                
                # Handle report exercise record
                report_exercise, created = ReportExercise.objects.update_or_create(
                    report=instance,
                    user_exercise=user_exercise,
                    defaults={
                        'pain_level': user_exercise.pain_level,
                        'completed_sets': user_exercise.sets,
                        'completed_reps': user_exercise.reps
                    }
                )
                
                # Accumulate pain level
                total_pain_level += exercise_pain_level
                
                # Update exercise level based on pain
                updated_exercise = update_exercise_level_based_on_pain(
                    request.user,
                    exercise_pain_level,
                    user_exercise.exercise.name
                )
                
                # Check for difficulty increase
                if has_consistent_low_pain(user_exercise):
                    increased_exercise = increase_difficulty(
                        request.user,
                        user_exercise.exercise.name
                    )
                    updated_exercise = increased_exercise or updated_exercise
                
                # Add the updated exercise to report if its updated
                if updated_exercise:
                    instance.exercises_completed.add(updated_exercise)
                    updated_exercise.is_active = True
                    updated_exercise.save()
                    
            except UserExercise.DoesNotExist:
                print(f"UserExercise {exercise_id} not found or doesn't belong to user")
                continue
        
        # Calculate average pain if we have exercises
        if num_exercises > 0:
            instance.pain_level = total_pain_level / num_exercises
            instance.save()

        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def adherence_stats(self, request):
        try:
            user = request.user
            
            # Get end date from params or use today
            end_date_str = request.query_params.get('end_date')
            if end_date_str:
                try:
                    end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError:
                    end_date = timezone.now().date()
            else:
                end_date = timezone.now().date()
            
            # Get last 7 days from the end date
            start_date = end_date - timedelta(days=6)
            date_range = [(start_date + timedelta(days=i)) for i in range(7)]
            
            # Initialise data structure
            daily_adherence = {date: {'completed': 0, 'total': 0} for date in date_range}
            
            # Get all reports in date range
            reports = Report.objects.filter(
                user=user,
                date__gte=start_date,
                date__lte=end_date
            ).prefetch_related('exercises_completed', 'report_exercises')

            # Get all user exercises that were active at any point during the date range
            all_user_exercises = UserExercise.objects.filter(
                user=user,
                date_activated__lte=end_date,
            ).filter(
                Q(date_deactivated__isnull=True) | 
                Q(date_deactivated__gt=start_date)
            ).select_related('exercise')

            # For each day in date range, determine which exercises were active
            for date in date_range:
                # Get exercises active on this date
                active_exercises = [
                    ue for ue in all_user_exercises 
                    if ue.date_activated <= date and 
                    (ue.date_deactivated is None or ue.date_deactivated > date)
                ]
                
                daily_adherence[date]['total'] = len(active_exercises)
                
                # Get report for this date if exists
                day_report = next((r for r in reports if r.date == date), None)
                if day_report:
                    # Only count completed exercises that were active on this date
                    report_exercises = ReportExercise.objects.filter(report=day_report)
                    completed_count = 0
                    
                    for report_exercise in report_exercises:
                        user_exercise = report_exercise.user_exercise
                        # Check if this exercise was active on this date
                        if (user_exercise.date_activated <= date and 
                            (user_exercise.date_deactivated is None or user_exercise.date_deactivated > date)):
                            completed_count += 1
                    
                    daily_adherence[date]['completed'] = completed_count

            # Calculate percentages and format for chart
            labels = []
            data = []
            
            for date in date_range:
                day_name = date.strftime('%a')
                labels.append(day_name)
                
                if daily_adherence[date]['total'] > 0:
                    percentage = (daily_adherence[date]['completed'] / daily_adherence[date]['total']) * 100
                    percentage = min(percentage, 100)  # Cap at 100%
                else:
                    percentage = 0
                    
                data.append(round(percentage))

            # Calculate overall average
            completed_sum = sum(day['completed'] for day in daily_adherence.values())
            total_sum = sum(day['total'] for day in daily_adherence.values() if day['total'] > 0)
            
            if total_sum > 0:
                average_adherence = (completed_sum / total_sum) * 100
                average_adherence = min(average_adherence, 100)
            else:
                average_adherence = 0
            
            # Get exercise history for the week
            history = []
            week_reports = Report.objects.filter(
                user=user,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('-date')
            
            for report in week_reports:
                report_date = report.date
                
                # Find active exercises for this date
                active_exercises = [
                    ue for ue in all_user_exercises 
                    if ue.date_activated <= report_date and 
                    (ue.date_deactivated is None or ue.date_deactivated > report_date)
                ]
                total_exercises = len(active_exercises)
                
                # Only count completed exercises that were active on this date
                report_exercises = ReportExercise.objects.filter(report=report)
                completed_count = 0
                
                for report_exercise in report_exercises:
                    user_exercise = report_exercise.user_exercise
                    # Check if this exercise was active on this date
                    if (user_exercise.date_activated <= report_date and 
                        (user_exercise.date_deactivated is None or user_exercise.date_deactivated > report_date)):
                        completed_count += 1
                
                if total_exercises > 0:
                    adherence = (completed_count / total_exercises) * 100
                    adherence = min(adherence, 100)
                else:
                    adherence = 0
                    
                history.append({
                    'date': report_date.strftime('%A, %B %d'),
                    'completed': f"{completed_count}/{total_exercises}",
                    'adherence': round(adherence)
                })
            
            # Format response for chart
            response_data = {
                'chart_data': {
                    'labels': labels,
                    'datasets': [{'data': data}]
                },
                'average_adherence': round(average_adherence, 1),
                'history': history
            }
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            print(f"Adherence stats error: {str(e)}")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'])
    def pain_stats(self, request):
        try:
            user = request.user
            
            # Get end date from params or use today
            end_date_str = request.query_params.get('end_date')
            if end_date_str:
                try:
                    end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
                except ValueError:
                    end_date = timezone.now().date()
            else:
                end_date = timezone.now().date()
            
            # Get last 7 days from the end date
            start_date = end_date - timedelta(days=6)
            date_range = [(start_date + timedelta(days=i)) for i in range(7)]
            
            # Initialise data structure
            daily_pain = {date: {'total_pain': 0, 'count': 0, 'total_exercises': 0} for date in date_range}
            
            # Get all reports in date range
            reports = Report.objects.filter(
                user=user,
                date__gte=start_date,
                date__lte=end_date
            ).prefetch_related('report_exercises')

            # Get all user exercises regardless of active status
            all_user_exercises = UserExercise.objects.filter(
                user=user
            ).select_related('exercise')

            # Calculate daily pain levels considering ALL completed exercises
            for report in reports:
                report_date = report.date
                if report_date in daily_pain:
                    # Get all exercises completed in this report
                    report_exercises = ReportExercise.objects.filter(report=report)
                    
                    # Calculate total active exercises for context
                    active_exercises = [
                        ue.id for ue in all_user_exercises 
                        if ue.date_activated <= report_date and 
                        (ue.date_deactivated is None or ue.date_deactivated > report_date)
                    ]
                    daily_pain[report_date]['total_exercises'] = len(active_exercises)
                    
                    # Use all report exercises for pain calculation, not just active ones
                    pain_sum = sum(re.pain_level for re in report_exercises)
                    count = report_exercises.count()
                    
                    if count > 0:
                        daily_pain[report_date]['total_pain'] = pain_sum
                        daily_pain[report_date]['count'] = count
            
            # Calculate averages and format for chart
            labels = []
            data = []
            
            for date in date_range:
                day_name = date.strftime('%a')
                labels.append(day_name)
                
                if daily_pain[date]['count'] > 0:
                    avg_pain = daily_pain[date]['total_pain'] / daily_pain[date]['count']
                else:
                    avg_pain = 0
                    
                data.append(round(avg_pain, 1))
            
            # Calculate overall average pain
            total_pain_sum = sum(day['total_pain'] for day in daily_pain.values())
            total_count = sum(day['count'] for day in daily_pain.values())
            
            if total_count > 0:
                average_pain = total_pain_sum / total_count
            else:
                average_pain = 0
            
            # Get pain history
            history = []
            week_reports = Report.objects.filter(
                user=user,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('-date')

            for report in week_reports:
                report_date = report.date

                # Get active exercises for report date (for context)
                active_exercises = [
                    ue.id for ue in all_user_exercises 
                    if ue.date_activated <= report_date and 
                    (ue.date_deactivated is None or ue.date_deactivated >= report_date)
                ]
                
                # Get ALL report exercises regardless of active status
                report_exercises = ReportExercise.objects.filter(report=report)
                completed_all = report_exercises.count()

                avg_pain = report.pain_level if report.pain_level is not None else 0

                history.append({
                    'date': report_date.strftime('%A, %B %d'),
                    'exercises': completed_all, 
                    'pain_level': round(avg_pain, 1)
                })
            
            # Format response
            response_data = {
                'chart_data': {
                    'labels': labels,
                    'datasets': [{'data': data}]
                },
                'average_pain': round(average_pain, 1),
                'history': history
            }
            
            return Response(response_data)
        
        except Exception as e:
            import traceback
            print(f"Pain stats error: {str(e)}")
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
    @action(detail=False, methods=['GET'])
    def exercise_history(self, request):
        """
        Get detailed exercise history for the authenticated user
        """
        try:
            user = request.user
                        
            # Get all reports for this user
            reports = Report.objects.filter(user=user).order_by('-date')[:10]
            
            history = []
            for report in reports:
                report_date = report.date
                report_exercises = ReportExercise.objects.filter(report=report)
                
                exercises_data = []
                for re in report_exercises:
                    exercise_name = re.user_exercise.exercise.name
                    completed_sets = re.completed_sets
                    completed_reps = re.completed_reps
                    pain_level = re.pain_level
                    
                    exercises_data.append({
                        'name': exercise_name,
                        'sets': completed_sets,
                        'reps': completed_reps,
                        'pain': pain_level
                    })
                
                history.append({
                    'date': report_date.strftime('%Y-%m-%d'),
                    'formatted_date': report_date.strftime('%A, %B %d'),
                    'exercises': exercises_data,
                    'pain_level': report.pain_level
                })
            
            return Response({'history': history})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)