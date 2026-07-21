# Corrects invoice TDS code descriptions and their higher-rate (PAN invalid/inoperative) equivalents.

from django.db import migrations


TDS_CODE_FIXES = [
    ('I1', 'TDS-194A-INT-IND-INV - 10%'),
    ('I2', 'TDS-194A-INT-CO-INV - 10%'),
    ('I3', 'TDS-194C-CONT-CO-INV - 2%'),
    ('I4', 'TDS-194C-CONT-IND-INV - 1%'),
    ('I5', 'TDS-194H-COMN-INV - 2% WEF 1-10'),
    ('IB', 'TDS-194JA-PROF-TECH-INV - 2%'),
    ('I8', 'TDS-194JB-PROF-INV - 10%'),
    ('I9', 'TDS-194IA-RENT-P&M-INV - 2%'),
    ('IA', 'TDS-195-NRI-CO-INV - 10.4%'),
    ('IQ', 'TDS-194Q-Purchases-Inv(MIRO) - 0.1%'),
    ('IR', 'TDS-194R-PROMO-10% NORMAL'),
    ('ID', 'TDS-194A-INT-INV-206AA/AB - 20%'),
    ('II', 'TDS-194C-CONT-INV-206AA - 20%'),
    ('IC', 'TDS-194C-CONT-INV-206AB - 5%'),
    ('IF', 'TDS-194H-COMM-INV-206AB - 10%'),
    ('IK', 'TDS-194JA-PROF-INV-206AB - 5%'),
    ('IJ', 'TDS-194JB-PROF-INV-206AA/AB - 20%'),
    ('IG', 'TDS-194IA-RENT-P&M-INV-206AB - 5%'),
    ('IH', 'TDS-194Q-Non PAN Purch-Inv(MIRO)'),
    ('IS', 'TDS-194R-PROMO-20% U/s 206AA/AB'),
]

# Stale codes from the original seed that embedded "(Higher Tax code)" into the
# tds_code itself instead of using the short SAP code — replaced by the rows above.
STALE_CODES = [
    'ID (Higher Tax code)',
    'PD (Higher Tax code)',
    'II (Higher Tax code)',
    'PI (Higher Tax code)',
    'IL (Higher Tax code)',
    'PL (Higher Tax code)',
    'IE (Higher Tax code)',
    'PE (Higher Tax code)',
    'IJ (Higher Tax code)',
    'PJ (Higher Tax code)',
    'IG (Higher Tax code)',
    'PG (Higher Tax code)',
    'IK (Higher Tax code)',
    'PK (Higher Tax code)',
    'IH (Higher Tax code)',
    'PH (Higher Tax code)',
    'IS (Higher Tax code)',
    'No tax code',
]


def fix_tds_codes(apps, schema_editor):
    TDSCodeMaster = apps.get_model('onboarding', 'TDSCodeMaster')
    TDSCodeMaster.objects.filter(tds_code__in=STALE_CODES).delete()
    for tds_code, description in TDS_CODE_FIXES:
        TDSCodeMaster.objects.update_or_create(
            tds_code=tds_code,
            defaults={'description': description},
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0032_alter_extensioneditrequest_account_number'),
    ]

    operations = [
        migrations.RunPython(fix_tds_codes, noop),
    ]
