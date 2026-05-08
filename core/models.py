from django.db import models


class AcademicYear(models.Model):
    """学年模型"""
    name = models.CharField('学年名称', max_length=50, unique=True)
    order = models.PositiveIntegerField('排序', default=0)
    is_active = models.BooleanField('是否当前学年', default=False)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '学年'
        verbose_name_plural = '学年'
        ordering = ['order', 'id']

    def __str__(self):
        return self.name

    def activate(self):
        """设为当前学年，同时取消其他学年的激活状态"""
        AcademicYear.objects.exclude(pk=self.pk).update(is_active=False)
        self.is_active = True
        self.save(update_fields=['is_active'])


class Student(models.Model):
    """学生模型"""
    name = models.CharField('学生姓名', max_length=50, unique=True)
    is_focused = models.BooleanField('是否关注', default=False)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '学生'
        verbose_name_plural = '学生'
        ordering = ['-is_focused', 'name']

    def __str__(self):
        return self.name

    @property
    def total_score(self):
        """计算累积总分"""
        bonus = self.records.filter(type='bonus').aggregate(
            total=models.Sum('score')
        )['total'] or 0
        penalty = self.records.filter(type='penalty').aggregate(
            total=models.Sum('score')
        )['total'] or 0
        return bonus - penalty


class ScoreRecord(models.Model):
    """积分记录模型 - 每条记录就是一个加减分项"""
    TYPE_CHOICES = [
        ('bonus', '加分'),
        ('penalty', '减分'),
    ]

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='records',
        verbose_name='学生'
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='score_records',
        verbose_name='学年'
    )
    date = models.DateField('考评日期')
    type = models.CharField('类型', max_length=10, choices=TYPE_CHOICES)
    item = models.CharField('项目描述', max_length=200)
    score = models.PositiveIntegerField('分数')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '积分记录'
        verbose_name_plural = '积分记录'
        ordering = ['-date', 'student__name', '-type']

    def __str__(self):
        sign = '+' if self.type == 'bonus' else '-'
        return f'{self.student.name} - {self.date} - {sign}{self.score} {self.item}'

    @property
    def signed_score(self):
        """带符号的分数"""
        return self.score if self.type == 'bonus' else -self.score


class Config(models.Model):
    """系统配置模型"""
    key = models.CharField('配置键', max_length=50, unique=True)
    value = models.TextField('配置值')
    description = models.CharField('配置说明', max_length=200, blank=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '系统配置'
        verbose_name_plural = '系统配置'

    def __str__(self):
        return self.key

    @classmethod
    def get_value(cls, key, default=''):
        """获取配置值"""
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default

    @classmethod
    def set_value(cls, key, value, description=''):
        """设置配置值"""
        obj, created = cls.objects.update_or_create(
            key=key,
            defaults={'value': value, 'description': description}
        )
        return obj