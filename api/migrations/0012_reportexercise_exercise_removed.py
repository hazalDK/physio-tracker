# Generated by Django 5.1.1 on 2025-04-25 17:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_remove_report_summary'),
    ]

    operations = [
        migrations.AddField(
            model_name='reportexercise',
            name='exercise_removed',
            field=models.BooleanField(default=False),
        ),
    ]
