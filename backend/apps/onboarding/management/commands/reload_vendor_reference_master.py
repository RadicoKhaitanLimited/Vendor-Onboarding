from django.core.management.base import BaseCommand

from apps.onboarding.models import VendorReferenceMaster

ROWS = [
    # (group_code, nr_group, vendor_reference_range, gl_account_number, reference_name, gl_account_description)
    ('COTH', 'B7', '366000-366999', '270061', 'Receivables-STO', 'Receivables-STOCK TFR'),
    ('CDEF', '2',  '210000-219999', '270010', 'Receivables-IMF', 'Receivables-IMFL DEFENCE'),
    ('CCLQ', '3',  '300000-365999', '270020', 'Receivables-Cou', 'Receivables-Country Liquor'),
    ('CALC', '4',  '230000-239999', '270030', 'Receivables-Alc', 'Receivables-Alcohol'),
    ('CIBD', '5',  '240000-249999', '270040', 'Receivables-INT', 'Receivables-INTL Brands Div'),
    ('CEXP', '6',  '250000-259999', '270050', 'Receivables-Exp', 'Receivables-Exports'),
    ('COTS', '7',  '267000-267999', '270061', 'BP - Others', 'BP- Customers Others'),
    ('MISC', '8',  '261000-265999', '270060', 'MISCELLANEOUSD', 'MISCELLANEOUS DEBTORS'),
    ('ZGRP', '9',  '280000-280999', '270000', 'Receivables Gro', 'Receivables Groups-IMFL CIVIL'),
    ('CCIV', '11', '500000-599999', '270000', 'Receivables-IMF', 'Receivables-IMFL CIVIL'),
    ('VIBD', '13', '170000-179999', '106600', 'IBD Suppliers', 'IBD Suppliers'),
    ('TMEM', '14', '80000-99999',   '106600', 'Trust Members', 'Trust Members'),
    ('VC&F', '15', '400000-499999', '106900', 'C & F Agents', 'C & F Agents'),
    ('VGL',  '18', '180000-189999', '102500', 'Others-Banks,Lo', 'Others-Banks,Loans'),
    ('VRMS', '21', '10000-19999',   '106000', 'Raw Material Su', 'Raw Material Suppliers'),
    ('VSMS', '22', '20000-39999',   '106200', 'Stores Material', 'Stores Material Suppliers'),
    ('VPMS', '23', '40000-59999',   '106100', 'Packing Materia', 'Packing Material Suppliers'),
    ('VCIS', '24', '60000-69999',   '106300', 'Capital Item Su', 'Capital Item Suppliers'),
    ('VCON', '25', '70000-79999',   '106400', 'Contractors', 'Contractors'),
    ('VPRF', '26', '100000-109999', '106500', 'Professionals', 'Professionals'),
    ('VOTV', '27', '110000-119999', '106700', 'One Time Vendor', 'One Time Vendor'),
    ('VTRP', '28', '120000-129999', '106400', 'Transporters', 'Transporters'),
    ('VOTH', '29', '130000-139999', '106600', 'Others', 'Others'),
    ('VMKT', '31', '150000-159999', '107000', 'Promotional Ite', 'Promotional Item Suppliers'),
    ('VEMP', '32', '160000-169999', '106800', 'Employees', 'Employees'),
]


class Command(BaseCommand):
    help = (
        'Replace all VendorReferenceMaster rows with the current group/NR/vendor '
        'reference range table. Deletes existing rows, then inserts the fixed ROWS list.'
    )

    def handle(self, *args, **options):
        deleted_count, _ = VendorReferenceMaster.objects.all().delete()
        VendorReferenceMaster.objects.bulk_create([
            VendorReferenceMaster(
                group_code=group_code,
                nr_group=nr_group,
                vendor_reference_range=vendor_reference_range,
                gl_account_number=gl_account_number,
                reference_name=reference_name,
                gl_account_description=gl_account_description,
            )
            for group_code, nr_group, vendor_reference_range, gl_account_number, reference_name, gl_account_description in ROWS
        ])
        self.stdout.write(self.style.SUCCESS(
            f'Vendor reference master reloaded: deleted {deleted_count}, created {len(ROWS)}.'
        ))
