from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0018_remove_onboarding_verified_at_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendorreferencemaster',
            name='group_code',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='vendorreferencemaster',
            name='nr_group',
            field=models.CharField(blank=True, default='', max_length=10),
        ),
    ]