from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ExerciseViewSet, ExerciseCategoryViewSet,
    UserExerciseViewSet, ReportViewSet, auth_check
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'exercises', ExerciseViewSet)
router.register(r'exercise-categories', ExerciseCategoryViewSet)
router.register(r'user-exercises', UserExerciseViewSet)
router.register(r'reports', ReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth-check/', auth_check, name='auth-check'),
]
