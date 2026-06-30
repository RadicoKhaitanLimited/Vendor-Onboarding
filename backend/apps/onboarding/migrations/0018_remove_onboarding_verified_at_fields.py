from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0017_remove_onboarding_account_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='onboarding',
            name='pan_verified_at',
        ),
        migrations.RemoveField(
            model_name='onboarding',
            name='gst_verified_at',
        ),
    ]
