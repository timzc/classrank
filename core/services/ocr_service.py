"""
SiliconFlow OCR Service
"""
import base64
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.conf import settings
from core.models import Config


class OCRService:
    """OCR解析服务"""

    PROMPT_TEMPLATE = """你是一个教育评分助手。请分析这张学生考评图片，提取以下信息并以JSON格式返回：

1. 识别图片中的所有学生姓名
2. 每个学生的加分项及分数
3. 每个学生的减分项及分数
4. 计算每个学生的净得分

返回格式（严格遵循）：
{
  "students": [
    {
      "name": "学生姓名",
      "bonus": [
        {"item": "加分项目", "score": 分数值},
        {"item": "加分项目2", "score": 分数值}
      ],
      "penalty": [
        {"item": "减分项目", "score": 分数值}
      ],
      "net_score": 净得分(加分总和-减分总和)
    }
  ],
  "class_info": "班级信息（如有则提取，没有则为空字符串）",
  "date": "考评日期（如有则提取，格式为YYYY-MM-DD，没有则为空字符串）"
}

重要提示：
1. 请确保准确识别每个学生的姓名
2. 加分项和减分项要准确提取项目名称和对应分数
3. net_score必须等于所有加分分数之和减去所有减分分数之和
4. 只返回JSON，不要有任何其他说明文字或markdown格式标记"""

    def __init__(self):
        self.api_key = self._get_api_key()
        self.model = self._get_model()
        self.api_url = settings.SILICONFLOW_API_URL
        self.session = self._create_session()

    def _create_session(self):
        """创建带重试机制的requests session"""
        session = requests.Session()

        # 配置重试策略
        retry_strategy = Retry(
            total=3,  # 最多重试3次
            backoff_factor=1,  # 重试间隔: 1s, 2s, 4s
            status_forcelist=[429, 500, 502, 503, 504],  # 这些状态码触发重试
            allowed_methods=["POST"],  # 允许POST请求重试
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        return session

    def _get_api_key(self):
        """获取API Key，优先从数据库配置，其次从环境变量"""
        db_key = Config.get_value('siliconflow_api_key')
        if db_key:
            return db_key
        return settings.SILICONFLOW_API_KEY

    def _get_model(self):
        """获取模型名称，优先从数据库配置，其次从环境变量"""
        db_model = Config.get_value('siliconflow_model')
        if db_model:
            return db_model
        return settings.SILICONFLOW_MODEL

    def parse_image(self, image_file):
        """
        解析图片

        Args:
            image_file: Django UploadedFile对象或文件路径

        Returns:
            dict: 解析结果
        """
        # 读取图片并转base64
        if hasattr(image_file, 'read'):
            # Django UploadedFile
            image_data = image_file.read()
            image_file.seek(0)  # 重置文件指针
        else:
            # 文件路径
            with open(image_file, 'rb') as f:
                image_data = f.read()

        image_base64 = base64.b64encode(image_data).decode('utf-8')

        # 判断图片格式
        content_type = 'image/jpeg'
        if hasattr(image_file, 'content_type'):
            content_type = image_file.content_type
        elif hasattr(image_file, 'name'):
            ext = image_file.name.lower().split('.')[-1]
            content_type_map = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            }
            content_type = content_type_map.get(ext, 'image/jpeg')

        # 构建请求
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": self.PROMPT_TEMPLATE
                        }
                    ]
                }
            ],
            "max_tokens": 4096,
            "temperature": 0.1  # 低温度以获得更稳定的输出
        }

        try:
            # 检查API Key是否配置
            if not self.api_key:
                return {
                    'success': False,
                    'error': '未配置API Key，请在系统设置中配置SiliconFlow API Key'
                }

            response = self.session.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=60
            )

            # 添加更详细的错误信息
            if response.status_code == 401:
                return {
                    'success': False,
                    'error': 'API Key无效或已过期，请检查系统设置中的API Key是否正确'
                }
            elif response.status_code == 402:
                return {
                    'success': False,
                    'error': 'API余额不足，请充值后重试'
                }
            elif response.status_code == 429:
                return {
                    'success': False,
                    'error': '请求过于频繁，请稍后重试'
                }

            response.raise_for_status()

            result = response.json()
            content = result['choices'][0]['message']['content']

            # 解析JSON
            parsed_result = self._parse_response(content)
            return {
                'success': True,
                'data': parsed_result
            }

        except requests.exceptions.SSLError as e:
            return {
                'success': False,
                'error': 'SSL连接错误，请检查网络环境或稍后重试。如问题持续，请尝试使用手动输入功能。'
            }
        except requests.exceptions.ConnectionError as e:
            return {
                'success': False,
                'error': '网络连接失败，请检查网络后重试'
            }
        except requests.exceptions.Timeout as e:
            return {
                'success': False,
                'error': '请求超时，请稍后重试'
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'API请求失败: {str(e)}'
            }
        except (KeyError, json.JSONDecodeError) as e:
            return {
                'success': False,
                'error': f'解析响应失败: {str(e)}'
            }

    def _parse_response(self, content):
        """解析API响应内容"""
        # 尝试提取JSON部分
        content = content.strip()

        # 移除可能的markdown代码块标记
        if content.startswith('```json'):
            content = content[7:]
        elif content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]

        content = content.strip()

        # 解析JSON
        data = json.loads(content)

        # 验证数据结构
        if 'students' not in data:
            data['students'] = []

        # 确保每个学生的数据完整
        for student in data['students']:
            if 'bonus' not in student:
                student['bonus'] = []
            if 'penalty' not in student:
                student['penalty'] = []
            if 'net_score' not in student:
                bonus_sum = sum(b.get('score', 0) for b in student['bonus'])
                penalty_sum = sum(p.get('score', 0) for p in student['penalty'])
                student['net_score'] = bonus_sum - penalty_sum

        return data

    @staticmethod
    def get_available_models():
        """获取可用的模型列表"""
        return [
            {'id': 'Qwen/Qwen2.5-VL-32B-Instruct', 'name': 'Qwen2.5-VL-32B-Instruct (推荐)'},
            {'id': 'Qwen/Qwen2-VL-72B-Instruct', 'name': 'Qwen2-VL-72B-Instruct'},
            {'id': 'Qwen/Qwen2-VL-7B-Instruct', 'name': 'Qwen2-VL-7B-Instruct'},
            {'id': 'deepseek-ai/deepseek-vl2', 'name': 'DeepSeek-VL2'},
        ]