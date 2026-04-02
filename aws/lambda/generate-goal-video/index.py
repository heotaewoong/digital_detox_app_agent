"""
Multi-Agent Goal Video Generator v2
목표 달성 과정을 담은 고퀄리티 영상을 자동 생성합니다.

Agent 1 (Story Writer): Claude 3.5 Sonnet → 목표 달성 서사 스크립트 생성
Agent 2 (Scene Director): Claude → 각 장면의 영상 프롬프트 최적화
Agent 3 (Video Generator): Runway Gen-3 Alpha → 장면별 영상 생성
Agent 4 (TTS Narrator): Amazon Polly → 감동적인 나레이션 음성
Agent 5 (Video Editor): FFmpeg → 장면 합치기 + 나레이션 합성
"""

import json
import boto3
import os
import time
import uuid
import requests
from typing import Optional

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
polly = boto3.client('polly', region_name='us-east-1')
s3 = boto3.client('s3')

BUCKET_NAME = os.environ.get('VIDEO_BUCKET', 'digital-detox-videos')
RUNWAY_API_KEY = os.environ.get('RUNWAY_API_KEY', '')
RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1'
VIDEO_EXPIRY = 86400  # 24시간


def lambda_handler(event, context):
    """
    입력:
    {
        "userId": "user123",
        "goals": [{"title": "중독 치료 기업 1위 대표", "description": "...", "category": "career"}],
        "dreams": ["세상을 바꾸는 기업가"],
        "blockedKeyword": "리그오브레전드",
        "videoStyle": "cinematic"  // cinematic | documentary | motivational
    }
    """
    try:
        user_id = event.get('userId', 'anonymous')
        goals = event.get('goals', [])
        dreams = event.get('dreams', [])
        blocked_keyword = event.get('blockedKeyword', '')
        video_style = event.get('videoStyle', 'cinematic')

        goal_title = goals[0].get('title', '더 나은 나') if goals else '더 나은 나'
        goal_desc = goals[0].get('description', '') if goals else ''
        dream = dreams[0] if dreams else '꿈을 이루는 것'

        print(f"[VideoGen] 시작 - 목표: {goal_title}")

        # Agent 1: 서사 스크립트 생성
        story = agent_story_writer(goal_title, goal_desc, dream, blocked_keyword, video_style)
        print(f"[Agent1] 스크립트 완료: {len(story['scenes'])}개 장면")

        # Agent 2: 영상 프롬프트 최적화
        optimized_scenes = agent_scene_director(story['scenes'], goal_title, video_style)
        print(f"[Agent2] 프롬프트 최적화 완료")

        # Agent 3: 영상 생성 (Runway Gen-3)
        video_clips = agent_video_generator(optimized_scenes, user_id)
        print(f"[Agent3] 영상 클립 {len(video_clips)}개 생성")

        # Agent 4: 나레이션 음성 생성
        audio_url = agent_tts_narrator(story['narration'], user_id)
        print(f"[Agent4] 나레이션 생성 완료")

        # Agent 5: 영상 편집 (클립 합치기)
        final_video_url = agent_video_editor(video_clips, audio_url, story, user_id)
        print(f"[Agent5] 최종 영상 완료: {final_video_url}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'videoUrl': final_video_url,
                'story': story,
                'goalTitle': goal_title,
                'expiresIn': VIDEO_EXPIRY,
            }, ensure_ascii=False)
        }

    except Exception as e:
        print(f"[VideoGen] 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


# ─── Agent 1: Story Writer ────────────────────────────────────────────

def agent_story_writer(goal_title: str, goal_desc: str, dream: str,
                        blocked_keyword: str, style: str) -> dict:
    """
    Claude 3.5 Sonnet으로 목표 달성 서사 스크립트를 생성합니다.
    실제 인생 여정처럼 역경과 성장을 담습니다.
    """
    style_guide = {
        'cinematic': '영화적이고 감동적인 스타일. 클로즈업과 와이드샷을 번갈아 사용.',
        'documentary': '다큐멘터리 스타일. 실제 같은 장면들.',
        'motivational': '에너지 넘치고 역동적인 스타일.',
    }.get(style, 'cinematic')

    prompt = f"""당신은 세계 최고의 동기부여 영상 감독입니다.

사용자 정보:
- 목표: {goal_title}
- 목표 설명: {goal_desc or '없음'}
- 꿈: {dream}
- 방금 차단된 것: {blocked_keyword} (이것 대신 목표에 집중해야 함)
- 영상 스타일: {style_guide}

이 사람의 목표 달성 여정을 담은 30초 영상 스크립트를 작성하세요.

요구사항:
1. 6개의 장면으로 구성 (각 5초)
2. 실제 인생처럼 역경, 실패, 극복, 성공의 서사
3. 감동적이고 생생한 장면 묘사
4. 각 장면은 구체적인 상황 (추상적 X)

JSON 형식으로만 응답:
{{
  "title": "영상 제목 (한국어, 감동적으로)",
  "scenes": [
    {{
      "index": 0,
      "title": "장면 제목 (한국어)",
      "situation": "구체적 상황 설명 (한국어, 2-3문장)",
      "videoPrompt": "Runway Gen-3용 영어 프롬프트 (매우 구체적, 50단어 이상)",
      "emotion": "장면의 감정 (한국어)",
      "duration": 5
    }}
  ],
  "narration": "전체 나레이션 (한국어, 감동적으로, 150자 이내)",
  "bgMusicMood": "배경음악 분위기 (영어: epic/emotional/uplifting/dramatic)"
}}

예시 장면 (목표: 중독 치료 기업 1위 대표):
- 장면1: 새벽 3시, 혼자 노트북 앞에서 코딩하는 청년
- 장면2: 첫 투자 거절, 빈 회의실에서 혼자 앉아있는 모습
- 장면3: 작은 팀과 함께 밤새 일하는 모습
- 장면4: 첫 고객의 감사 편지를 읽으며 눈물 흘리는 장면
- 장면5: 회사가 성장하고 직원들이 늘어나는 모습
- 장면6: 시상식에서 트로피를 들고 환호하는 장면"""

    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 2000,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    result = json.loads(response['body'].read())
    text = result['content'][0]['text']

    import re
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    # 기본값 (파싱 실패 시)
    return _default_story(goal_title, dream)


def _default_story(goal_title: str, dream: str) -> dict:
    return {
        'title': f'{goal_title}을 향한 여정',
        'scenes': [
            {'index': 0, 'title': '시작', 'situation': '모든 것이 시작되는 순간',
             'videoPrompt': f'A young determined person sitting alone at a desk late at night, laptop glowing, working hard toward their dream of {goal_title}, cinematic lighting, photorealistic',
             'emotion': '결의', 'duration': 5},
            {'index': 1, 'title': '역경', 'situation': '첫 번째 실패와 좌절',
             'videoPrompt': 'A person sitting alone in an empty office after failure, looking at rejection letters, but with determination in their eyes, dramatic lighting',
             'emotion': '좌절과 극복', 'duration': 5},
            {'index': 2, 'title': '성장', 'situation': '다시 일어서는 모습',
             'videoPrompt': 'A person standing up after failure, gathering their team, working together with passion and energy, warm lighting, motivational',
             'emotion': '희망', 'duration': 5},
            {'index': 3, 'title': '돌파구', 'situation': '첫 번째 성공의 순간',
             'videoPrompt': 'A breakthrough moment, person receiving good news, team celebrating small victory, emotional and joyful, cinematic',
             'emotion': '기쁨', 'duration': 5},
            {'index': 4, 'title': '성장', 'situation': '회사와 함께 성장하는 모습',
             'videoPrompt': 'A growing company, more people joining the team, busy office with energy and purpose, time-lapse style, inspiring',
             'emotion': '자부심', 'duration': 5},
            {'index': 5, 'title': '달성', 'situation': '목표를 달성하는 순간',
             'videoPrompt': f'A triumphant moment of achieving the goal of {goal_title}, award ceremony or celebration, tears of joy, epic cinematic shot, golden hour lighting',
             'emotion': '성취', 'duration': 5},
        ],
        'narration': f'{goal_title}. 이 꿈을 향해 달려온 모든 순간이 당신을 만들었습니다. 지금 이 순간도 그 여정의 일부입니다.',
        'bgMusicMood': 'epic'
    }


# ─── Agent 2: Scene Director ──────────────────────────────────────────

def agent_scene_director(scenes: list, goal_title: str, style: str) -> list:
    """
    각 장면의 Runway 프롬프트를 최적화합니다.
    Runway Gen-3에 최적화된 프롬프트 형식으로 변환합니다.
    """
    optimized = []
    for scene in scenes:
        base_prompt = scene.get('videoPrompt', '')

        # Runway Gen-3 최적화 프롬프트 형식
        # 카메라 무브먼트 + 조명 + 분위기 추가
        camera_moves = ['slow push in', 'gentle dolly forward', 'subtle zoom out', 'steady tracking shot']
        lighting = ['cinematic golden hour', 'dramatic side lighting', 'soft natural light', 'warm ambient light']

        import random
        enhanced = (
            f"{base_prompt}, "
            f"{random.choice(camera_moves)}, "
            f"{random.choice(lighting)}, "
            f"8K resolution, professional cinematography, "
            f"{'Korean' if '한국' in goal_title or '기업' in goal_title else 'Asian'} protagonist, "
            f"highly detailed, photorealistic"
        )

        optimized.append({
            **scene,
            'optimizedPrompt': enhanced,
        })

    return optimized


# ─── Agent 3: Video Generator (Runway Gen-3) ─────────────────────────

def agent_video_generator(scenes: list, user_id: str) -> list:
    """
    Runway Gen-3 Alpha API로 각 장면의 영상을 생성합니다.
    API 키가 없으면 이미지 기반 슬라이드쇼로 폴백합니다.
    """
    if not RUNWAY_API_KEY:
        print("[Agent3] Runway API 키 없음 - 이미지 기반 폴백 사용")
        return _generate_images_fallback(scenes, user_id)

    clips = []
    headers = {
        'Authorization': f'Bearer {RUNWAY_API_KEY}',
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
    }

    for scene in scenes:
        try:
            prompt = scene.get('optimizedPrompt', scene.get('videoPrompt', ''))

            # Runway Gen-3 Alpha Turbo (빠른 생성)
            response = requests.post(
                f'{RUNWAY_API_URL}/image_to_video',
                headers=headers,
                json={
                    'model': 'gen3a_turbo',
                    'promptText': prompt,
                    'duration': scene.get('duration', 5),
                    'ratio': '1280:720',
                    'watermark': False,
                },
                timeout=30
            )

            if response.status_code == 200:
                task_id = response.json().get('id')
                # 영상 생성 완료 대기
                video_url = _wait_for_runway_task(task_id, headers)
                if video_url:
                    # S3에 저장
                    s3_url = _save_video_to_s3(video_url, user_id, scene['index'])
                    clips.append({
                        'index': scene['index'],
                        'title': scene.get('title', ''),
                        'url': s3_url,
                        'duration': scene.get('duration', 5),
                        'type': 'video',
                    })
                    continue

        except Exception as e:
            print(f"[Agent3] 장면 {scene['index']} 생성 실패: {e}")

        # 실패 시 이미지 폴백
        clips.append({
            'index': scene['index'],
            'title': scene.get('title', ''),
            'url': None,
            'duration': scene.get('duration', 5),
            'type': 'fallback',
            'situation': scene.get('situation', ''),
        })

    return clips


def _wait_for_runway_task(task_id: str, headers: dict, max_wait: int = 120) -> Optional[str]:
    """Runway 작업 완료 대기"""
    for _ in range(max_wait // 5):
        time.sleep(5)
        response = requests.get(
            f'{RUNWAY_API_URL}/tasks/{task_id}',
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            status = data.get('status')
            if status == 'SUCCEEDED':
                return data.get('output', [None])[0]
            elif status in ['FAILED', 'CANCELLED']:
                return None
    return None


def _save_video_to_s3(video_url: str, user_id: str, index: int) -> str:
    """외부 영상 URL을 S3에 저장"""
    response = requests.get(video_url, timeout=60)
    key = f'videos/{user_id}/{uuid.uuid4()}/clip_{index}.mp4'
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=response.content,
        ContentType='video/mp4',
    )
    return s3.generate_presigned_url('get_object',
        Params={'Bucket': BUCKET_NAME, 'Key': key},
        ExpiresIn=VIDEO_EXPIRY)


def _generate_images_fallback(scenes: list, user_id: str) -> list:
    """Runway 없을 때 Titan Image로 이미지 생성 후 슬라이드쇼"""
    clips = []
    for scene in scenes:
        try:
            prompt = scene.get('optimizedPrompt', scene.get('videoPrompt', ''))
            response = bedrock.invoke_model(
                modelId='amazon.titan-image-generator-v1',
                body=json.dumps({
                    'taskType': 'TEXT_IMAGE',
                    'textToImageParams': {
                        'text': prompt[:512],
                        'negativeText': 'violence, adult content, low quality, blurry',
                    },
                    'imageGenerationConfig': {
                        'numberOfImages': 1,
                        'height': 720,
                        'width': 1280,
                        'cfgScale': 8.0,
                    }
                })
            )
            result = json.loads(response['body'].read())
            import base64
            img_data = base64.b64decode(result['images'][0])
            key = f'videos/{user_id}/{uuid.uuid4()}/frame_{scene["index"]}.jpg'
            s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=img_data, ContentType='image/jpeg')
            url = s3.generate_presigned_url('get_object',
                Params={'Bucket': BUCKET_NAME, 'Key': key}, ExpiresIn=VIDEO_EXPIRY)
            clips.append({
                'index': scene['index'],
                'title': scene.get('title', ''),
                'url': url,
                'duration': scene.get('duration', 5),
                'type': 'image',
                'situation': scene.get('situation', ''),
            })
        except Exception as e:
            print(f"[Fallback] 이미지 {scene['index']} 실패: {e}")
            clips.append({
                'index': scene['index'],
                'title': scene.get('title', ''),
                'url': None,
                'duration': scene.get('duration', 5),
                'type': 'text',
                'situation': scene.get('situation', ''),
            })
    return clips


# ─── Agent 4: TTS Narrator ────────────────────────────────────────────

def agent_tts_narrator(narration: str, user_id: str) -> Optional[str]:
    """Amazon Polly Neural TTS로 감동적인 나레이션 생성"""
    try:
        # SSML로 감정 표현 강화
        ssml_text = f"""<speak>
<prosody rate="slow" pitch="-2st">
<break time="500ms"/>
{narration}
<break time="1s"/>
</prosody>
</speak>"""

        response = polly.synthesize_speech(
            Text=ssml_text,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId='Seoyeon',
            LanguageCode='ko-KR',
            Engine='neural',
        )

        key = f'audio/{user_id}/{uuid.uuid4()}.mp3'
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=response['AudioStream'].read(),
            ContentType='audio/mpeg',
        )
        return s3.generate_presigned_url('get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': key}, ExpiresIn=VIDEO_EXPIRY)

    except Exception as e:
        print(f"[Agent4] TTS 실패: {e}")
        return None


# ─── Agent 5: Video Editor ────────────────────────────────────────────

def agent_video_editor(clips: list, audio_url: Optional[str],
                        story: dict, user_id: str) -> str:
    """
    영상 클립들을 합쳐 최종 영상을 만듭니다.
    실제 FFmpeg 합성은 Lambda Layer 필요.
    현재: 메타데이터 JSON 저장 → 프론트엔드에서 재생
    """
    video_id = str(uuid.uuid4())

    metadata = {
        'videoId': video_id,
        'userId': user_id,
        'title': story.get('title', '목표 달성 영상'),
        'narration': story.get('narration', ''),
        'bgMusicMood': story.get('bgMusicMood', 'epic'),
        'clips': clips,
        'audioUrl': audio_url,
        'totalDuration': sum(c.get('duration', 5) for c in clips),
        'createdAt': int(time.time()),
        'type': 'goal_video',
        'hasRealVideo': any(c.get('type') == 'video' for c in clips),
    }

    key = f'videos/{user_id}/{video_id}/metadata.json'
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=json.dumps(metadata, ensure_ascii=False),
        ContentType='application/json',
    )

    return s3.generate_presigned_url('get_object',
        Params={'Bucket': BUCKET_NAME, 'Key': key}, ExpiresIn=VIDEO_EXPIRY)
