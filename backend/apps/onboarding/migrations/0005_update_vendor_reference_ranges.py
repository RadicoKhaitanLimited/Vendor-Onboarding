from django.db import migrations, models


VENDOR_REFERENCE_RANGE_CHOICES = [
    ('10000-19999', '10000 - 19999'),
    ('20000-39999', '20000 - 39999'),
    ('40000-59999', '40000 - 59999'),
    ('60000-69999', '60000 - 69999'),
    ('70000-99999', '70000 - 99999'),
    ('100000-109999', '100000 - 109999'),
    ('110000-119999', '110000 - 119999'),
    ('120000-129999', '120000 - 129999'),
    ('130000-139999', '130000 - 139999'),
    ('140000-149999', '140000 - 149999'),
    ('150000-159999', '150000 - 159999'),
    ('160000-169999', '160000 - 169999'),
    ('170000-179999', '170000 - 179999'),
    ('200000-201999', '200000 - 201999'),
    ('400000-499999', '400000 - 499999'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0004_onboarding_vendor_reference_details'),
    ]

    operations = [
        migrations.AlterField(
            model_name='onboarding',
            name='vendor_reference_range',
            field=models.CharField(blank=True, choices=VENDOR_REFERENCE_RANGE_CHOICES, max_length=20),
        ),
        migrations.AlterField(
            model_name='vendorreferencemaster',
            name='vendor_reference_range',
            field=models.CharField(choices=VENDOR_REFERENCE_RANGE_CHOICES, max_length=20, unique=True),
        ),
    ]
