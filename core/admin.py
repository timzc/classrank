from django.contrib import admin
from .models import Student, ScoreRecord, Config


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_focused', 'created_at']
    list_filter = ['is_focused']
    search_fields = ['name']


@admin.register(ScoreRecord)
class ScoreRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'date', 'type', 'item', 'score']
    list_filter = ['date', 'type']
    search_fields = ['student__name', 'item']


@admin.register(Config)
class ConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'value', 'updated_at']
    search_fields = ['key']