from django.db import migrations, models


PAYMENT_TERMS = [
    ('0024', 'WITHIN 3 DAYS'),
    ('0031', 'WITHIN 7 DAYS'),
    ('0033', '15 DAYS CREDIT'),
    ('0039', '20 DAYS CREDIT'),
    ('0027', '30 DAYS CREDIT'),
    ('0025', '45 DAYS CREDIT'),
    ('0020', '60 DAYS CREDIT'),
    ('0012', 'ADVANCE'),
    ('0001', 'IMMEDIATE'),
]


def seed_payment_terms(apps, schema_editor):
    PaymentTermMaster = apps.get_model('onboarding', 'PaymentTermMaster')
    for payment_term, description in PAYMENT_TERMS:
        PaymentTermMaster.objects.update_or_create(
            payment_term=payment_term,
            defaults={'description': description},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0006_make_vendor_reference_ranges_dynamic'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentTermMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payment_term', models.CharField(max_length=20, unique=True)),
                ('description', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'payment_term_masters',
                'ordering': ['payment_term'],
            },
        ),
        migrations.RunPython(seed_payment_terms, migrations.RunPython.noop),
    ]
