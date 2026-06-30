from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0005_update_vendor_reference_ranges'),
    ]

    operations = [
        migrations.AlterField(
            model_name='onboarding',
            name='vendor_reference_range',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='vendorreferencemaster',
            name='vendor_reference_range',
            field=models.CharField(max_length=20, unique=True),
        ),
    ]
