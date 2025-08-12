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

    // Base64 이미지 데이터 검증
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 이미지 형식입니다.'
      });
    }

    // 제품 리스트 검증
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: '제품 리스트가 유효하지 않습니다.'
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
    // 이미지에서 Base64 데이터 추출
    const base64Data = imageDataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('AI 분석 시작:', {
      imageSize: imageBuffer.length,
      productCount: products.length
    });

    // OpenAI Vision API 호출
    const aiResponse = await callOpenAIVisionAPI(imageDataUrl, products);
    
    return aiResponse;

  } catch (error) {
    console.error('AI 분석 실행 오류:', error);
    
    // AI 분석 실패 시 빈 결과 반환
    console.log('AI 분석 실패, 빈 결과를 반환합니다.');
    return [];
  }
}



// OpenAI Vision API 호출 함수
async function callOpenAIVisionAPI(imageDataUrl, products) {
  // 환경변수에서 OpenAI API 키 가져오기
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
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

**분석 방법:**
1. 이미지에서 3M 브랜드 로고, 제품명, 패키지 디자인을 자세히 확인하세요
2. 제품명이나 패키지가 명확히 보이는 3M 제품만 식별하세요
3. SKU 코드는 보이지 않으므로 제품명으로만 판단하세요
4. 신뢰도 0.7 이상인 제품만 포함하세요

**찾아야 할 3M 제품 목록:**
${products.map(p => `- ${p.name} (카테고리: ${p.category})`).join('\n')}

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
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API 오류:', response.status, errorData);
      throw new Error(`OpenAI API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log('OpenAI API 응답 수신:', result);

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
        // 제품명으로 원본 제품 정보 찾기 (대소문자 구분 없이)
        const originalProduct = products.find(p => 
          p.name.toLowerCase().trim() === detected.name.toLowerCase().trim()
        );
        
        if (!originalProduct) {
          console.warn(`매칭되지 않는 제품명: ${detected.name}`);
          // 부분 매칭 시도 (포함 관계)
          const partialMatch = products.find(p => 
            p.name.toLowerCase().includes(detected.name.toLowerCase()) ||
            detected.name.toLowerCase().includes(p.name.toLowerCase())
          );
          
          if (partialMatch) {
            console.log(`부분 매칭 성공: ${detected.name} → ${partialMatch.name}`);
            return {
              sku: partialMatch.sku,
              name: partialMatch.name,
              category: partialMatch.category,
              price: partialMatch.price,
              confidence: detected.confidence || 0.8,
              registered: false
            };
          } else {
            return null;
          }
        }

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
    throw error;
  }
}
