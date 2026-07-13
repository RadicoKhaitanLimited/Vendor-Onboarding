"""Django ORM seed data for active Customer Series master rows.

Run from ``python manage.py shell``:
    from apps.onboarding.customer_series_orm import upsert_customer_series
    upsert_customer_series()
"""

from django.db import transaction

from .models import VendorReferenceMaster


CUSTOMER_SERIES = [
    ('230000-239999', 'Receivables-Alcohol', '270030', 'Sundry Debtors For Alcohol', 'CALC', '04'),
    ('210000-219999', 'Receivables-IMFL DEFENCE', '270010', 'Sundry Debtors For Imfl Defence', 'CDEF', '02'),
    ('250000-259999', 'Receivables-Exports', '270050', 'Sundry Debtors For Exp', 'CEXP', '06'),
    ('240000-249999', 'Receivables-INTL Brands Div', '270040', 'Sundry Debtors For Ibd', 'CIBD', '05'),
    ('261000-265999', 'MISCELLANEOUS DEBTORS', '270060', 'Sundry Debtors For Other', 'MISC', '08'),
    ('366000-366999', 'Receivables-STOCK TFR', '270061', 'Sundry Debtors For Inter units/TUU', 'COTH', 'C7'),
    ('280000-280999', 'Receivables Groups-IMFL CIVIL', '270000', 'Sundry Debtors For Imfl-Civil', 'ZGRP', '09'),
    ('267000-267999', 'BP- Customer Others', '270061', 'Sundry Debtors For Inter units/TUU', 'COTS', '7'),
    ('300000-365999', 'Receivables-Country Liquor', '270020', 'Sundry Debtors For Country Liquor', 'CCLQ', '03'),
    ('500000-599999', 'Receivables-IMFL CIVIL', '270000', 'Sundry Debtors For Imfl-Civil', 'CCIV', '11'),
]


@transaction.atomic
def upsert_customer_series():
    """Create or update the 10 active Customer Series rows and return their count."""
    for vendor_reference_range, reference_name, gl_account_number, gl_account_description, group_code, nr_group in CUSTOMER_SERIES:
        VendorReferenceMaster.objects.update_or_create(
            vendor_reference_range=vendor_reference_range,
            defaults={
                'reference_name': reference_name,
                'gl_account_number': gl_account_number,
                'gl_account_description': gl_account_description,
                'group_code': group_code,
                'nr_group': nr_group,
            },
        )
    return len(CUSTOMER_SERIES)
