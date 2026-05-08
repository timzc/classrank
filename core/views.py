import json
from datetime import date, datetime
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Sum, Max, Q, Case, When, Value, IntegerField

from .models import Student, ScoreRecord, Config, AcademicYear
from .services.ocr_service import OCRService


def json_response(data, status=200):
    """统一JSON响应格式"""
    return JsonResponse(data, status=status, safe=False, json_dumps_params={'ensure_ascii': False})


# ==================== OCR解析 ====================

@csrf_exempt
@require_http_methods(["POST"])
def parse_image(request):
    """上传图片并OCR解析"""
    try:
        image_file = request.FILES.get('image')
        if not image_file:
            return json_response({'success': False, 'error': '请上传图片文件'}, 400)

        # 验证文件大小 (最大10MB)
        if image_file.size > 10 * 1024 * 1024:
            return json_response({'success': False, 'error': '图片大小不能超过10MB'}, 400)

        # 调用OCR服务
        ocr_service = OCRService()
        result = ocr_service.parse_image(image_file)

        if result['success']:
            return json_response({
                'success': True,
                'data': result['data']
            })
        else:
            return json_response({
                'success': False,
                'error': result['error']
            }, 500)

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 积分记录 ====================

@csrf_exempt
@require_http_methods(["POST"])
def save_records(request):
    """保存解析结果"""
    try:
        data = json.loads(request.body)
        record_date = data.get('date', date.today().isoformat())
        students_data = data.get('students', [])
        year_id = data.get('academic_year_id')

        if not students_data:
            return json_response({'success': False, 'error': '没有学生数据'}, 400)

        # 解析日期
        if isinstance(record_date, str):
            record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

        # 确定学年
        academic_year = None
        if year_id and year_id != 'all':
            try:
                academic_year = AcademicYear.objects.get(pk=int(year_id))
            except AcademicYear.DoesNotExist:
                pass
        if academic_year is None:
            academic_year = AcademicYear.objects.filter(is_active=True).first()

        saved_count = 0

        with transaction.atomic():
            for student_data in students_data:
                name = student_data.get('name', '').strip()
                if not name:
                    continue

                # 创建或获取学生
                student, created = Student.objects.get_or_create(
                    name=name,
                    defaults={'is_focused': False}
                )

                # 创建加分记录
                for bonus in student_data.get('bonus', []):
                    ScoreRecord.objects.create(
                        student=student,
                        academic_year=academic_year,
                        date=record_date,
                        type='bonus',
                        item=bonus.get('item', ''),
                        score=bonus.get('score', 0)
                    )

                # 创建减分记录
                for penalty in student_data.get('penalty', []):
                    ScoreRecord.objects.create(
                        student=student,
                        academic_year=academic_year,
                        date=record_date,
                        type='penalty',
                        item=penalty.get('item', ''),
                        score=penalty.get('score', 0)
                    )

                saved_count += 1

        return json_response({
            'success': True,
            'data': {
                'saved_count': saved_count,
                'date': record_date.isoformat()
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


def _parse_year_id(request):
    """从请求中解析 academic_year_id，返回 int 或 None（None 表示全部）"""
    raw = request.GET.get('academic_year_id') or request.POST.get('academic_year_id')
    if raw and raw != 'all':
        try:
            return int(raw)
        except ValueError:
            pass
    return None


def _records_qs(year_id=None):
    """返回按学年过滤的 ScoreRecord queryset"""
    qs = ScoreRecord.objects.select_related('student')
    if year_id is not None:
        qs = qs.filter(academic_year_id=year_id)
    return qs


@require_http_methods(["GET"])
def get_records(request):
    """获取积分数据"""
    try:
        view_type = request.GET.get('type', 'daily')
        record_date = request.GET.get('date', date.today().isoformat())
        year_id = _parse_year_id(request)

        if isinstance(record_date, str):
            record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

        if view_type == 'daily':
            records = _records_qs(year_id).filter(date=record_date)
            student_scores = {}
            for r in records:
                if r.student.id not in student_scores:
                    student_scores[r.student.id] = {
                        'id': r.student.id,
                        'name': r.student.name,
                        'score': 0,
                        'is_focused': r.student.is_focused
                    }
                student_scores[r.student.id]['score'] += r.signed_score
            data = list(student_scores.values())
        else:
            records = _records_qs(year_id)
            student_scores = {}
            for r in records:
                if r.student.id not in student_scores:
                    student_scores[r.student.id] = {
                        'id': r.student.id,
                        'name': r.student.name,
                        'score': 0,
                        'is_focused': r.student.is_focused
                    }
                student_scores[r.student.id]['score'] += r.signed_score
            data = list(student_scores.values())

        data.sort(key=lambda x: x['score'], reverse=True)

        return json_response({
            'success': True,
            'data': {
                'type': view_type,
                'date': record_date.isoformat(),
                'records': data
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@require_http_methods(["GET"])
def get_record_detail(request, record_id):
    """获取积分记录详情"""
    try:
        record = ScoreRecord.objects.get(pk=record_id)

        return json_response({
            'success': True,
            'data': {
                'id': record.id,
                'student_id': record.student.id,
                'student_name': record.student.name,
                'date': record.date.isoformat(),
                'type': record.type,
                'item': record.item,
                'score': record.score
            }
        })

    except ScoreRecord.DoesNotExist:
        return json_response({'success': False, 'error': '记录不存在'}, 404)


@require_http_methods(["GET"])
def get_daily_details(request):
    """获取当日明细列表"""
    try:
        record_date = request.GET.get('date', date.today().isoformat())
        year_id = _parse_year_id(request)
        if isinstance(record_date, str):
            record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

        records = _records_qs(year_id).filter(date=record_date)

        # 按学生分组
        student_records = {}
        for r in records:
            if r.student.id not in student_records:
                student_records[r.student.id] = {
                    'student_id': r.student.id,
                    'student_name': r.student.name,
                    'is_focused': r.student.is_focused,
                    'bonus': [],
                    'penalty': [],
                    'net_score': 0
                }
            if r.type == 'bonus':
                student_records[r.student.id]['bonus'].append({
                    'id': r.id,
                    'item': r.item,
                    'score': r.score
                })
                student_records[r.student.id]['net_score'] += r.score
            else:
                student_records[r.student.id]['penalty'].append({
                    'id': r.id,
                    'item': r.item,
                    'score': r.score
                })
                student_records[r.student.id]['net_score'] -= r.score

        data = list(student_records.values())
        # 按净得分排序
        data.sort(key=lambda x: x['net_score'], reverse=True)

        return json_response({
            'success': True,
            'data': {
                'date': record_date.isoformat(),
                'records': data
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["PUT"])
def update_record(request, record_id):
    """更新单条积分记录"""
    try:
        record = ScoreRecord.objects.get(pk=record_id)
        data = json.loads(request.body)

        student_name = data.get('student_name', '').strip()
        item = data.get('item', '').strip()
        score = data.get('score')
        record_type = data.get('type')

        if not student_name:
            return json_response({'success': False, 'error': '学生姓名不能为空'}, 400)

        old_student = None

        # 更新学生
        if student_name != record.student.name:
            new_student, created = Student.objects.get_or_create(
                name=student_name,
                defaults={'is_focused': False}
            )
            old_student = record.student
            record.student = new_student

        # 更新其他字段
        if item is not None:
            record.item = item
        if score is not None:
            record.score = int(score)
        if record_type in ['bonus', 'penalty']:
            record.type = record_type

        record.save()

        # 保存后再检查旧学生是否需要清理
        if old_student and old_student.records.count() == 0 and not old_student.is_focused:
            old_student.delete()

        return json_response({
            'success': True,
            'data': {
                'id': record.id
            }
        })

    except ScoreRecord.DoesNotExist:
        return json_response({'success': False, 'error': '记录不存在'}, 404)
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_records_by_date(request):
    """删除某一天的所有积分记录"""
    try:
        record_date = request.GET.get('date')
        if not record_date:
            return json_response({'success': False, 'error': '请指定日期'}, 400)

        record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

        with transaction.atomic():
            records = ScoreRecord.objects.filter(date=record_date)
            deleted_count = records.count()
            # 找出受影响的学生
            student_ids = list(records.values_list('student_id', flat=True).distinct())
            records.delete()

            # 清理没有记录且未关注的学生
            for student in Student.objects.filter(id__in=student_ids):
                if student.records.count() == 0 and not student.is_focused:
                    student.delete()

        return json_response({
            'success': True,
            'message': f'已删除 {record_date} 的 {deleted_count} 条记录'
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_record(request, record_id):
    """删除单条积分记录"""
    try:
        record = ScoreRecord.objects.get(pk=record_id)
        student = record.student

        record.delete()

        # 如果学生没有其他记录且不关注，删除学生
        if student.records.count() == 0 and not student.is_focused:
            student.delete()

        return json_response({
            'success': True,
            'message': '删除成功'
        })

    except ScoreRecord.DoesNotExist:
        return json_response({'success': False, 'error': '记录不存在'}, 404)
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 学生管理 ====================

@require_http_methods(["GET"])
def get_student_history(request, student_id):
    """获取学生历史得分记录"""
    try:
        student = Student.objects.get(pk=student_id)
        year_id = _parse_year_id(request)
        records = _records_qs(year_id).filter(student=student).order_by('-date', '-type')

        # 按日期分组
        date_groups = {}
        for r in records:
            date_str = r.date.isoformat()
            if date_str not in date_groups:
                date_groups[date_str] = {
                    'date': date_str,
                    'bonus': [],
                    'penalty': [],
                    'net_score': 0
                }
            if r.type == 'bonus':
                date_groups[date_str]['bonus'].append({
                    'id': r.id,
                    'item': r.item,
                    'score': r.score
                })
                date_groups[date_str]['net_score'] += r.score
            else:
                date_groups[date_str]['penalty'].append({
                    'id': r.id,
                    'item': r.item,
                    'score': r.score
                })
                date_groups[date_str]['net_score'] -= r.score

        # 按日期排序
        history = list(date_groups.values())
        history.sort(key=lambda x: x['date'], reverse=True)

        return json_response({
            'success': True,
            'data': {
                'student_id': student.id,
                'student_name': student.name,
                'is_focused': student.is_focused,
                'total_score': student.total_score,
                'history': history
            }
        })

    except Student.DoesNotExist:
        return json_response({'success': False, 'error': '学生不存在'}, 404)
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@require_http_methods(["GET"])
def list_students(request):
    """获取学生列表"""
    try:
        year_id = _parse_year_id(request)

        # 计算每位学生在指定学年的累计积分
        records = _records_qs(year_id)
        score_map = {}
        for r in records:
            score_map[r.student_id] = score_map.get(r.student_id, 0) + r.signed_score

        students = Student.objects.all()
        data = [{
            'id': s.id,
            'name': s.name,
            'total_score': score_map.get(s.id, 0),
            'is_focused': s.is_focused
        } for s in students]

        return json_response({
            'success': True,
            'data': data
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["POST"])
def add_student(request):
    """添加学生"""
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        is_focused = data.get('is_focused', False)

        if not name:
            return json_response({'success': False, 'error': '请输入学生姓名'}, 400)

        student = Student.objects.create(
            name=name,
            is_focused=is_focused
        )

        return json_response({
            'success': True,
            'data': {
                'id': student.id,
                'name': student.name,
                'is_focused': student.is_focused
            }
        })

    except Exception as e:
        if 'unique constraint' in str(e).lower():
            return json_response({'success': False, 'error': '学生姓名已存在'}, 400)
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["PUT"])
def update_student(request, student_id):
    """更新学生"""
    try:
        student = Student.objects.get(pk=student_id)
        data = json.loads(request.body)

        with transaction.atomic():
            if 'name' in data:
                student.name = data['name'].strip()
            if 'is_focused' in data:
                student.is_focused = data['is_focused']

            student.save()

            # 处理累积分数调整
            if 'total_score' in data:
                desired_total = int(data['total_score'])
                # 按当前选中学年计算已有积分
                year_id = data.get('academic_year_id')
                if year_id and year_id != 'all':
                    try:
                        adjust_year = AcademicYear.objects.get(pk=int(year_id))
                    except AcademicYear.DoesNotExist:
                        adjust_year = AcademicYear.objects.filter(is_active=True).first()
                else:
                    adjust_year = AcademicYear.objects.filter(is_active=True).first()

                if adjust_year:
                    current_total = sum(
                        r.signed_score for r in student.records.filter(academic_year=adjust_year)
                    )
                else:
                    current_total = student.total_score

                diff = desired_total - current_total

                if diff != 0:
                    today = date.today()
                    ScoreRecord.objects.create(
                        student=student,
                        academic_year=adjust_year,
                        date=today,
                        type='bonus' if diff > 0 else 'penalty',
                        item='手动调整',
                        score=abs(diff)
                    )

        return json_response({
            'success': True,
            'data': {
                'id': student.id,
                'name': student.name,
                'is_focused': student.is_focused
            }
        })

    except Student.DoesNotExist:
        return json_response({'success': False, 'error': '学生不存在'}, 404)
    except Exception as e:
        if 'unique constraint' in str(e).lower():
            return json_response({'success': False, 'error': '学生姓名已存在'}, 400)
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_student(request, student_id):
    """删除学生"""
    try:
        student = Student.objects.get(pk=student_id)
        student.delete()

        return json_response({
            'success': True,
            'message': '删除成功'
        })

    except Student.DoesNotExist:
        return json_response({'success': False, 'error': '学生不存在'}, 404)


@require_http_methods(["GET"])
def get_focused_students(request):
    """获取关注学生列表"""
    try:
        students = Student.objects.filter(is_focused=True)
        data = [{
            'id': s.id,
            'name': s.name
        } for s in students]

        return json_response({
            'success': True,
            'data': data
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 配置管理 ====================

@require_http_methods(["GET"])
def get_config(request, key):
    """获取配置"""
    try:
        value = Config.get_value(key)
        return json_response({
            'success': True,
            'data': {
                'key': key,
                'value': value
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["PUT"])
def set_config(request, key):
    """设置配置"""
    try:
        data = json.loads(request.body)
        value = data.get('value', '')

        Config.set_value(key, value)

        return json_response({
            'success': True,
            'message': '配置已保存'
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 统计数据 ====================

@require_http_methods(["GET"])
def get_stats(request):
    """获取统计数据"""
    try:
        record_date = request.GET.get('date', date.today().isoformat())
        year_id = _parse_year_id(request)
        if isinstance(record_date, str):
            record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

        total_students = Student.objects.count()
        focused_students = Student.objects.filter(is_focused=True).count()

        # 当日分数统计
        daily_records = _records_qs(year_id).filter(date=record_date)
        student_scores = {}
        for r in daily_records:
            if r.student_id not in student_scores:
                student_scores[r.student_id] = 0
            student_scores[r.student_id] += r.signed_score

        scores = list(student_scores.values())
        highest = max(scores) if scores else 0
        lowest = min(scores) if scores else 0

        # 累积最高分（按学年过滤）
        cumulative_scores = {}
        for r in _records_qs(year_id):
            if r.student_id not in cumulative_scores:
                cumulative_scores[r.student_id] = 0
            cumulative_scores[r.student_id] += r.signed_score
        cumulative_max = max(cumulative_scores.values()) if cumulative_scores else 0

        return json_response({
            'success': True,
            'data': {
                'total_students': total_students,
                'focused_students': focused_students,
                'highest_score': highest,
                'lowest_score': lowest,
                'cumulative_highest': cumulative_max
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 数据管理 ====================

@require_http_methods(["GET"])
def export_data(request):
    """导出所有数据"""
    try:
        students = []
        for s in Student.objects.all():
            student_data = {
                'name': s.name,
                'is_focused': s.is_focused,
                'records': []
            }
            for r in s.records.all():
                student_data['records'].append({
                    'date': r.date.isoformat(),
                    'type': r.type,
                    'item': r.item,
                    'score': r.score
                })
            students.append(student_data)

        configs = {}
        for c in Config.objects.all():
            configs[c.key] = c.value

        return json_response({
            'success': True,
            'data': {
                'students': students,
                'configs': configs,
                'export_time': datetime.now().isoformat()
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["POST"])
def import_data(request):
    """导入数据"""
    try:
        data = json.loads(request.body)
        students_data = data.get('students', [])
        configs_data = data.get('configs', {})

        imported_students = 0
        imported_records = 0

        with transaction.atomic():
            for student_data in students_data:
                name = student_data.get('name', '').strip()
                if not name:
                    continue

                student, created = Student.objects.get_or_create(
                    name=name,
                    defaults={'is_focused': student_data.get('is_focused', False)}
                )
                if not created:
                    student.is_focused = student_data.get('is_focused', student.is_focused)
                    student.save()

                imported_students += 1

                for record_data in student_data.get('records', []):
                    record_date = record_data.get('date')
                    if isinstance(record_date, str):
                        record_date = datetime.strptime(record_date, '%Y-%m-%d').date()

                    record_type = record_data.get('type', 'bonus')
                    item = record_data.get('item', '')
                    score = record_data.get('score', 0)

                    # 跳过已存在的相同记录
                    exists = ScoreRecord.objects.filter(
                        student=student,
                        date=record_date,
                        type=record_type,
                        item=item,
                        score=score
                    ).exists()
                    if not exists:
                        ScoreRecord.objects.create(
                            student=student,
                            date=record_date,
                            type=record_type,
                            item=item,
                            score=score
                        )
                        imported_records += 1

            for key, value in configs_data.items():
                Config.set_value(key, value)

        return json_response({
            'success': True,
            'data': {
                'imported_students': imported_students,
                'imported_records': imported_records
            }
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["POST"])
def clear_all_data(request):
    """清空所有数据"""
    try:
        ScoreRecord.objects.all().delete()
        Student.objects.all().delete()

        return json_response({
            'success': True,
            'message': '所有数据已清空'
        })

    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


# ==================== 学年管理 ====================

@require_http_methods(["GET"])
def list_academic_years(request):
    """获取所有学年"""
    try:
        years = AcademicYear.objects.all()
        data = [{
            'id': y.id,
            'name': y.name,
            'order': y.order,
            'is_active': y.is_active,
        } for y in years]
        return json_response({'success': True, 'data': data})
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["POST"])
def add_academic_year(request):
    """新增学年"""
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        order = int(data.get('order', 0))
        if not name:
            return json_response({'success': False, 'error': '请输入学年名称'}, 400)

        year = AcademicYear.objects.create(name=name, order=order)
        return json_response({
            'success': True,
            'data': {'id': year.id, 'name': year.name, 'order': year.order, 'is_active': year.is_active}
        })
    except Exception as e:
        if 'unique' in str(e).lower():
            return json_response({'success': False, 'error': '学年名称已存在'}, 400)
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["PUT"])
def update_academic_year(request, year_id):
    """更新学年（名称/排序）"""
    try:
        year = AcademicYear.objects.get(pk=year_id)
        data = json.loads(request.body)
        if 'name' in data:
            year.name = data['name'].strip()
        if 'order' in data:
            year.order = int(data['order'])
        year.save()
        return json_response({
            'success': True,
            'data': {'id': year.id, 'name': year.name, 'order': year.order, 'is_active': year.is_active}
        })
    except AcademicYear.DoesNotExist:
        return json_response({'success': False, 'error': '学年不存在'}, 404)
    except Exception as e:
        if 'unique' in str(e).lower():
            return json_response({'success': False, 'error': '学年名称已存在'}, 400)
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_academic_year(request, year_id):
    """删除学年（关联积分记录的学年字段置空）"""
    try:
        year = AcademicYear.objects.get(pk=year_id)
        year.delete()
        return json_response({'success': True, 'message': '删除成功'})
    except AcademicYear.DoesNotExist:
        return json_response({'success': False, 'error': '学年不存在'}, 404)
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)


@csrf_exempt
@require_http_methods(["PUT"])
def activate_academic_year(request, year_id):
    """将某学年设为当前学年"""
    try:
        year = AcademicYear.objects.get(pk=year_id)
        year.activate()
        return json_response({'success': True, 'message': f'已将 {year.name} 设为当前学年'})
    except AcademicYear.DoesNotExist:
        return json_response({'success': False, 'error': '学年不存在'}, 404)
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, 500)