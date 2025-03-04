from rest_framework import serializers
from .models import ReportExercise, User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType

class ExerciseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseCategory
        fields = '__all__'

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'
    
    def get_fields(self):
        fields = super().get_fields()
        if self.context['request'].method == 'POST':
            # Allow 'user' and 'exercise' to be writable during POST
            fields['category'].read_only = False
        else:
            # Make 'user' and 'exercise' read-only during updates
            fields['category'].read_only = True
        return fields

class UserExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserExercise
        fields = ['id', 'user', 'exercise', 'sets', 'reps', 'pain_level', 'completed']
    
    def get_fields(self):
        fields = super().get_fields()
        if self.context['request'].method == 'POST':
            # Allow 'user' and 'exercise' to be writable during POST
            fields['user'].read_only = False
        else:
            # Make 'user' and 'exercise' read-only during updates
            fields['user'].read_only = True
        return fields

class InjuryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InjuryType
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=False)
    class Meta:
        model = User
        fields = 'username', 'email', 'first_name', 'last_name', 'date_of_birth', 'exercises', 'injury_type'

    def create(self, validated_data):
        exercises = validated_data.pop('exercises', [])  # Extract exercises from validated data
        user = super().create(validated_data)  # Create the user

        # Create UserExercise instances for each exercise
        for exercise in exercises:
            UserExercise.objects.create(user=user, exercise=exercise)

        return user

    def update(self, instance, validated_data):
        exercises = validated_data.pop('exercises', [])  # Extract exercises from validated data
        user = super().update(instance, validated_data)  # Update the user

        # Clear existing UserExercise instances and create new ones
        UserExercise.objects.filter(user=user).delete()
        for exercise in exercises:
            UserExercise.objects.create(user=user, exercise=exercise)

        return user

class ReportExerciseSerializer(serializers.ModelSerializer):
    user_exercise = UserExerciseSerializer(read_only=True)

    class Meta:
        model = ReportExercise
        fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):
    # exercises = ReportExerciseSerializer(many=True, read_only=True, source='report_exercises')
    # exercises_completed = UserExerciseSerializer(many=True, read_only=False)
    exercises_completed = serializers.PrimaryKeyRelatedField(
        queryset=UserExercise.objects.all(), many=True, required=False
    )
    class Meta:
        model = Report
        fields = '__all__'
    
    def get_fields(self):
        fields = super().get_fields()
        if self.context['request'].method == 'POST':
            # Allow 'user' and 'exercise' to be writable during POST
            fields['user'].read_only = False
            fields['exercises_completed'].read_only = False
        else:
            # Make 'user' and 'exercise' read-only during updates
            fields['user'].read_only = True
            fields['exercises_completed'].read_only = False
        return fields