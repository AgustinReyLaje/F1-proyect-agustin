# Generated migration for race weekend data

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_season_alter_constructor_car_model_driverseason_and_more'),
    ]

    operations = [
        # Add retirement_reason to Result
        migrations.AddField(
            model_name='result',
            name='retirement_reason',
            field=models.CharField(max_length=255, blank=True, null=True, help_text='Reason for DNF/retirement (e.g., Engine failure, Collision)'),
        ),
        
        # Create Qualifying model
        migrations.CreateModel(
            name='Qualifying',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('position', models.IntegerField(help_text='Qualifying position')),
                ('q1_time', models.CharField(max_length=20, blank=True, null=True, help_text='Q1 time')),
                ('q2_time', models.CharField(max_length=20, blank=True, null=True, help_text='Q2 time')),
                ('q3_time', models.CharField(max_length=20, blank=True, null=True, help_text='Q3 time')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('constructor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qualifying_results', to='core.constructor')),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qualifying_results', to='core.driver')),
                ('race', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='qualifying_results', to='core.race')),
            ],
            options={
                'ordering': ['race', 'position'],
                'unique_together': {('race', 'driver')},
            },
        ),
        
        # Create Sprint model
        migrations.CreateModel(
            name='Sprint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('grid_position', models.IntegerField(help_text='Starting grid position for sprint')),
                ('final_position', models.IntegerField(blank=True, null=True, help_text='Final sprint position')),
                ('position_text', models.CharField(max_length=10, help_text='Position text (handles DNF, DSQ, etc)')),
                ('points', models.FloatField(default=0.0)),
                ('laps_completed', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('finished', 'Finished'), ('dnf', 'Did Not Finish'), ('dsq', 'Disqualified'), ('dns', 'Did Not Start'), ('retired', 'Retired')], default='finished', max_length=20)),
                ('fastest_lap_time', models.CharField(blank=True, max_length=20, null=True)),
                ('retirement_reason', models.CharField(blank=True, help_text='Reason for DNF/retirement', max_length=255, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('constructor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sprint_results', to='core.constructor')),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sprint_results', to='core.driver')),
                ('race', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sprint_results', to='core.race')),
            ],
            options={
                'ordering': ['race', 'final_position'],
                'unique_together': {('race', 'driver')},
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='qualifying',
            index=models.Index(fields=['race', 'position'], name='core_qualif_race_id_pos_idx'),
        ),
        migrations.AddIndex(
            model_name='sprint',
            index=models.Index(fields=['race', 'final_position'], name='core_sprint_race_id_pos_idx'),
        ),
    ]
