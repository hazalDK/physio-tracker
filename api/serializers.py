from rest_framework import serializers
from .models import ReportExercise, User, Exercise, ExerciseCategory, UserExercise, Report, InjuryType

class ExerciseCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for ExerciseCategory model.
    This serializer handles the serialization and deserialization of ExerciseCategory instances.
    """
    class Meta:
        model = ExerciseCategory
        fields = '__all__'

class ExerciseSerializer(serializers.ModelSerializer):
    """
    Serializer for Exercise model.
    This serializer handles the serialization and deserialization of Exercise instances.
    """
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
    """
    Serializer for UserExercise model.
    This serializer handles the serialization and deserialization of UserExercise instances.
    """
    class Meta:
        model = UserExercise
        fields = ['id', 'user', 'exercise', 'sets', 'reps', 'hold', 'pain_level', 'completed', 'is_active', 'date_activated', 'date_deactivated']
    
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
    """
    Serializer for InjuryType model.
    This serializer handles the serialization and deserialization of InjuryType instances.
    """
    class Meta:
        model = InjuryType
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    This serializer handles the serialization and deserialization of User instances.
    """
    password = serializers.CharField(write_only=True)
    # injury_type = InjuryTypeSerializer(many=True, required=False)  # Allow multiple injury types
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 
                 'date_of_birth', 'injury_type', 'last_reset', 'exercises')
    
    def create(self, validated_data):
        # Extract password to hash it properly
        password = validated_data.pop('password')
        injury_type = validated_data.pop('injury_type')
        
        # Create user with remaining data
        user = User.objects.create_user(
            **validated_data,
            password=password  # This will properly hash the password
        )
        user.injury_type = injury_type  # Assign injury type if provided
        user.save()
        
        return user

    def update(self, instance, validated_data):
        # Only handle exercises if they're in the validated data
        if 'exercises' in validated_data:
            exercises = validated_data.pop('exercises')
            user = super().update(instance, validated_data)
            
            # Clear existing UserExercise instances and create new ones
            UserExercise.objects.filter(user=user).delete()
            for exercise in exercises:
                UserExercise.objects.create(user=user, exercise=exercise)
        else:
            # Just update the user without touching exercises
            user = super().update(instance, validated_data)
        
        return user

class ReportExerciseSerializer(serializers.ModelSerializer):
    """
    Serializer for ReportExercise model.
    This serializer handles the serialization and deserialization of ReportExercise instances.
    """
    user_exercise = UserExerciseSerializer(read_only=True)

    class Meta:
        model = ReportExercise
        fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):
    date = serializers.DateField(format="%Y-%m-%d")
    
    """
    Serializer for Report model.
    This serializer handles the serialization and deserialization of Report instances.
    """
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