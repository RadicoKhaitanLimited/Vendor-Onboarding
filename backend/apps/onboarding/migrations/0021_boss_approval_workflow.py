from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0020_populate_vendor_reference_group_details'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='onboarding',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Draft'),
                    ('PENDING', 'Pending'),
                    ('PENDING_BOSS_APPROVAL', 'Pending Boss Approval'),
                    ('UNDER_REVIEW', 'Under Review'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                ],
                default='DRAFT',
                max_length=25,
            ),
        ),
        migrations.CreateModel(
            name='OnboardingApprovalHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                (
                    'action',
                    models.CharField(
                        choices=[
                            ('SUBMITTED', 'Submitted'),
                            ('APPROVED', 'Approved'),
                            ('REJECTED', 'Rejected'),
                        ],
                        max_length=20,
                    ),
                ),
                ('comments', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'actor',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='onboarding_approval_actions',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'onboarding',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='approval_history',
                        to='onboarding.onboarding',
                    ),
                ),
            ],
            options={
                'db_table': 'onboarding_approval_history',
                'ordering': ['-created_at'],
            },
        ),
    ]
