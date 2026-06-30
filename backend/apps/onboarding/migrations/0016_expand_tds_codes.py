from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0015_update_msme_choices'),
    ]

    operations = [
        migrations.AlterField(
            model_name='onboarding',
            name='tds_codes',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
