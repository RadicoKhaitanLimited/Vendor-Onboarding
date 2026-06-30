# Generated manually because local DEBUG=release prevents manage.py makemigrations.

from django.db import migrations, models


MSME_CHOICES = [
    ('MME', 'Micro or A or D'),
    ('MSE', 'Small or B or E'),
    ('MSM', 'Medium or C or F'),
    ('MET', 'Micro Enterprises - Trading'),
    ('MMT', 'Medium Enterprise - Trading'),
    ('MST', 'Small Enterprise - Trading'),
    ('MNA', 'Not MSME Registered/Applicable'),
]

MSME_REGISTERED_CHOICES = [choice for choice in MSME_CHOICES if choice[0] != 'MNA']


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0014_onboarding_gst_verification_response_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='onboarding',
            name='msme_category',
            field=models.CharField(blank=True, choices=MSME_REGISTERED_CHOICES, max_length=10),
        ),
        migrations.AlterField(
            model_name='onboarding',
            name='msme_status',
            field=models.CharField(choices=MSME_CHOICES, default='MNA', max_length=20),
        ),
    ]
