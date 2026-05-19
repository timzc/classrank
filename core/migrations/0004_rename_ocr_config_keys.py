from django.db import migrations


OLD_TO_NEW = {
    'siliconflow_api_key': 'ocr_api_key',
    'siliconflow_model': 'ocr_model',
    'siliconflow_api_url': 'ocr_api_url',
}


def rename_forward(apps, schema_editor):
    Config = apps.get_model('core', 'Config')
    for old, new in OLD_TO_NEW.items():
        try:
            old_entry = Config.objects.get(key=old)
        except Config.DoesNotExist:
            continue
        Config.objects.update_or_create(
            key=new,
            defaults={'value': old_entry.value, 'description': old_entry.description},
        )
        old_entry.delete()


def rename_backward(apps, schema_editor):
    Config = apps.get_model('core', 'Config')
    for old, new in OLD_TO_NEW.items():
        try:
            new_entry = Config.objects.get(key=new)
        except Config.DoesNotExist:
            continue
        Config.objects.update_or_create(
            key=old,
            defaults={'value': new_entry.value, 'description': new_entry.description},
        )
        new_entry.delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_seed_first_academic_year'),
    ]

    operations = [
        migrations.RunPython(rename_forward, rename_backward),
    ]
