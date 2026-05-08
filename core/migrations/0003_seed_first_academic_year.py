from django.db import migrations


def create_first_academic_year(apps, schema_editor):
    AcademicYear = apps.get_model('core', 'AcademicYear')
    ScoreRecord = apps.get_model('core', 'ScoreRecord')

    year = AcademicYear.objects.create(
        name='一年级下',
        order=2,
        is_active=True,
    )
    ScoreRecord.objects.filter(academic_year__isnull=True).update(academic_year=year)


def reverse_migration(apps, schema_editor):
    AcademicYear = apps.get_model('core', 'AcademicYear')
    ScoreRecord = apps.get_model('core', 'ScoreRecord')

    AcademicYear.objects.filter(name='一年级下').delete()
    ScoreRecord.objects.all().update(academic_year=None)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_academicyear_scorerecord_academic_year'),
    ]

    operations = [
        migrations.RunPython(create_first_academic_year, reverse_migration),
    ]
