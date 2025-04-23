from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    ReportExerciseViewSet, UserViewSet, ExerciseViewSet, ExerciseCategoryViewSet,
    UserExerciseViewSet, ReportViewSet, InjuryTypeViewSet, chatbot, reset_chat_history
)

# This file contains the URL routing for the API endpoints.
# It uses Django REST Framework's DefaultRouter to automatically generate the URL patterns for the viewsets.
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'exercises', ExerciseViewSet)
router.register(r'exercise-categories', ExerciseCategoryViewSet)
router.register(r'user-exercises', UserExerciseViewSet)
router.register(r'reports', ReportViewSet)
router.register(r'injury-types', InjuryTypeViewSet)
router.register(r'report-exercises', ReportExerciseViewSet)

# This uses custom URL patterns for the chatbot and reset chat history views.
# It also includes JWT token authentication endpoints for obtaining and refreshing tokens.
urlpatterns = [
    path('', include(router.urls)),
    path('api/chatbot/', chatbot, name='chatbot_api'),
    path('api/reset-chat/', reset_chat_history, name="reset_chat_history"),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
