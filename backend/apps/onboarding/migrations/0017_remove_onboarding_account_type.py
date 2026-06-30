from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0016_expand_tds_codes'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='onboarding',
            name='account_type',
        ),
    ]
