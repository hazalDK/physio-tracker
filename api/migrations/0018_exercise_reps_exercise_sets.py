# Generated by Django 5.1.1 on 2025-04-29 01:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_alter_exercise_hold'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='reps',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='exercise',
            name='sets',
            field=models.IntegerField(default=0),
        ),
    ]
