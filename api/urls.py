from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportExerciseViewSet, UserViewSet, ExerciseViewSet, ExerciseCategoryViewSet,
    UserExerciseViewSet, ReportViewSet, InjuryTypeViewSet, auth_check, RegisterView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'exercises', ExerciseViewSet)
router.register(r'exercise-categories', ExerciseCategoryViewSet)
router.register(r'user-exercises', UserExerciseViewSet)
router.register(r'reports', ReportViewSet)
router.register(r'injury-types', InjuryTypeViewSet)
router.register(r'report-exercises', ReportExerciseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth-check/', auth_check, name='auth-check'),
    path('register/', RegisterView.as_view(), name='register'),
]
