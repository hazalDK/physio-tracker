# Generated by Django 5.1.1 on 2025-04-20 18:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_user_last_reset'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='pain_level',
        ),
        migrations.AddField(
            model_name='userexercise',
            name='hold',
            field=models.IntegerField(default=0),
        ),
    ]
