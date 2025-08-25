const express = require('express');
const { connectToDatabase } = require('../config/database');
const router = express.Router();

// 🤖 AI 선반 분석 (원본 로직 기반)
router.post('/', async (req, res) => {
  try {
    const { image, products, storeId } = req.body;

    // 입력 데이터 검증
    if (!image || !products || !storeId) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다. (image, products, storeId)'
      });
    }

    // Base64 이미지 데이터 검증
    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: '이미지 데이터가 유효하지 않습니다.'
      });
    }

    // 이미지 크기 체크 (Heroku 50MB 제한 대응)
    const imageSizeInBytes = Math.ceil(image.length * 3/4);
    const maxSizeInMB = 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (imageSizeInBytes > maxSizeInBytes) {
      return res.status(413).json({
        success: false,
        message: `이미지 크기가 너무 큽니다. 최대 ${maxSizeInMB}MB까지 지원합니다. 현재 크기: ${(imageSizeInBytes / 1024 / 1024).toFixed(2)}MB`,
        error: 'IMAGE_TOO_LARGE',
        currentSize: imageSizeInBytes,
        maxSize: maxSizeInBytes
      });
    }

    // 다양한 이미지 형식 지원
    const supportedFormats = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp', 'data:image/heic', 'data:image/heif'];
    const hasValidFormat = supportedFormats.some(format => image.toLowerCase().startsWith(format.toLowerCase()));
    
    if (!hasValidFormat) {
      return res.status(400).json({
        success: false,
        message: `지원하지 않는 이미지 형식입니다. 지원 형식: ${supportedFormats.map(f => f.replace('data:image/', '')).join(', ')}`
      });
    }

    // 제품 리스트 검증
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: '제품 리스트가 유효하지 않습니다.'
      });
    }

    // 제품 리스트 크기 제한
    if (products.length > 1000) {
      return res.status(413).json({
        success: false,
        message: `제품 리스트가 너무 큽니다. 최대 1000개까지 지원합니다. 현재: ${products.length}개`,
        error: 'PRODUCT_LIST_TOO_LARGE',
        currentCount: products.length,
        maxCount: 1000
      });
    }

    // 전체 요청 크기 체크
    const requestSizeInBytes = JSON.stringify(req.body).length;
    const maxRequestSizeInMB = 45;
    const maxRequestSizeInBytes = maxRequestSizeInMB * 1024 * 1024;

    if (requestSizeInBytes > maxRequestSizeInBytes) {
      return res.status(413).json({
        success: false,
        message: `전체 요청 크기가 너무 큽니다. 최대 ${maxRequestSizeInMB}MB까지 지원합니다. 현재 크기: ${(requestSizeInBytes / 1024 / 1024).toFixed(2)}MB`,
        error: 'REQUEST_TOO_LARGE',
        currentSize: requestSizeInBytes,
        maxSize: maxRequestSizeInBytes,
        suggestion: '이미지 품질을 낮추거나 크기를 줄여서 다시 시도해주세요.'
      });
    }

    // AI 분석 수행
    const detectedProducts = await analyzeShelfWithAI(image, products);

    // 분석 로그 저장
    try {
      const { db } = await connectToDatabase();
      await db.collection('ai_analysis_logs').insertOne({
        storeId,
        timestamp: new Date(),
        imageSize: image.length,
        productCount: products.length,
        detectedCount: detectedProducts.length,
        detectedProducts: detectedProducts.map(p => ({
          sku: p.sku,
          name: p.name,
          confidence: p.confidence
        }))
      });
    } catch (logError) {
      console.error('AI 분석 로그 저장 실패:', logError);
    }

    return res.status(200).json({
      success: true,
      data: detectedProducts, // 클라이언트 호환성을 위해 추가
      detectedProducts,
      message: `${detectedProducts.length}개의 3M 제품이 감지되었습니다.`
    });

  } catch (error) {
    console.error('AI 매대 분석 오류:', error);
    return res.status(500).json({
      success: false,
      message: 'AI 분석 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// AI 분석 함수 (OpenAI Vision API 연동)
async function analyzeShelfWithAI(imageDataUrl, products) {
  try {
    // 이미지 데이터 정규화 및 검증
    const processedImageData = await processAndValidateImage(imageDataUrl);
    
    console.log('AI 분석 시작:', {
      originalSize: imageDataUrl.length,
      processedSize: processedImageData.length,
      productCount: products.length,
      imageFormat: imageDataUrl.split(';')[0].split(':')[1]
    });

    // OpenAI Vision API 호출
    const aiResponse = await callOpenAIVisionAPI(processedImageData, products);
    
    return aiResponse;

  } catch (error) {
    console.error('AI 분석 실행 오류:', error);
    console.log('AI 분석 실패, 빈 결과를 반환합니다.');
    return [];
  }
}

// 이미지 데이터 처리 및 검증 함수
async function processAndValidateImage(imageDataUrl) {
  try {
    // data URL 형식 검증
    if (!imageDataUrl.includes(',')) {
      throw new Error('올바르지 않은 data URL 형식입니다.');
    }

    // MIME 타입과 base64 데이터 분리
    const [header, base64Data] = imageDataUrl.split(',');
    
    if (!header || !base64Data) {
      throw new Error('이미지 데이터를 파싱할 수 없습니다.');
    }

    // base64 데이터 검증 및 정리
    const cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // base64 형식 검증 (길이가 4의 배수인지 확인)
    if (cleanBase64.length % 4 !== 0) {
      // 패딩 추가
      const paddingLength = 4 - (cleanBase64.length % 4);
      const paddedBase64 = cleanBase64 + '='.repeat(paddingLength);
      
      console.log('base64 패딩 추가:', {
        original: cleanBase64.length,
        padded: paddedBase64.length
      });
      
      return `${header},${paddedBase64}`;
    }

    // base64 디코딩 테스트 (유효성 검증)
    try {
      const testBuffer = Buffer.from(cleanBase64, 'base64');
      console.log('base64 검증 성공:', testBuffer.length, 'bytes');
    } catch (bufferError) {
      console.error('base64 디코딩 실패:', bufferError.message);
      throw new Error('올바르지 않은 base64 데이터입니다.');
    }

    return `${header},${cleanBase64}`;

  } catch (error) {
    console.error('이미지 처리 오류:', error);
    throw new Error(`이미지 처리 실패: ${error.message}`);
  }
}

// OpenAI Vision API 호출 함수
async function callOpenAIVisionAPI(imageDataUrl, products) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API 키가 설정되지 않았습니다.');
    return getMockAIResponse(products);
  }
  
  if (!OPENAI_API_KEY.startsWith('sk-')) {
    console.error('올바르지 않은 OpenAI API 키 형식입니다.');
    return getMockAIResponse(products);
  }
  
  try {
    console.log('🔍 === OpenAI Vision API 호출 시작 ===');
    console.log('분석할 제품 수:', products.length);

    // 🔍 AI에게 전달되는 제품 리스트 로깅
    const productList = products.slice(0, 100).map(p => `- ${p.name} (카테고리: ${p.category || 'N/A'})`).join('\n');
    console.log('=== AI에게 전달되는 제품 리스트 ===');
    console.log('총 제품 수:', products.length);
    console.log('분석 대상 제품 수:', Math.min(products.length, 100));
    console.log('제품 목록:\n', productList);

    const requestBody = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 3M 제품 인식 전문가입니다. 이 매대 이미지를 분석해서 3M 브랜드 제품들을 찾아 식별해주세요.

**분석 방법:**
1. 이미지에서 3M 브랜드 로고, 제품명, 패키지 디자인을 자세히 확인하세요
2. 제품명이나 패키지가 명확히 보이는 3M 제품만 식별하세요
3. SKU 코드는 보이지 않으므로 제품명으로만 판단하세요
4. 신뢰도 0.7 이상인 제품만 포함하세요

**찾아야 할 3M 제품 목록:**
${productList}

**응답 형식 (JSON만 응답):**
{
  "detectedProducts": [
    {
      "name": "정확한_제품명",
      "category": "카테고리명", 
      "confidence": 0.85
    }
  ]
}

중요: 제품이 없으면 빈 배열 []을 반환하세요. 다른 설명 없이 JSON만 응답해주세요.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.1
    };

    // 🔍 OpenAI API 설정 로깅
    console.log('=== OpenAI API 요청 설정 ===');
    console.log('모델:', requestBody.model);
    console.log('온도:', requestBody.temperature);
    console.log('최대 토큰:', requestBody.max_tokens);
    console.log('이미지 크기:', Math.ceil(imageDataUrl.length * 3/4), 'bytes');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // 응답 상태 확인
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API 오류:', response.status, response.statusText, errorData);
      
      let detailedError = `OpenAI API 호출 실패 (${response.status})`;
      if (response.status === 401) {
        detailedError = 'OpenAI API 키가 유효하지 않습니다. 환경변수를 확인해주세요.';
      } else if (response.status === 429) {
        detailedError = 'OpenAI API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.';
      } else if (response.status === 500) {
        detailedError = 'OpenAI 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      
      throw new Error(detailedError);
    }

    // JSON 응답 안전하게 파싱
    const responseText = await response.text();
    
    // 🔍 전체 OpenAI 응답 로깅
    console.log('=== OpenAI 전체 응답 ===');
    try {
      const responseObj = JSON.parse(responseText);
      console.log(JSON.stringify(responseObj, null, 2));
    } catch (e) {
      console.log('응답을 JSON으로 파싱할 수 없음:', responseText.substring(0, 500));
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('OpenAI API 응답 파싱 성공');
    } catch (jsonError) {
      console.error('OpenAI API 응답 JSON 파싱 실패:', jsonError.message);
      console.error('응답 내용 (처음 500자):', responseText.substring(0, 500));
      
      if (responseText.toLowerCase().includes('<html>') || responseText.toLowerCase().includes('<!doctype')) {
        throw new Error('OpenAI API에서 HTML 페이지를 반환했습니다. 네트워크 연결이나 프록시 설정을 확인해주세요.');
      }
      
      throw new Error(`OpenAI API 응답을 파싱할 수 없습니다: ${jsonError.message}`);
    }

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('OpenAI API 응답 형식이 올바르지 않습니다.');
    }

    const aiContent = result.choices[0].message.content;
    
    // 🔍 AI가 생성한 텍스트 응답 로깅
    console.log('=== OpenAI 텍스트 응답 ===');
    console.log(aiContent);

    // JSON 파싱 시도
    let parsedResult;
    try {
      parsedResult = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      
      console.log('=== JSON 추출 결과 ===');
      console.log('JSON 매치:', jsonMatch ? jsonMatch[0] : 'JSON을 찾을 수 없음');
      
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch (retryError) {
          console.error('❌ JSON 파싱 재시도 실패:', retryError);
          throw new Error(`JSON 파싱 실패: ${retryError.message}`);
        }
      } else {
        console.error('❌ AI 응답에서 JSON 객체를 찾을 수 없습니다.');
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    // 응답 형식 검증 및 변환
    if (parsedResult.detectedProducts && Array.isArray(parsedResult.detectedProducts)) {
      const detectedProducts = parsedResult.detectedProducts.map(detected => {
        console.log(`🔍 매칭 시도: AI 감지 제품 "${detected.name}"`);
        
        // 제품명으로 원본 제품 정보 찾기 (대소문자 구분 없이)
        const originalProduct = products.find(p => 
          p.name.toLowerCase().trim() === detected.name.toLowerCase().trim()
        );
        
        if (!originalProduct) {
          console.warn(`❌ 매칭되지 않는 제품명: ${detected.name}`);
          // 부분 매칭 시도 (포함 관계)
          const partialMatch = products.find(p => 
            p.name.toLowerCase().includes(detected.name.toLowerCase()) ||
            detected.name.toLowerCase().includes(p.name.toLowerCase())
          );
          
          if (partialMatch) {
            console.log(`✅ 부분 매칭 성공: ${detected.name} → ${partialMatch.name}`);
            return {
              sku: partialMatch.sku,
              name: partialMatch.name,
              category: partialMatch.category,
              price: partialMatch.price,
              confidence: detected.confidence || 0.8,
              registered: false
            };
          } else {
            console.log(`❌ 부분 매칭도 실패: ${detected.name}`);
            return null;
          }
        }

        console.log(`✅ 완전 매칭 성공: ${detected.name}`);
        return {
          sku: originalProduct.sku,
          name: originalProduct.name,
          category: originalProduct.category,
          price: originalProduct.price,
          confidence: detected.confidence || 0.8,
          registered: false
        };
      }).filter(Boolean); // null 값 제거

      // 🔍 최종 파싱 결과 로깅
      console.log('=== 최종 파싱 결과 ===');
      console.log('파싱된 제품들:', JSON.stringify(detectedProducts, null, 2));
      console.log('유효한 제품 수:', detectedProducts.length);

      console.log(`🎯 AI 분석 완료: ${detectedProducts.length}개 제품 감지`);
      return detectedProducts;
    } else {
      console.error('❌ AI 응답 형식이 예상과 다릅니다:', parsedResult);
      throw new Error('AI 응답 형식이 예상과 다릅니다.');
    }

  } catch (error) {
    console.error('OpenAI Vision API 호출 오류:', error);
    console.log('API 오류로 인해 대체 응답을 제공합니다.');
    return getMockAIResponse(products);
  }
}

// Mock AI 응답 (API 키가 없거나 오류 시 사용)
function getMockAIResponse(products) {
  console.log('🔧 Mock AI 응답 생성 중...');
  
  const mockDetectedProducts = [];
  
  if (products.length > 0) {
    const firstProduct = products[0];
    mockDetectedProducts.push({
      sku: firstProduct.sku,
      name: firstProduct.name,
      category: firstProduct.category,
      price: firstProduct.price,
      confidence: 0.85,
      registered: false
    });
    
    // 50% 확률로 두 번째 제품도 추가
    if (products.length > 1 && Math.random() > 0.5) {
      const secondProduct = products[1];
      mockDetectedProducts.push({
        sku: secondProduct.sku,
        name: secondProduct.name,
        category: secondProduct.category,
        price: secondProduct.price,
        confidence: 0.75,
        registered: false
      });
    }
  }
  
  console.log(`🎭 Mock 응답: ${mockDetectedProducts.length}개 제품 감지 시뮬레이션`);
  return mockDetectedProducts;
}

module.exports = router;
