"""project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.http import HttpResponse

from .views import main_spa, axios_endpoints, authCheck

urlpatterns = [
    path('', main_spa),
    path('user', axios_endpoints, {'model_type': 'user'}, name='user'),
    # path('auth', authCheck, name='auth'),
    path('user/<int:pk_id>', axios_endpoints, {'model_type': 'user'}, name='user_id'),
    path('userExercise', axios_endpoints, {'model_type': 'user exercises'}, name='user_exercise'),
    path('userExercise/<int:pk_id>', axios_endpoints, {'model_type': 'user exercises'}, name='user_exercise_id'),
    path('exercise', axios_endpoints, {'model_type': 'exercise'}, name='exercise'),
    path('exercise/<int:pk_id>', axios_endpoints, {'model_type': 'exercise'}, name='exercise_id'),
    path('exerciseCategory', axios_endpoints, {'model_type': 'exercise category'}, name='exercise_category'),
    path('exerciseCategory/<int:pk_id>', axios_endpoints, {'model_type': 'exercise category'}, name='exercise_category_id'),
    path('report', axios_endpoints, {'model_type': 'report'}, name='report'),
    path('report/<int:pk_id>', axios_endpoints, {'model_type': 'report'}, name='report_id'),
]
