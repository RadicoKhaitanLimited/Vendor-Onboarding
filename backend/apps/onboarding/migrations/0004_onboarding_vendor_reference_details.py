from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0003_vendor_reference_master'),
    ]

    operations = [
        migrations.AddField(
            model_name='onboarding',
            name='vendor_reference_range',
            field=models.CharField(blank=True, choices=[
                ('100000-199999', '100000 - 199999'),
                ('200000-299999', '200000 - 299999'),
                ('300000-399999', '300000 - 399999'),
                ('400000-499999', '400000 - 499999'),
                ('500000-599999', '500000 - 599999'),
                ('600000-699999', '600000 - 699999'),
                ('700000-799999', '700000 - 799999'),
                ('800000-899999', '800000 - 899999'),
                ('900000-999999', '900000 - 999999'),
            ], max_length=20),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='reference_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='gl_account_number',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='gl_account_description',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
