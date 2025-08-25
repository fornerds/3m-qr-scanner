const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');

// AI 분석 함수 (기존 Vercel 코드 재사용)
async function analyzeShelfWithAI(image, products) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const productList = products.slice(0, 100).map(p => `- SKU: ${p.sku}, 이름: ${p.name}`).join('\n');
    
    // 🔍 AI에게 전달되는 제품 리스트 로깅
    console.log('=== AI에게 전달되는 제품 리스트 ===');
    console.log('총 제품 수:', products.length);
    console.log('분석 대상 제품 수:', Math.min(products.length, 100));
    console.log('제품 목록:');
    console.log(productList);
    
    // 🔍 OpenAI API 설정 로깅
    console.log('=== OpenAI API 요청 설정 ===');
    console.log('모델:', 'gpt-4o');
    console.log('온도:', 0.1);
    console.log('최대 토큰:', 1500);
    console.log('이미지 크기:', Math.ceil(image.length * 3/4), 'bytes');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `당신은 3M 제품을 전문적으로 식별하는 전문가입니다.

**매대/선반 이미지에서 다음 3M 제품들을 찾아주세요:**

${productList}

**중요한 식별 포인트:**
• 3M 브랜드 로고나 "POST-IT", "Post-it" 텍스트
• 포스트잇: 노란색, 분홍색, 파란색, 초록색, 라임색 등 다양한 색상의 사각형 메모지
• 플래그/인덱스: 작은 색상 탭이나 플래그 형태
• 투명 테이프나 접착 테이프
• 사무용품 패키지나 소매 포장

**분석 방법:**
1. 이미지에서 포스트잇, 메모지, 플래그, 테이프 등 3M 제품을 찾으세요
2. 색상, 모양, 크기, 패키지를 확인하세요
3. 제품명과 색상이 일치하는지 확인하세요 (예: "노랑" → 노란색 제품)
4. 브랜드 로고나 텍스트가 보이는지 확인하세요

**응답 형식:**
정확한 JSON 배열로만 응답해주세요. 찾은 제품이 없어도 빈 배열 []로 응답하세요.

[{"sku": "제품코드", "name": "제품명", "confidence": 신뢰도(0-1)}]

**예시:**
- 노란색 포스트잇이 보이면 → "POST-IT노트(656 노랑)" 찾기
- 분홍색 플래그가 보이면 → "3M플래그" 관련 제품 찾기
- 여러 색상 세트가 보이면 → "4색", "5색" 제품 찾기`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API 오류: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // 🔍 전체 OpenAI 응답 로깅
    console.log('=== OpenAI 전체 응답 ===');
    console.log(JSON.stringify(data, null, 2));
    
    const content = data.choices[0]?.message?.content;
    
    // 🔍 AI가 생성한 텍스트 응답 로깅
    console.log('=== OpenAI 텍스트 응답 ===');
    console.log(content);

    if (!content) {
      throw new Error('OpenAI 응답에 내용이 없습니다.');
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    // 🔍 JSON 추출 결과 로깅
    console.log('=== JSON 추출 결과 ===');
    console.log('JSON 매치:', jsonMatch ? jsonMatch[0] : 'JSON을 찾을 수 없음');
    
    if (!jsonMatch) {
      console.error('❌ AI 응답에서 JSON 배열을 찾을 수 없습니다.');
      console.error('전체 응답:', content);
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    try {
      const detectedProducts = JSON.parse(jsonMatch[0]);
      
      // 🔍 최종 파싱 결과 로깅
      console.log('=== 최종 파싱 결과 ===');
      console.log('파싱된 제품들:', JSON.stringify(detectedProducts, null, 2));
      console.log('유효한 제품 수:', detectedProducts.filter(p => p.sku && p.name).length);
      
      return detectedProducts.filter(p => p.sku && p.name);
    } catch (parseError) {
      console.error('❌ JSON 파싱 오류:', parseError);
      console.error('파싱 시도한 텍스트:', jsonMatch[0]);
      throw new Error(`JSON 파싱 실패: ${parseError.message}`);
    }

  } catch (error) {
    console.error('AI 분석 오류:', error);
    throw error;
  }
}

// 🤖 AI 선반 분석 (최적화된 버전)
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { image, products, storeId } = req.body;

    // 입력 데이터 검증
    if (!image || !products || !storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '필수 데이터가 누락되었습니다.',
        required: ['image', 'products', 'storeId']
      });
    }

    // 이미지 형식 검증
    const supportedFormats = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'];
    const isValidFormat = supportedFormats.some(format => image.startsWith(format));
    
    if (!isValidFormat) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IMAGE_FORMAT',
        message: '지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.',
        supportedFormats
      });
    }

    // 🚀 서버 사이드 크기 제한 (Express용)
    const imageSizeInBytes = Math.ceil(image.length * 3/4);
    const maxSizeInMB = 10; // Express에서는 더 큰 크기 허용
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (imageSizeInBytes > maxSizeInBytes) {
      return res.status(413).json({
        success: false,
        error: 'IMAGE_TOO_LARGE',
        message: `이미지 크기가 너무 큽니다. 최대 ${maxSizeInMB}MB까지 지원합니다. 현재 크기: ${(imageSizeInBytes / 1024 / 1024).toFixed(2)}MB`,
        currentSize: imageSizeInBytes,
        maxSize: maxSizeInBytes
      });
    }

    // 제품 리스트 크기 제한
    if (products.length > 5000) {
      return res.status(413).json({
        success: false,
        error: 'PRODUCT_LIST_TOO_LARGE',
        message: `제품 리스트가 너무 큽니다. 최대 5000개까지 지원합니다. 현재: ${products.length}개`,
        currentCount: products.length,
        maxCount: 5000
      });
    }

    console.log(`🤖 AI 분석 시작: 매장 ${storeId}, 제품 ${products.length}개`);

    // AI 분석 실행
    const detectedProducts = await analyzeShelfWithAI(image, products);
    
    console.log(`✅ AI 분석 완료: ${detectedProducts.length}개 제품 감지`);

    // MongoDB에 분석 결과 로깅 (선택적)
    if (process.env.LOG_AI_ANALYSIS === 'true') {
      try {
        const { db } = await connectToDatabase();
        await db.collection('ai_analysis_logs').insertOne({
          storeId: String(storeId),
          timestamp: new Date(),
          detectedCount: detectedProducts.length,
          imageSize: imageSizeInBytes,
          productCount: products.length,
          confidence: detectedProducts.reduce((sum, p) => sum + (p.confidence || 0), 0) / detectedProducts.length,
          status: 'success'
        });
      } catch (logError) {
        console.warn('AI 분석 로그 저장 실패:', logError.message);
      }
    }

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: detectedProducts,
      meta: {
        totalDetected: detectedProducts.length,
        imageSize: imageSizeInBytes,
        processedProducts: products.length,
        averageConfidence: detectedProducts.reduce((sum, p) => sum + (p.confidence || 0), 0) / detectedProducts.length || 0,
        storeId: String(storeId)
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ AI 분석 오류 (${responseTime}ms):`, error);
    
    // MongoDB 오류 로깅 (선택적)
    if (process.env.LOG_AI_ANALYSIS === 'true') {
      try {
        const { db } = await connectToDatabase();
        await db.collection('ai_analysis_logs').insertOne({
          storeId: String(req.body.storeId || 'unknown'),
          timestamp: new Date(),
          error: error.message,
          status: 'error',
          responseTime
        });
      } catch (logError) {
        console.warn('AI 오류 로그 저장 실패:', logError.message);
      }
    }

    // 에러 타입별 적절한 응답
    let statusCode = 500;
    let errorCode = 'AI_ANALYSIS_ERROR';
    
    if (error.message.includes('OpenAI API')) {
      statusCode = 503;
      errorCode = 'OPENAI_API_ERROR';
    } else if (error.message.includes('JSON')) {
      statusCode = 502;
      errorCode = 'AI_RESPONSE_PARSE_ERROR';
    }

    res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: 'AI 분석에 실패했습니다.',
      details: error.message,
      responseTime
    });
  }
});

module.exports = router;
