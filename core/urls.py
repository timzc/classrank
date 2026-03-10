from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # OCR解析
    path('parse/', views.parse_image, name='parse_image'),

    # 积分记录
    path('records/', views.get_records, name='get_records'),
    path('records/save/', views.save_records, name='save_records'),
    path('records/daily-details/', views.get_daily_details, name='get_daily_details'),
    path('records/<int:record_id>/', views.get_record_detail, name='get_record_detail'),
    path('records/<int:record_id>/update/', views.update_record, name='update_record'),
    path('records/<int:record_id>/delete/', views.delete_record, name='delete_record'),

    # 学生管理
    path('students/', views.list_students, name='list_students'),
    path('students/add/', views.add_student, name='add_student'),
    path('students/<int:student_id>/', views.update_student, name='update_student'),
    path('students/<int:student_id>/delete/', views.delete_student, name='delete_student'),
    path('students/<int:student_id>/history/', views.get_student_history, name='get_student_history'),
    path('students/focused/', views.get_focused_students, name='get_focused_students'),

    # 配置管理
    path('config/<str:key>/', views.get_config, name='get_config'),
    path('config/<str:key>/set/', views.set_config, name='set_config'),

    # 统计数据
    path('stats/', views.get_stats, name='get_stats'),

    # 数据管理
    path('data/export/', views.export_data, name='export_data'),
    path('data/import/', views.import_data, name='import_data'),
    path('data/clear/', views.clear_all_data, name='clear_all_data'),
]