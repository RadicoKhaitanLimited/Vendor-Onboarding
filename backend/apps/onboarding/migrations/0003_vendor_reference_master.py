from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0002_add_sap_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorReferenceMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('vendor_reference_range', models.CharField(choices=[
                    ('100000-199999', '100000 - 199999'),
                    ('200000-299999', '200000 - 299999'),
                    ('300000-399999', '300000 - 399999'),
                    ('400000-499999', '400000 - 499999'),
                    ('500000-599999', '500000 - 599999'),
                    ('600000-699999', '600000 - 699999'),
                    ('700000-799999', '700000 - 799999'),
                    ('800000-899999', '800000 - 899999'),
                    ('900000-999999', '900000 - 999999'),
                ], max_length=20, unique=True)),
                ('reference_name', models.CharField(max_length=255)),
                ('gl_account_number', models.CharField(max_length=50)),
                ('gl_account_description', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'vendor_reference_masters',
                'ordering': ['vendor_reference_range'],
            },
        ),
    ]
