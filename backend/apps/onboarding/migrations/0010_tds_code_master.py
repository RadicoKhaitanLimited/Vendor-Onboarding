from django.db import migrations, models


TDS_CODES = [
    ('IQ', 'TDS-194Q-GST MATERIAL @0.1%'),
    ('PQ', 'TDS-194Q-Purchases-Adv Pmt 0.1%'),
    ('I1', 'TDS-194A-ON INTEREST-INDIVIDUAL-INV-10%'),
    ('P1', 'TDS-194A-INT-IND-PAY- 10%'),
    ('I2', 'TDS-194A-INTEREST-COMPANY/FIRM-INV-10%'),
    ('P2', 'TDS-194A-INT-CO-PAY- 10%'),
    ('I3', 'TDS-194C-TRANSPORTER.CONTRACTOR-COMPANY/FIRM-INV-2%'),
    ('P3', 'TDS-194C-CONT-CO-PAY- 2%'),
    ('I4', 'TDS-194C-TRANSPORTER.CONTRACTOR-INDIVIDUAL-INV-1%'),
    ('P4', 'TDS-194C-CONT-IND-PAY- 1%'),
    ('I5', 'TDS-194H-ON COMMISSION/BROERAGE INV-5%'),
    ('P5', 'TDS-194H-COMM-PAY- 5%'),
    ('I6', 'TDS-194IB RENT ON LAND &BUILDING,FURNITURE&FIXTURE-INDIVIDUAL-INV-10%'),
    ('P6', 'TDS-194IB-RENT-L&B,F&F-IND-PAY- 10%'),
    ('I7', 'TDS-194IB-RENT ON LAND &BUILDING,FURNITURE&FIXTURE-COMPANY/FIRM-INV-10%'),
    ('P7', 'TDS-194IB-RENT-L&B,F&F-PAY- 10%'),
    ('I8', 'TDS-194J-PROFESSIONAL FEES-INV-10%'),
    ('P8', 'TDS-194J-PROF-PAY- 10%'),
    ('I9', 'TDS-194IA-RENT ON PLANT&MACHINERY-INV-2%'),
    ('P9', 'TDS-194IA-RENT-P&M-PAY- 2%'),
    ('IB', 'TDS-194J-PROF-TECH-INV- 2%'),
    ('PB', 'TDS-194J-PROF-TECH-PAY- 2%'),
    ('IR', 'TDS-194R-PROMO-10% NORMAL'),
    ('IA', 'TDS-195-NRI-COMPANY-INV-10.3%'),
    ('No tax code', '194Q for material or TDS for services is must'),
    ('ID (Higher Tax code)', 'TDS-194A-INT-INV-206AA/AB 20%'),
    ('PD (Higher Tax code)', 'TDS-194A-INT-ADV-206AB 20%'),
    ('II (Higher Tax code)', 'TDS-194C-CONT-INV-206AA 20%'),
    ('PI (Higher Tax code)', 'TDS-194C-CONT-ADV-206AA 20%'),
    ('IL (Higher Tax code)', 'TDS-194H-COMM-INV-206AA 20%'),
    ('PL (Higher Tax code)', 'TDS-194H-COMM-ADV-206AA 20%'),
    ('IE (Higher Tax code)', 'TDS-194IB RENT-INV-206AA/AB 20%'),
    ('PE (Higher Tax code)', 'TDS-194IB-RENT-ADV-206AB 20%'),
    ('IJ (Higher Tax code)', 'TDS-194JB-PROF-INV-206AA/AB 20%'),
    ('PJ (Higher Tax code)', 'TDS-194J-PROF-ADV-206AB 20%'),
    ('IG (Higher Tax code)', 'TDS-194IA-RENT-P&M-INV-206AB 5%'),
    ('PG (Higher Tax code)', 'TDS-194IA-RENT-P&M-ADV-206AB 5%'),
    ('IK (Higher Tax code)', "Higher Tax code applicable for 'IB' only"),
    ('PK (Higher Tax code)', 'TDS-194J-PROF-TECH-ADV-206AB 5%'),
    ('IH (Higher Tax code)', 'TDS-194Q-Non PAN Purch-Inv(MIRO)5%'),
    ('PH (Higher Tax code)', 'TDS-194Q-Non PAN Purch-Adv Pmt 5%'),
    ('IS (Higher Tax code)', "Higher Tax code applicable for 'IR' only"),
]


def seed_tds_codes(apps, schema_editor):
    TDSCodeMaster = apps.get_model('onboarding', 'TDSCodeMaster')
    for tds_code, description in TDS_CODES:
        TDSCodeMaster.objects.update_or_create(
            tds_code=tds_code,
            defaults={'description': description},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0009_company_code_master'),
    ]

    operations = [
        migrations.CreateModel(
            name='TDSCodeMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tds_code', models.CharField(max_length=50, unique=True)),
                ('description', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'tds_code_masters',
                'ordering': ['tds_code'],
            },
        ),
        migrations.RunPython(seed_tds_codes, migrations.RunPython.noop),
    ]
