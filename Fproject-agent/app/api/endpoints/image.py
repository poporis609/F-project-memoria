"""
Image Generation Endpoint
"""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import json

router = APIRouter()


@router.post("")
async def generate_image(request: Request):
    """
    이미지 생성 엔드포인트 - Agent 우회하고 Tools 직접 호출
    """
    try:
        from app.services.orchestrator.image_generator.tools import ImageGeneratorTools
        
        body = await request.json()
        
        print(f"[DEBUG] ========== Image Generation 시작 ==========")
        print(f"[DEBUG] Request body: {json.dumps(body, ensure_ascii=False)[:200]}...")
        
        action = body.get('action', 'generate')
        user_id = body.get('user_id')
        text = body.get('text')
        image_base64 = body.get('image_base64')
        record_date = body.get('record_date')
        
        tools = ImageGeneratorTools()
        
        # 1. 이미지 생성 (미리보기)
        if action == 'generate':
            if not text:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "text가 필요합니다."
                    }
                )
            
            result = await tools.generate_image_from_text(text)
            
            # 프론트엔드 형식에 맞게 변환 (snake_case → camelCase)
            if result.get('success') and 'image_base64' in result:
                response = {
                    "success": True,
                    "imageBase64": result['image_base64'],
                    "prompt": result.get('prompt', {})
                }
            else:
                response = result
            
            print(f"[DEBUG] Image generated: {response.get('success')}")
            print(f"[DEBUG] ========== Image Generation 완료 ==========")
            return JSONResponse(content=response)
        
        # 2. S3 업로드
        elif action == 'upload':
            if not user_id or not image_base64:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "user_id와 image_base64가 필요합니다."
                    }
                )
            
            result = await tools.upload_image_to_s3(user_id, image_base64, record_date)
            
            # 프론트엔드 형식에 맞게 변환
            if result.get('success'):
                response = {
                    "success": True,
                    "userId": result.get('user_id'),
                    "s3Key": result.get('s3_key'),
                    "imageUrl": result.get('image_url')
                }
            else:
                response = result
            
            print(f"[DEBUG] Image uploaded: {response.get('success')}")
            print(f"[DEBUG] ========== Image Upload 완료 ==========")
            return JSONResponse(content=response)
        
        # 3. 프롬프트만 생성
        elif action == 'prompt':
            if not text:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "text가 필요합니다."
                    }
                )
            
            result = await tools.build_prompt_from_text(text)
            
            # 프론트엔드 형식에 맞게 변환
            if result.get('success'):
                response = {
                    "success": True,
                    "positivePrompt": result.get('positive_prompt'),
                    "negativePrompt": result.get('negative_prompt')
                }
            else:
                response = result
            
            print(f"[DEBUG] Prompt generated: {response.get('success')}")
            print(f"[DEBUG] ========== Prompt Generation 완료 ==========")
            return JSONResponse(content=response)
        
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"알 수 없는 action: {action}"
                }
            )
        
    except Exception as e:
        print(f"[ERROR] Image generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"이미지 생성 중 오류가 발생했습니다: {str(e)}"
            }
        )
