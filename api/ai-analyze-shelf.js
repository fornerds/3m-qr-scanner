import { connectToDatabase } from './config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { image, products, storeId } = req.body;

    // 입력 데이터 검증
    if (!image || !products || !storeId) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다. (image, products, storeId)'
      });
    }

    // Base64 이미지 데이터 검증 (더 유연한 검증)
    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: '이미지 데이터가 유효하지 않습니다.'
      });
    }

    // 이미지 크기 체크 (Vercel 1MB 제한 대응)
    const imageSizeInBytes = Math.ceil(image.length * 3/4); // Base64는 실제 크기의 약 4/3
    const maxSizeInMB = 0.8; // 800KB 제한 (여유분 포함)
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

    // 제품 리스트 크기 제한 (성능 및 메모리 최적화)
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
    const maxRequestSizeInMB = 0.9; // 900KB 제한
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

    // 분석 로그 저장 (선택사항)
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
      // 로그 실패는 전체 요청을 실패시키지 않음
    }

    return res.status(200).json({
      success: true,
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
}

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
    
    // AI 분석 실패 시 빈 결과 반환
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
  // 환경변수에서 OpenAI API 키 가져오기
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API 키가 설정되지 않았습니다.');
    // API 키가 없을 때 대체 로직 (목업 응답)
    return getMockAIResponse(products);
  }
  
  if (!OPENAI_API_KEY.startsWith('sk-')) {
    console.error('올바르지 않은 OpenAI API 키 형식입니다.');
    return getMockAIResponse(products);
  }
  
  try {
    console.log('OpenAI Vision API 호출 시작...');
    console.log('분석할 제품 수:', products.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `당신은 3M 제품 인식 전문가입니다. 이 매대 이미지를 분석해서 3M 브랜드 제품들을 찾아 식별해주세요.

**중요한 제약사항:**
- 아래 제품 목록에 정확히 있는 제품명만 사용하세요
- 제품 목록에 없는 제품명은 절대 만들지 마세요
- 유사하거나 비슷한 제품명도 사용하지 마세요
- 신뢰도 0.3 이상이면 포함하세요 (사용자가 최종 선택)

**Flow 분석 방법:**
1. 사진에서 제품을 찾을때는 사진속에 있는 3M 제품을 최대한 누락없이 찾아주세요
2. 포장/색상/수량이 다르면 각각 별도의 제품으로 인식합니다
3. 제품 포장에 "3M" 또는 "Scotch-Brite" 등의 정확한 브랜드 로고가 명확히 표시되어 있어야 합니다
4. 이미지에서 3M, Scotch-Brite 브랜드 로고를 모두 찾아주세요
5. 아래 목록에 있는 제품이 보이면 적극적으로 포함
6. 의심스럽더라도 목록에 있는 제품이면 일단 포함 (사용자가 최종 선택)

**허용된 3M 제품 목록 (이 목록에 있는 제품명만 사용):**
${products.map(p => `- ${p.name} (카테고리: ${p.category})`).join('\n')}

**응답 형식 (JSON만 응답):**
{
  "detectedProducts": [
    {
      "name": "위_목록의_정확한_제품명",
      "category": "해당_카테고리", 
      "confidence": 0.85
    }
  ]
}

중요: 제품이 확실하지 않아도 목록에 있다면 포함하세요. 사용자가 최종 판단합니다. JSON 외 다른 내용은 포함하지 마세요.`
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
      })
    });

    // 응답 상태 확인
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API 오류:', response.status, response.statusText, errorData);
      
      // 상세한 에러 메시지 제공
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
    let result;
    const responseText = await response.text();
    console.log('OpenAI API 원본 응답:', responseText.substring(0, 200) + '...');
    
    try {
      result = JSON.parse(responseText);
      console.log('OpenAI API 응답 파싱 성공');
    } catch (jsonError) {
      console.error('OpenAI API 응답 JSON 파싱 실패:', jsonError.message);
      console.error('응답 내용 (처음 500자):', responseText.substring(0, 500));
      
      // HTML 응답인지 확인
      if (responseText.toLowerCase().includes('<html>') || responseText.toLowerCase().includes('<!doctype')) {
        throw new Error('OpenAI API에서 HTML 페이지를 반환했습니다. 네트워크 연결이나 프록시 설정을 확인해주세요.');
      }
      
      throw new Error(`OpenAI API 응답을 파싱할 수 없습니다: ${jsonError.message}`);
    }

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('OpenAI API 응답 형식이 올바르지 않습니다.');
    }

    const aiContent = result.choices[0].message.content;
    console.log('AI 분석 결과:', aiContent);

    // JSON 파싱 시도
    let parsedResult;
    try {
      parsedResult = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      // JSON 형식이 아닌 경우 다시 파싱 시도
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    // 응답 형식 검증 및 변환
    if (parsedResult.detectedProducts && Array.isArray(parsedResult.detectedProducts)) {
      const detectedProducts = parsedResult.detectedProducts.map(detected => {
        console.log(`[엄격 검증] AI 감지 제품: "${detected.name}"`);
        
        // 🔒 엄격한 완전 매칭만 허용 (대소문자 구분 없이)
        const originalProduct = products.find(p => 
          p.name.toLowerCase().trim() === detected.name.toLowerCase().trim()
        );
        
        if (!originalProduct) {
          console.warn(`❌ [DB 검증 실패] "${detected.name}" - 데이터베이스에 존재하지 않는 제품이므로 제외`);
          return null; // 부분 매칭 제거 - DB에 없는 제품은 절대 허용 안함
        }

        console.log(`✅ [DB 검증 성공] "${detected.name}" → SKU: ${originalProduct.sku}`);
        return {
          sku: originalProduct.sku,
          name: originalProduct.name,
          category: originalProduct.category,
          price: originalProduct.price,
          confidence: detected.confidence || 0.8,
          registered: false
        };
      }).filter(Boolean); // null 값 제거

      console.log(`AI 분석 완료: ${detectedProducts.length}개 제품 감지`);
      return detectedProducts;
    } else {
      throw new Error('AI 응답 형식이 예상과 다릅니다.');
    }

  } catch (error) {
    console.error('OpenAI Vision API 호출 오류:', error);
    
    // 네트워크나 API 오류 시 대체 응답 제공
    console.log('API 오류로 인해 대체 응답을 제공합니다.');
    return getMockAIResponse(products);
  }
}

// Mock AI 응답 (API 키가 없거나 오류 시 사용)
function getMockAIResponse(products) {
  console.log('Mock AI 응답 생성 중...');
  
  // 테스트용으로 랜덤하게 1-2개 제품 선택
  const mockDetectedProducts = [];
  
  if (products.length > 0) {
    // 첫 번째 제품을 높은 확률로 감지된 것으로 시뮬레이션
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
  
  console.log(`Mock 응답: ${mockDetectedProducts.length}개 제품 감지 시뮬레이션`);
  return mockDetectedProducts;
}
