from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='onboarding',
            name='reference_vendor_code',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='reference_purchase_orgs',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='purchase_orgs_to_open',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='payment_terms',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='onboarding',
            name='tds_codes',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
