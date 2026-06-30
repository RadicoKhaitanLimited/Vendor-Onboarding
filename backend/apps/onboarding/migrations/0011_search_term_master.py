from django.db import migrations, models


SEARCH_TERMS = [
    ('BTL OLD', 'FOR OLD BOTTLE VENDORS'),
    ('BTL NEW', 'FOR NEW BOTTLE VENDORS'),
    ('BTL PET', 'FOR PET BOTTLE VENDORS'),
    ('LABEL', 'FOR LABEL VENDORS'),
    ('CC BOX', 'FOR CC BOX SUPPLIER'),
    ('MONOCARTON', 'FOR MONOCARTON VENDOR'),
    ('CAPEX', 'FOR CAPITAL MATERIAL VENDORS'),
    ('CAPS', 'CAP AND GUALA VENDOR'),
    ('TRANSPORTER', 'FOR ANY KIND OF TRANSPORTER'),
    ('FROSTER', 'FROSTING VENDORS'),
    ('OTHER PM', 'OTHER PM-GUM/ TAPE ETC VENDORS'),
    ('ENA', 'ENA VENDOR'),
    ('GRAIN', 'GRAIN VENDOR'),
    ('RICE HUSK', 'RICE HUSK VENDOR'),
    ('COAL', 'COAL VENDOR'),
    ('RM', 'OTHER RM VENDORS'),
    ('ENGG GOODS', 'FOR ENGINEERING GOODS VENDORS'),
    ('FI VENDOR', 'OTHER FI RELATED EXPENSES'),
    ('FI EMPLOYEE', 'FOR EMPLOYEES AS VENDOR CODE'),
    ('PROMO ITEM', 'PROMOTIONAL ITEM SUPPLIERS'),
    ('COMMISSION', 'FOR COMMISSION/BROKERAGE CHARGES'),
    ('CONTRACTOR', 'CONTRACTOR'),
    ('PROFESSIONAL', 'FOR PROFESSIONAL CHARGES'),
]


def seed_search_terms(apps, schema_editor):
    SearchTermMaster = apps.get_model('onboarding', 'SearchTermMaster')
    for search_term, applicable_for in SEARCH_TERMS:
        SearchTermMaster.objects.update_or_create(
            search_term=search_term,
            defaults={'applicable_for': applicable_for},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0010_tds_code_master'),
    ]

    operations = [
        migrations.AddField(
            model_name='onboarding',
            name='search_term',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.CreateModel(
            name='SearchTermMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('search_term', models.CharField(max_length=50, unique=True)),
                ('applicable_for', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'search_term_masters',
                'ordering': ['search_term'],
            },
        ),
        migrations.RunPython(seed_search_terms, migrations.RunPython.noop),
    ]
