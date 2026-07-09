from django.db import migrations


VENDOR_GROUP_DETAILS = {
    '10000-19999': ('VRMS', '01'),
    '20000-39999': ('VSMS', '02'),
    '40000-59999': ('VPMS', '03'),
    '60000-69999': ('VCIS', '04'),
    '70000-99999': ('VCON', '05'),
    '100000-109999': ('VPRF', '06'),
    '110000-119999': ('VOTV', '07'),
    '120000-129999': ('VTRP', '08'),
    '130000-139999': ('VOTH', '09'),
    '400000-499999': ('VC&F', '10'),
    '150000-159999': ('VMKT', '11'),
    '160000-169999': ('VEMP', '12'),
    '170000-179999': ('VIBD', '13'),
    '200000-201999': ('TMEM', '20'),
}


def populate_group_details(apps, schema_editor):
    VendorReferenceMaster = apps.get_model('onboarding', 'VendorReferenceMaster')

    for vendor_range, (group_code, nr_group) in VENDOR_GROUP_DETAILS.items():
        for master in VendorReferenceMaster.objects.filter(vendor_reference_range=vendor_range):
            update_fields = []
            if not master.group_code:
                master.group_code = group_code
                update_fields.append('group_code')
            if not master.nr_group:
                master.nr_group = nr_group
                update_fields.append('nr_group')
            if update_fields:
                master.save(update_fields=update_fields)


def clear_group_details(apps, schema_editor):
    VendorReferenceMaster = apps.get_model('onboarding', 'VendorReferenceMaster')

    for vendor_range, (group_code, nr_group) in VENDOR_GROUP_DETAILS.items():
        VendorReferenceMaster.objects.filter(
            vendor_reference_range=vendor_range,
            group_code=group_code,
            nr_group=nr_group,
        ).update(group_code='', nr_group='')


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0019_add_group_code_nr_group_to_vendor_reference'),
    ]

    operations = [
        migrations.RunPython(populate_group_details, clear_group_details),
    ]
