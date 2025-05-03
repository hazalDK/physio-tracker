from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.db import IntegrityError

from .models import (
    User, InjuryType, Exercise, ExerciseCategory, UserExercise, 
    Report, ReportExercise
)

class ModelTests(TestCase):
    """Tests for model creation and relationships"""
    
    def setUp(self):
        # Create categories
        self.category = ExerciseCategory.objects.create(
            name="Squats",
            description="Exercises for Knee rehabilitation"
        )
        
        # Create exercises
        self.beginner_exercise = Exercise.objects.create(
            category=self.category,
            name="Beginner Squat",
            difficulty_level="Beginner",
            additional_notes="Start with small movements"
        )
        
        self.intermediate_exercise = Exercise.objects.create(
            category=self.category,
            name="Intermediate Squat",
            difficulty_level="Intermediate",
            additional_notes="Use light weights"
        )
        
        self.advanced_exercise = Exercise.objects.create(
            category=self.category,
            name="Advanced Squat",
            difficulty_level="Advanced",
            additional_notes="Full range of motion required"
        )
        
        # Create injury type
        self.injury_type = InjuryType.objects.create(
            name="Meniscus Tear",
            description="Tear in the meniscus of the knee"
        )
        self.injury_type.treatment.add(self.beginner_exercise)
        self.injury_type.save()
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="Password123!",
            first_name="Test",
            last_name="User",
            date_of_birth=timezone.now().date(),
        )

        self.user.injury_type = self.injury_type
        self.user.save()
    
    def test_exercise_category_creation(self):
        """Test ExerciseCategory model creation"""
        self.assertEqual(self.category.name, "Squats")
        self.assertEqual(self.category.slug, "squats")
    
    def test_exercise_creation(self):
        """Test Exercise model creation"""
        self.assertEqual(self.beginner_exercise.name, "Beginner Squat")
        self.assertEqual(self.beginner_exercise.difficulty_level, "Beginner")
        self.assertEqual(self.beginner_exercise.category, self.category)
    
    def test_injury_type_creation(self):
        """Test InjuryType model creation and relationship with exercises"""
        self.assertEqual(self.injury_type.name, "Meniscus Tear")
        self.assertTrue(self.beginner_exercise in self.injury_type.treatment.all())
    
    def test_user_creation(self):
        """Test User model creation and automatic full_name generation"""
        self.assertEqual(self.user.username, "testuser")
        self.assertEqual(self.user.full_name, "Test User")
        self.assertEqual(self.user.injury_type, self.injury_type)
    
    def test_user_exercise_creation(self):
        """Test UserExercise creation and relationship with User and Exercise"""
        # Check that user exercises were created from injury type
        user_exercises = UserExercise.objects.filter(user=self.user)
        self.assertTrue(user_exercises.exists())
        
        # Create additional user exercise
        user_exercise = UserExercise.objects.create(
            user=self.user,
            exercise=self.intermediate_exercise,
            sets=3,
            reps=10,
            pain_level=2
        )
        
        self.assertEqual(user_exercise.sets, 3)
        self.assertEqual(user_exercise.reps, 10)
        self.assertEqual(user_exercise.pain_level, 2)
        self.assertEqual(user_exercise.user, self.user)
        self.assertEqual(user_exercise.exercise, self.intermediate_exercise)
    
    def test_report_creation(self):
        """Test Report and ReportExercise creation"""
        # Get the user exercise
        user_exercise = UserExercise.objects.filter(user=self.user).first()
        
        # Create a report
        report = Report.objects.create(
            user=self.user,
            pain_level=3,
            notes="Feeling better today"
        )
        
        # Create report exercise
        report_exercise = ReportExercise.objects.create(
            report=report,
            user_exercise=user_exercise,
            completed_sets=3,
            completed_reps=8,
            pain_level=2
        )
        
        self.assertEqual(report.user, self.user)
        self.assertEqual(report.pain_level, 3)
        self.assertEqual(report.notes, "Feeling better today")
        self.assertEqual(report_exercise.report, report)
        self.assertEqual(report_exercise.user_exercise, user_exercise)
        self.assertEqual(report_exercise.completed_sets, 3)
        self.assertEqual(report_exercise.completed_reps, 8)
        self.assertEqual(report_exercise.pain_level, 2)

class JWTAuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        self.token_url = reverse('token_obtain_pair')
        
        # Get initial tokens
        response = self.client.post(self.token_url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.access_token = response.data['access']
        self.refresh_token = response.data['refresh']
    
    def test_token_refresh(self):
        """Test that refresh token generates new access token"""
        url = reverse('token_refresh')
        response = self.client.post(url, {
            'refresh': self.refresh_token
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        
        # New access token should be different
        self.assertNotEqual(response.data['access'], self.access_token)
    
    def test_token_obtain_pair_endpoint(self):
        """Test the token obtain pair endpoint"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data['refresh'], None)
        self.assertNotEqual(response.data['access'], None)

class APITests(APITestCase):
    """Tests for API endpoints"""
    
    def setUp(self):
                # Create categories
        self.category = ExerciseCategory.objects.create(
            name="Squats",
            description="Exercises for Knee rehabilitation"
        )
        
        # Create exercises
        self.beginner_exercise = Exercise.objects.create(
            category=self.category,
            name="Beginner Squat",
            difficulty_level="Beginner",
            additional_notes="Start with small movements"
        )
        
        self.intermediate_exercise = Exercise.objects.create(
            category=self.category,
            name="Intermediate Squat",
            difficulty_level="Intermediate",
            additional_notes="Use light weights"
        )
        
        self.advanced_exercise = Exercise.objects.create(
            category=self.category,
            name="Advanced Squat",
            difficulty_level="Advanced",
            additional_notes="Full range of motion required"
        )
        
        # Create injury type
        self.injury_type = InjuryType.objects.create(
            name="Meniscus Tear",
            description="Tear in the meniscus of the knee"
        )
        self.injury_type.treatment.add(self.beginner_exercise)
        self.injury_type.save()
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="Password123!",
            first_name="Test",
            last_name="User",
            date_of_birth=timezone.now().date(),
        )

        self.user.injury_type = self.injury_type
        self.user.save()
        
        # Set up client and authentication
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    
    def test_user_profile_endpoint(self):
        """Test the user profile endpoint"""
        url = reverse('user-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['first_name'], 'Test')
        self.assertEqual(response.data['last_name'], 'User')
        self.assertEqual(response.data['injury_type'], self.injury_type.id)
    
    def test_user_active_exercises_endpoint(self):
        """Test the user active exercises endpoint"""
        url = reverse('user-active-exercises')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
    
    def test_user_inactive_exercises_endpoint(self):
        """Test the user inactive exercises endpoint"""
        user_exercise = UserExercise.objects.create(
            user=self.user,
            exercise=self.intermediate_exercise,
            sets=3,
            reps=10,
            pain_level=0,
            is_active=False,
            completed=False
        )
        user_exercise.save()

        url = reverse('user-inactive-exercises')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
    
    def test_user_register_endpoint(self):
        """Test the user registration endpoint"""
        url = reverse('user-register')
        data = {
            'username': 'newuser',
            'email': 'newUser@test.com',
            'password': 'Password123!',
            'first_name': 'New',
            'last_name': 'User',
            'date_of_birth': '1990-01-01',
            'injury_type': self.injury_type.id
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data['refresh'], None)
        self.assertNotEqual(response.data['access'], None)
        self.assertEqual(response.data['user']['username'], 'newuser')
        self.assertEqual(response.data['user']['email'], 'newUser@test.com')
        self.assertEqual(response.data['user']['first_name'], 'New')
        self.assertEqual(response.data['user']['last_name'], 'User')
        self.assertEqual(response.data['user']['date_of_birth'], '1990-01-01')
        self.assertEqual(response.data['user']['injury_type'], self.injury_type.id)
        self.assertEqual(response.data['user']['exercises'], [1]) 
    
    def test_user_register_invalid_data(self):
        """Test the user registration endpoint with invalid data"""
        url = reverse('user-register')
        data = {
            'username': 'newuser',
            'email': 'invalid-email',
            'password': 'short',
            'first_name': 'New',    
            'last_name': 'User',
            'date_of_birth': '1990-01-01',
            'injury_type': self.injury_type.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertIn('Enter a valid email address.', response.data['email'])

    def test_update_profile(self):
        """Test updating user profile"""
        url = reverse('user-update-profile')
        self.client.force_authenticate(user=self.user)
        
        # Original values for comparison
        original_first_name = self.user.first_name
        original_last_name = self.user.last_name
        
        # Test data - only changing first name
        data = {
            'first_name': 'Updated',
        }

        response = self.client.put(url, data, format='json')
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        
        # Check changed field
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(response.data['first_name'], 'Updated')
        
        # Check unchanged field
        self.assertEqual(self.user.last_name, original_last_name)
        
        # Verify response contains all profile fields
        self.assertIn('email', response.data)
        self.assertIn('username', response.data)
    
    
    def test_update_password_wrong_current_password(self):
        url = reverse('user-update-password')
        self.client.force_authenticate(user=self.user)
        data = {
            'current_password': 'WrongPassword!',
            'new_password': 'NewPassword123!'
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_password_missing_fields(self):
        """Test 400 when missing required fields"""
        url = reverse('user-update-password')
        self.client.force_authenticate(user=self.user)
        
        # Missing new_password
        response = self.client.put(url, {'current_password': 'Password123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing current_password
        response = self.client.put(url, {'new_password': 'NewPass123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_password(self):
        """Test 400 when current password is wrong"""
        url = reverse('user-update-password')
        self.client.force_authenticate(user=self.user)
        
        data = {
            'current_password': 'Password123!', 
            'new_password': 'NewPassword123!'
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('success', response.data)  
    
    def test_update_user_exercise_low_pain(self):
        """Test updating a user exercise"""
        user_exercise = UserExercise.objects.filter(user=self.user, is_active=True).first()
        user_exercise.completed = True
        user_exercise.save()

        url = reverse('userexercise-detail', args=[user_exercise.id])
        
        data = {
            'completed': True,
            'pain_level': 2,
            'sets': 4,
            'reps': 8
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the exercise was updated
        user_exercise.refresh_from_db()
        self.assertTrue(user_exercise.completed)
        self.assertEqual(user_exercise.pain_level, 2)
        self.assertEqual(user_exercise.sets, 4)
        self.assertEqual(user_exercise.reps, 8)
        self.assertEqual(user_exercise.date_deactivated, None)  
        self.assertEqual(user_exercise.is_active, True) 
        self.assertEqual(user_exercise.exercise, self.beginner_exercise)
        self.assertEqual(response.data['should_increase'], False) 
        self.assertEqual(response.data['should_remove'], False)  
        self.assertEqual(response.data['should_decrease'], False)  

    def test_update_user_exercise_high_pain(self):
        """Test updating a user exercise with high pain level"""
        user_exercise = UserExercise.objects.filter(user=self.user, is_active=True).first()
        user_exercise.completed = True
        user_exercise.save()

        url = reverse('userexercise-detail', args=[user_exercise.id])
        
        data = {
            'completed': True,
            'pain_level': 7,
            'sets': 4,
            'reps': 8
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the exercise was updated
        user_exercise.refresh_from_db()
        self.assertTrue(user_exercise.completed)
        self.assertEqual(user_exercise.pain_level, 7)
        self.assertEqual(user_exercise.sets, 4)
        self.assertEqual(user_exercise.reps, 8)
        self.assertEqual(user_exercise.date_deactivated, None)  
        self.assertEqual(user_exercise.is_active, True) 
        self.assertEqual(user_exercise.exercise, self.beginner_exercise) 
        self.assertEqual(response.data['should_increase'], False) 
        self.assertEqual(response.data['should_remove'], True)  
        self.assertEqual(response.data['should_decrease'], False)
    
    def test_update_user_exercise_high_pain_intermediate(self):
        """Test updating a user exercise with high pain level for intermediate exercise"""
        user_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.intermediate_exercise, 
            sets=4, 
            reps=8, 
            pain_level=0, 
            completed=False,
            is_active=True
        )

        user_exercise.completed = True
        user_exercise.save()

        url = reverse('userexercise-detail', args=[user_exercise.id])
        
        data = {
            'completed': True,
            'pain_level': 7,
            'sets': 4,
            'reps': 8
        }
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the exercise was updated
        user_exercise.refresh_from_db()
        self.assertTrue(user_exercise.completed)
        self.assertEqual(user_exercise.pain_level, 7)
        self.assertEqual(user_exercise.sets, 4)
        self.assertEqual(user_exercise.reps, 8)
        self.assertEqual(user_exercise.date_deactivated, None)  
        self.assertEqual(user_exercise.is_active, True) 
        self.assertEqual(user_exercise.exercise, self.intermediate_exercise) 
        self.assertEqual(response.data['should_increase'], False) 
        self.assertEqual(response.data['should_remove'], False)  
        self.assertEqual(response.data['should_decrease'], True)
    
    def test_remove_user_exercise(self):
        """Test removing a user exercise"""
        UserExercise.objects.get(user=self.user, exercise=self.beginner_exercise).delete() 
        user_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.beginner_exercise, 
            sets=4, 
            reps=8, 
            pain_level=0, 
            completed=False,
            is_active=True
        )

        url = reverse('userexercise-remove-exercise', args=[user_exercise.id])
        
        
        response = self.client.put(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the exercise was removed
        user_exercise.refresh_from_db()
        self.assertFalse(user_exercise.is_active)  
        self.assertEqual(user_exercise.date_deactivated, timezone.now().date())
    
    def test_reactivate_exercise(self):
        """Test adding a removed exercise back"""
        # Delete any existing beginner exercise for this user
        UserExercise.objects.filter(user=self.user, exercise=self.beginner_exercise).delete()
        
        # Create a new user exercise to simulate the removed one
        user_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.beginner_exercise, 
            sets=4, 
            reps=8, 
            pain_level=0, 
            completed=False,
            is_active=False
        )

        url = reverse('userexercise-reactivate-exercise', args=[user_exercise.id])
        response = self.client.put(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the exercise was added back
        user_exercise.refresh_from_db()
        self.assertTrue(user_exercise.is_active)  
        self.assertEqual(user_exercise.date_deactivated, None)

    def test_reactivate_exercise_category_conflict(self):
        """Test that we cannot reactivate an exercise if same category/difficulty already active"""
        # First ensure we have an active exercise
        UserExercise.objects.filter(user=self.user, exercise=self.beginner_exercise).delete()
        active_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.beginner_exercise,  # Same category and difficulty level
            sets=3, 
            reps=10, 
            pain_level=0, 
            completed=False,
            is_active=True
        )
        
        # Create another exercise with same category and difficulty but inactive
        inactive_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.intermediate_exercise,  # Using same exercise for simplicity, but could be any with same category/difficulty
            sets=4, 
            reps=8, 
            pain_level=0, 
            completed=False,
            is_active=False
        )
        
        url = reverse('userexercise-reactivate-exercise', args=[inactive_exercise.id])
        response = self.client.put(url, {}, format='json')

        # Should get bad request response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify error message contains category info
        self.assertIn("already have an active", response.data['message'])
        
        # Verify the exercise remained inactive
        inactive_exercise.refresh_from_db()
        self.assertFalse(inactive_exercise.is_active)
    
    def test_reset_user_exercise(self):
        """Test resetting a user exercise"""
        # Delete any existing beginner exercise for this user
        UserExercise.objects.filter(user=self.user, exercise=self.beginner_exercise).delete()
        
        # Create a user exercise
        user_exercise = UserExercise.objects.create(
            user=self.user,
            exercise=self.beginner_exercise,
            sets=4,
            reps=8,
            pain_level=2,  # Setting a non-zero pain level to test reset
            completed=True,  # Setting to completed to test reset
            is_active=True
        )
        
        # Set the user's last_reset to yesterday to trigger a reset
        yesterday = timezone.now() - timezone.timedelta(days=1)
        self.user.last_reset = yesterday
        self.user.save()
        
        # Get the URL for the user exercise list endpoint
        url = reverse('userexercise-list')  # Assuming you're using DRF's default router naming
        
        # Make the request to the list endpoint, which will trigger get_queryset() and the reset
        response = self.client.get(url)
        
        # Check response status
        self.assertEqual(response.status_code, 200)
        
        # Refresh the user exercise from the database
        user_exercise.refresh_from_db()
        
        # Verify the user exercise was reset
        self.assertFalse(user_exercise.completed)
        self.assertEqual(user_exercise.pain_level, 0)
        
        # Verify the user's last_reset was updated to today
        self.user.refresh_from_db()
        self.assertEqual(self.user.last_reset.date(), timezone.now().date())
        
            
    
    def test_create_report(self):
        """Test creating a report"""
        url = reverse('report-list')
        UserExercise.objects.filter(user=self.user, exercise=self.beginner_exercise).delete()  # Clear any existing user exercises
        user_exercise = UserExercise.objects.create(
            user=self.user, 
            exercise=self.beginner_exercise, 
            reps=8, 
            sets=4, 
            pain_level=3, 
            completed=True
        ) 
        
        # Use date string in ISO format (YYYY-MM-DD)
        today_str = timezone.now().date().isoformat()
        Report.objects.filter(user=self.user, date=today_str).delete()  # Clear any existing reports for the user
        
        data = {
            'user': self.user.id,
            'date': today_str,  # Using string format for date
            'notes': 'Completed exercises with minimal pain',
            'exercises_completed': [user_exercise.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify the report was created
        report = Report.objects.get(user=self.user.id, date=today_str)
        self.assertEqual(report.pain_level, 3)
        self.assertEqual(report.notes, 'Completed exercises with minimal pain')

    def test_adherence_stats_endpoint(self):
        """Test the adherence stats endpoint"""
        today = timezone.now().date()
        exercise_list = [self.beginner_exercise, self.intermediate_exercise, self.advanced_exercise]
        user_exercises = []

        for i, exercise in enumerate(exercise_list):
            user_exercise, _ = UserExercise.objects.get_or_create(
                user=self.user,
                exercise=exercise,
                defaults={
                    'sets': 3,
                    'reps': 10,
                    'pain_level': 1,
                    'completed': True,
                    'is_active': True
                }
            )
            user_exercises.append(user_exercise)

        for i in range(3):
            report_date = today - timedelta(days=i)
            Report.objects.filter(user=self.user).delete()
            report, created = Report.objects.get_or_create(
                user=self.user,
                date=report_date,
                defaults={
                    'pain_level': 2,
                    'notes': f"Day {i} report"
                }
            )
            for j in range(i + 1):  # Incrementally increase completion count
                if j < len(user_exercises):
                    ReportExercise.objects.create(
                        report=report,
                        user_exercise=user_exercises[j],
                        completed_sets=3,
                        completed_reps=10,
                        pain_level=2
                    )

        url = reverse('report-adherence-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('chart_data', response.data)
        self.assertIn('average_adherence', response.data)
        self.assertIn('history', response.data)

    def test_pain_stats_endpoint(self):
        """Test the pain stats endpoint"""
        today = timezone.now().date()

        user_exercise, _ = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.beginner_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 1,
                'completed': True,
                'is_active': True
            }
        )

        for i in range(3):
            report_date = today - timedelta(days=i)
            pain_level = i + 1

            try:
                Report.objects.filter(user=self.user).delete()
                report, created = Report.objects.get_or_create(
                    user=self.user,
                    date=report_date,
                    defaults={
                        'pain_level': pain_level,
                        'notes': f"Pain level {pain_level}"
                    }
                )
            except IntegrityError:
                # If conflict, fall back to get (already exists)
                report = Report.objects.get(user=self.user, date=report_date)

            ReportExercise.objects.get_or_create(
                report=report,
                user_exercise=user_exercise,
                defaults={
                    'completed_sets': 3,
                    'completed_reps': 10,
                    'pain_level': pain_level
                }
            )

        url = reverse('report-pain-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('chart_data', response.data)
        self.assertIn('average_pain', response.data)
        self.assertIn('history', response.data)

    
    def test_exercise_history_endpoint(self):
        """Test the exercise history endpoint"""
        # Create reports with different pain levels
        today = timezone.now().date()
        
        for i in range(3):
            report_date = today - timedelta(days=i)
            pain_level = i + 1
            Report.objects.filter(user=self.user).delete()
            report, created = Report.objects.get_or_create(
                user=self.user,
                date=report_date,
                pain_level=pain_level,
                notes=f"Exercise stats for day {i}"
            )
            

            user_exercise = UserExercise.objects.filter(user=self.user).first()
            ReportExercise.objects.create(
                report=report,
                user_exercise=user_exercise,
                completed_sets=3,
                completed_reps=10,
                pain_level=pain_level
            )
        
        url = reverse('report-exercise-history')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('date', response.data['history'][0])
        self.assertIn('formatted_date', response.data['history'][0])
        self.assertIn('exercises', response.data['history'][0])
        self.assertIn('pain_level', response.data['history'][0])


    
class ChatbotTests(APITestCase):
    """Tests for the chatbot functionality"""
    
    def setUp(self):
        # Create categories
        self.category = ExerciseCategory.objects.create(
            name="Squats",
            description="Exercises for Knee rehabilitation"
        )
        
        # Create exercises
        self.beginner_exercise = Exercise.objects.create(
            category=self.category,
            name="Beginner Squat",
            difficulty_level="Beginner",
            additional_notes="Start with small movements"
        )
        
        # Create injury type
        self.injury_type = InjuryType.objects.create(
            name="Meniscus Tear",
            description="Tear in the meniscus of the knee"
        )
        self.injury_type.treatment.add(self.beginner_exercise)
        self.injury_type.save()
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser1",
            email="test1@example.com",
            password="Password123",
            first_name="Patient",
            last_name="User",
            date_of_birth=timezone.now().date(),
        )

        self.user.injury_type = self.injury_type
        self.user.save()
        
        # Set up client and authentication
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create UserExercise
        self.user_exercise, created = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.beginner_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 2,
                'is_active': True
            }
        )
        
        # Create report
        self.report = Report.objects.create(
            user=self.user,
            pain_level=2,
            notes="Feeling better today"
        )
        
        # Create report exercise
        self.report_exercise = ReportExercise.objects.create(
            report=self.report,
            user_exercise=self.user_exercise,
            completed_sets=3,
            completed_reps=10,
            pain_level=2
        )
    
    def test_chatbot_endpoint_with_mocked_openai(self):
        """Test the chatbot endpoint with mocked OpenAI response"""
        import unittest.mock as mock
        
        # Create a mock response from OpenAI
        class MockResponse:
            def __init__(self):
                self.choices = [
                    type('obj', (object,), {
                        'message': type('obj', (object,), {
                            'content': "Great job on your exercises! Keep up the good work and remember to maintain proper form."
                        })
                    })
                ]
        
        # Mock the OpenAI chat.completions.create method
        with mock.patch('openai.chat.completions.create', return_value=MockResponse()):
            url = reverse('chatbot_api')
            data = {
                'message': 'How am I doing with my exercises?',
                'exerciseContext': '{}'
            }
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['status'], 'success')
            self.assertIn('message', response.data)
            self.assertTrue(isinstance(response.data['message'], str))
    
    def test_reset_chat_history(self):
        """Test resetting chat history"""
        url = reverse('reset_chat_history')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Chat history reset.')
        

class ExerciseLevelTests(TestCase):
    """Tests for exercise difficulty management"""
    
    def setUp(self):
        # Create categories
        self.category = ExerciseCategory.objects.create(
            name="Squats",
            description="Exercises for Knee rehabilitation"
        )
        
        # Create exercises
        self.beginner_exercise = Exercise.objects.create(
            category=self.category,
            name="Beginner Squat",
            difficulty_level="Beginner",
            additional_notes="Start with small movements"
        )
        
        self.intermediate_exercise = Exercise.objects.create(
            category=self.category,
            name="Intermediate Squat",
            difficulty_level="Intermediate",
            additional_notes="Use light weights"
        )
        
        self.advanced_exercise = Exercise.objects.create(
            category=self.category,
            name="Advanced Squat",
            difficulty_level="Advanced",
            additional_notes="Full range of motion required"
        )
        
        # Create injury type
        self.injury_type = InjuryType.objects.create(
            name="Meniscus Tear",
            description="Tear in the meniscus of the knee"
        )
        self.injury_type.treatment.add(self.beginner_exercise)
        self.injury_type.save()
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="Password123!",
            first_name="Test",
            last_name="User",
            date_of_birth=timezone.now().date(),
        )

        self.user.injury_type = self.injury_type
        self.user.save()
    
    def test_update_exercise_level_based_on_pain(self):
        """Test function to update exercise level based on pain"""
        from .views import update_exercise_level_based_on_pain
        
        # Create user exercise at advanced level
        advanced_user_exercise = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.advanced_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 0,
                'is_active': True
            }
        )
        
        # Test with high pain level (should decrease difficulty)
        result = update_exercise_level_based_on_pain(self.user, 5, self.advanced_exercise.name)
        
        # Should return a new UserExercise with intermediate difficulty
        self.assertIsNotNone(result)
        self.assertEqual(result.exercise.difficulty_level, "Intermediate")
        
        # Create user exercise at beginner level
        beginner_user_exercise = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.beginner_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 0,
                'is_active': True
            }
        )
        
        # Test with high pain level on beginner exercise (should suggest removal)
        result = update_exercise_level_based_on_pain(self.user, 5, self.beginner_exercise.name)
        
        # Should return "consider_removal"
        self.assertEqual(result, "consider_removal")
    
    def test_increase_difficulty(self):
        """Test function to increase exercise difficulty"""
        from .views import increase_difficulty
        
        # Create user exercise at beginner level
        beginner_user_exercise = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.beginner_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 0,
                'is_active': True
            }
        )
        
        # Test increasing difficulty
        result = increase_difficulty(self.user, self.beginner_exercise.name)
        
        # Should return a new UserExercise with intermediate difficulty
        self.assertIsNotNone(result)
        self.assertEqual(result.exercise.difficulty_level, "Intermediate")
        
        # Create user exercise at advanced level
        advanced_user_exercise = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.advanced_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 0,
                'is_active': True
            }
        )
        
        # Test increasing difficulty when already at maximum
        result = increase_difficulty(self.user, self.advanced_exercise.name)
        
        # Should return the same UserExercise (can't increase beyond Advanced)
        self.assertIsNotNone(result)
        self.assertEqual(result.exercise.difficulty_level, "Advanced")
    
    def test_has_consistent_low_pain(self):
        """Test function to check for consistent low pain levels"""
        from .views import has_consistent_low_pain
        
        # Create user exercise - unpack the tuple properly
        user_exercise, created = UserExercise.objects.get_or_create(
            user=self.user,
            exercise=self.beginner_exercise,
            defaults={
                'sets': 3,
                'reps': 10,
                'pain_level': 1,
                'is_active': True
            }
        )
        
        # Create report
        report = Report.objects.create(
            user=self.user,
            pain_level=1,
            notes="Feeling good"
        )
        
        # Create 3 report exercises with consistently low pain
        for i in range(3):
            ReportExercise.objects.create(
                report=report,
                user_exercise=user_exercise,  # Now this is just the object, not a tuple
                completed_sets=3,
                completed_reps=10,
                pain_level=1
            )
        
        # Test with consistently low pain
        result = has_consistent_low_pain(user_exercise)
        
        # Should return True
        self.assertTrue(result)
        
        # Create a report exercise with high pain
        ReportExercise.objects.create(
            report=report,
            user_exercise=user_exercise,
            completed_sets=3,
            completed_reps=10,
            pain_level=5
        )
        
        # Test with inconsistent pain
        result = has_consistent_low_pain(user_exercise)
        
        # Should return False
        self.assertFalse(result)