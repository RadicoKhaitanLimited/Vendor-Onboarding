from django.db import migrations, models


def copy_existing_bosses(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    through_model = User.bosses.through
    rows = []
    for employee in User.objects.exclude(boss_id__isnull=True).only('id', 'boss_id'):
        rows.append(
            through_model(
                from_user_id=employee.id,
                to_user_id=employee.boss_id,
            )
        )
    if rows:
        through_model.objects.bulk_create(rows, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_boss_update_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='bosses',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'role': 'BOSS'},
                related_name='employees',
                symmetrical=False,
                to='accounts.user',
            ),
        ),
        migrations.RunPython(copy_existing_bosses, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='user',
            name='boss',
        ),
    ]
