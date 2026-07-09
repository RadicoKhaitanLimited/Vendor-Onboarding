from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='boss',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'role': 'BOSS'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='employees',
                to='accounts.user',
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Admin'),
                    ('BOSS', 'Boss / Manager'),
                    ('EMPLOYEE', 'Employee'),
                    ('VENDOR', 'Vendor'),
                    ('CUSTOMER', 'Customer'),
                ],
                default='VENDOR',
                max_length=10,
            ),
        ),
    ]
