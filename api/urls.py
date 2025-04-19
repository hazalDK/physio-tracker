from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    ReportExerciseViewSet, UserViewSet, ExerciseViewSet, ExerciseCategoryViewSet,
    UserExerciseViewSet, ReportViewSet, InjuryTypeViewSet, auth_check, UserLoginView, RegisterView
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
        # JWT Authentication Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth-check/', auth_check, name='auth-check'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
]
