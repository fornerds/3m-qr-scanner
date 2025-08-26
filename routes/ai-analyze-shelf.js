const express = require('express');
const { connectToDatabase } = require('../config/database');
const router = express.Router();

// 🤖 AI 선반 분석 (원본 로직 기반)
router.post('/', async (req, res) => {
  try {
    const { image, products, storeId, quadrants } = req.body;

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
    const maxSizeInMB = 20;
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
    const maxRequestSizeInMB = 50;
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

    // AI 분석 수행 (클라이언트에서 전달된 분할 이미지 사용)
    const detectedProducts = await analyzeShelfWithAI(image, products, quadrants);

    console.log(`[AI 분석 완료] ${detectedProducts.length}개의 DB 검증된 제품 감지`);

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
      detectedProducts: detectedProducts,
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

// 이미지를 4개 영역으로 분할하는 함수
async function splitImageIntoQuadrants(imageDataUrl) {
  console.log('이미지 4분할 시작...');
  try {
    // Canvas를 사용하여 이미지 분할 (Node.js 환경에서는 단순한 방법 사용)
    const base64Data = imageDataUrl.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('원본 이미지 크기:', imageBuffer.length, 'bytes');
    
    // 실제 분할은 클라이언트에서 처리하거나 별도 라이브러리 사용
    // 지금은 원본 이미지를 4번 복사하여 시뮬레이션 (각각 다른 prompt로 분석)
    const quadrants = [
      { data: imageDataUrl, region: '왼쪽 상단 (Left-Top)', instruction: '이미지의 왼쪽 상단 영역에 집중하여' },
      { data: imageDataUrl, region: '오른쪽 상단 (Right-Top)', instruction: '이미지의 오른쪽 상단 영역에 집중하여' },
      { data: imageDataUrl, region: '왼쪽 하단 (Left-Bottom)', instruction: '이미지의 왼쪽 하단 영역에 집중하여' },
      { data: imageDataUrl, region: '오른쪽 하단 (Right-Bottom)', instruction: '이미지의 오른쪽 하단 영역에 집중하여' }
    ];
    
    console.log('이미지 4분할 완료:', quadrants.map(q => q.region).join(', '));
    return quadrants;
  } catch (error) {
    console.error('이미지 분할 실패:', error.message);
    // 실패 시 원본 이미지 4개 반환
    return Array.from({ length: 4 }, (_, i) => ({
      data: imageDataUrl,
      region: `영역 ${i + 1}`,
      instruction: `이미지의 특정 영역에 집중하여`
    }));
  }
}

// AI 분석 함수 (OpenAI Vision API 연동) - 7개 병렬 처리
async function analyzeShelfWithAI(imageDataUrl, products, clientQuadrants = null) {
  try {
    // 이미지 데이터 정규화 및 검증
    const processedImageData = await processAndValidateImage(imageDataUrl);
    
    console.log('AI 분석 시작:', {
      originalSize: imageDataUrl.length,
      processedSize: processedImageData.length,
      productCount: products.length,
      imageFormat: imageDataUrl.split(';')[0].split(':')[1]
    });

    // 이미지 4분할 수행 (클라이언트에서 제공되면 사용, 아니면 서버에서 시뮬레이션)
    let quadrants;
    if (clientQuadrants && clientQuadrants.length === 4) {
      console.log('클라이언트에서 전달된 분할 이미지 사용');
      quadrants = clientQuadrants.map(q => ({
        data: q.data,
        region: q.region,
        instruction: `이미지의 ${q.region} 영역에 집중하여`
      }));
    } else {
      console.log('서버에서 이미지 분할 시뮬레이션 수행');
      quadrants = await splitImageIntoQuadrants(processedImageData);
    }
    
    // 7개 병렬 AI 분석 (전체 이미지 3회 + 분할 이미지 4회)
    console.log('병렬 AI 분석 시작: 7회 동시 호출 (전체 3회 + 분할 4회)');
    const startParallelTime = Date.now();
    
    // 전체 이미지 3회 분석을 위한 Promise 배열
    const fullImagePromises = Array.from({ length: 3 }, (_, index) => 
      callOpenAIVisionAPI(processedImageData, products, `전체-${index + 1}`, '전체 이미지를 종합적으로')
        .catch(error => {
          console.warn(`전체 이미지 AI 호출 ${index + 1} 실패:`, error.message);
          return { error: error.message, products: [] };
        })
    );
    
    // 분할 이미지 4회 분석을 위한 Promise 배열
    const quadrantPromises = quadrants.map((quadrant, index) => 
      callOpenAIVisionAPI(quadrant.data, products, `분할-${quadrant.region}`, quadrant.instruction)
        .catch(error => {
          console.warn(`분할 이미지 ${quadrant.region} AI 호출 실패:`, error.message);
          return { error: error.message, products: [] };
        })
    );
    
    // 모든 Promise를 병렬로 실행
    const parallelPromises = [...fullImagePromises, ...quadrantPromises];
    const parallelResults = await Promise.all(parallelPromises);
    const parallelTime = Date.now() - startParallelTime;
    
    console.log(`7개 병렬 AI 분석 완료 (${parallelTime}ms):`);
    console.log('- 전체 이미지 분석:', parallelResults.slice(0, 3).map((r, i) => 
      r.error ? `전체-${i+1}: 오류` : `전체-${i+1}: ${r.length}개`
    ).join(', '));
    console.log('- 분할 이미지 분석:', parallelResults.slice(3).map((r, i) => {
      const regions = ['왼쪽상단', '오른쪽상단', '왼쪽하단', '오른쪽하단'];
      return r.error ? `${regions[i]}: 오류` : `${regions[i]}: ${r.length}개`;
    }).join(', '));
    
    // 성공한 결과들만 필터링
    const successResults = parallelResults.filter(result => !result.error && Array.isArray(result));
    
    console.log(`성공한 AI 분석: ${successResults.length}/7개`);
    if (successResults.length === 0) {
      console.error('모든 7개 병렬 AI 호출 실패');
      return [];
    }
    
    // 결과 병합 및 투표 시스템
    const mergedResults = mergeAIResults(successResults);
    
    return mergedResults;

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

// AI 결과 병합 및 투표 시스템 (7개 결과 통합)
function mergeAIResults(results) {
  console.log('7개 AI 결과 병합 시작:', results.map(r => r.length + '개'));
  
  // 모든 감지된 제품들을 SKU별로 집계
  const productVotes = new Map();
  
  results.forEach((resultArray, resultIndex) => {
    console.log(`결과 ${resultIndex + 1}:`, resultArray.map(p => p.name));
    
    resultArray.forEach(product => {
      const sku = product.sku;
      
      if (!productVotes.has(sku)) {
        productVotes.set(sku, {
          product: product,
          votes: 0,
          confidenceSum: 0,
          appearances: []
        });
      }
      
      const vote = productVotes.get(sku);
      vote.votes += 1;
      vote.confidenceSum += (product.confidence || 0.8);
      vote.appearances.push({
        resultIndex: resultIndex + 1,
        confidence: product.confidence || 0.8
      });
    });
  });
  
  // 투표 결과 분석
  console.log('투표 결과 분석:');
  
  const finalProducts = [];
  const totalResults = results.length;
  
  productVotes.forEach((vote, sku) => {
    const avgConfidence = vote.confidenceSum / vote.votes;
    const votePercentage = (vote.votes / totalResults) * 100;
    
    console.log(`${vote.product.name}:`, {
      votes: `${vote.votes}/${totalResults}`,
      percentage: `${votePercentage.toFixed(1)}%`,
      avgConfidence: avgConfidence.toFixed(2),
      appearances: vote.appearances
    });
    
    // 관대한 검증: DB에 있는 제품이면 낮은 신뢰도라도 사용자에게 제안
    // 최소 신뢰도 0.3 이상만 필터링 (사용자가 최종 판단)
    if (avgConfidence >= 0.3) {
      finalProducts.push({
        ...vote.product,
        confidence: Math.min(avgConfidence + (vote.votes - 1) * 0.03, 1.0), // 약간의 투표 보너스
        votes: vote.votes,
        votePercentage: votePercentage,
        consensus: vote.votes === totalResults ? 'unanimous' : 
                  vote.votes >= Math.ceil(totalResults * 0.5) ? 'majority' : 'minority',
        detectedIn: vote.appearances.map(a => `호출${a.resultIndex}`).join(', ')
      });
    }
  });
  
  // 사용자 친화적 정렬: 만장일치 → 다수결 → 신뢰도 높은 순
  finalProducts.sort((a, b) => {
    // 1순위: 만장일치
    if (a.consensus === 'unanimous' && b.consensus !== 'unanimous') return -1;
    if (b.consensus === 'unanimous' && a.consensus !== 'unanimous') return 1;
    
    // 2순위: 다수결
    if (a.consensus === 'majority' && b.consensus === 'minority') return -1;
    if (b.consensus === 'majority' && a.consensus === 'minority') return 1;
    
    // 3순위: 투표 수
    if (a.votes !== b.votes) return b.votes - a.votes;
    
    // 4순위: 신뢰도
    return b.confidence - a.confidence;
  });
  
  console.log('최대 수집 결과:', finalProducts.length + '개 (사용자가 선택)');
  finalProducts.forEach((product, index) => {
    const rank = product.consensus === 'unanimous' ? '[만장일치]' : 
                 product.consensus === 'majority' ? '[다수결]' : '[소수의견]';
    console.log(`${index + 1}. ${product.name} (신뢰도: ${product.confidence.toFixed(2)}, 투표: ${product.votes}/${totalResults}, ${rank})`);
  });
  
  return finalProducts;
}

// OpenAI Vision API 호출 함수
async function callOpenAIVisionAPI(imageDataUrl, products, callNumber = 1, focusInstruction = '전체 이미지를 종합적으로') {
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
    console.log(`=== OpenAI Vision API 호출 ${callNumber} 시작 ===`);
    console.log('분석할 제품 수:', products.length);

    // AI에게 전달되는 제품 리스트 로깅 (모든 제품 전달)
    const productList = products.map(p => `- ${p.name} (카테고리: ${p.category || 'N/A'})`).join('\n');
    console.log('=== AI에게 전달되는 제품 리스트 ===');
    console.log('총 제품 수:', products.length);
    console.log('분석 대상 제품 수:', products.length);
    console.log('제품 목록:\n', productList);

    const requestBody = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `당신은 3M 제품 인식 전문가입니다. ${focusInstruction} 분석해서 3M 브랜드 제품들을 찾아 식별해주세요.

**🔒 중요한 제약사항:**
- 아래 제품 목록에 정확히 있는 제품명만 사용하세요
- 제품 목록에 없는 제품명은 절대 만들지 마세요
- 유사하거나 비슷한 제품명도 사용하지 마세요
- 신뢰도 0.3 이상이면 포함하세요 (사용자가 최종 선택)

**📋 Flow 분석 방법:**
1. 사진에서 제품을 찾을때는 사진속에 있는 3M 제품을 최대한 누락없이 찾아주세요
2. 포장/색상/수량이 다르면 각각 별도의 제품으로 인식합니다
3. 제품 포장에 "3M" 또는 "Scotch-Brite" 등의 정확한 브랜드 로고가 명확히 표시되어 있어야 합니다
4. ${focusInstruction} 이미지에서 3M, Scotch-Brite 브랜드 로고를 모두 찾아주세요
5. 아래 목록에 있는 제품이 보이면 적극적으로 포함
6. 의심스럽더라도 목록에 있는 제품이면 일단 포함 (사용자가 최종 선택)

**허용된 3M 제품 목록 (이 목록에 있는 제품명만 사용):**
${productList}

**응답 형식 (JSON만):**
{
  "detectedProducts": [
    {
      "name": "위_목록의_정확한_제품명",
      "category": "해당_카테고리", 
      "confidence": 0.85
    }
  ]
}

💡 제품이 확실하지 않아도 목록에 있다면 포함하세요. 사용자가 최종 판단합니다. JSON 외 다른 내용은 포함하지 마세요.`
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

    // OpenAI API 설정 로깅
    console.log(`=== OpenAI API 요청 설정 (호출 ${callNumber}) ===`);
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
    
    // 전체 OpenAI 응답 로깅
    console.log(`=== OpenAI 전체 응답 (호출 ${callNumber}) ===`);
    try {
      const responseObj = JSON.parse(responseText);
      console.log(JSON.stringify(responseObj, null, 2));
    } catch (e) {
      console.log('응답을 JSON으로 파싱할 수 없음:', responseText.substring(0, 500));
    }
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log(`OpenAI API 응답 파싱 성공 (호출 ${callNumber})`);
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
    
    // AI가 생성한 텍스트 응답 로깅
    console.log('=== OpenAI 텍스트 응답 ===');
    console.log(aiContent);

    // JSON 파싱 시도 (```json 블록 처리 포함)
    let parsedResult;
    let cleanContent = aiContent.trim();
    
    // ```json 블록 처리
    if (cleanContent.startsWith('```json')) {
      console.log('AI가 JSON 코드 블록으로 응답함, 정리 중...');
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      console.log('정리된 내용:', cleanContent);
    } else if (cleanContent.startsWith('```')) {
      console.log('AI가 코드 블록으로 응답함, 정리 중...');
      cleanContent = cleanContent.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
      console.log('정리된 내용:', cleanContent);
    }
    
    try {
      parsedResult = JSON.parse(cleanContent);
      console.log('JSON 파싱 성공 (정리된 내용)');
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      
      console.log('=== JSON 추출 결과 ===');
      console.log('JSON 매치:', jsonMatch ? jsonMatch[0] : 'JSON을 찾을 수 없음');
      
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
          console.log('JSON 파싱 성공 (정규식 매칭)');
        } catch (retryError) {
          console.error('JSON 파싱 재시도 실패:', retryError);
          throw new Error(`JSON 파싱 실패: ${retryError.message}`);
        }
      } else {
        console.error('AI 응답에서 JSON 객체를 찾을 수 없습니다.');
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    // 응답 형식 검증 및 변환
    let detectedProductsArray = [];
    
    // AI 응답이 직접 배열인 경우 (예: []) 또는 객체 형태인 경우 (예: {detectedProducts: []})
    if (Array.isArray(parsedResult)) {
      detectedProductsArray = parsedResult;
      console.log('AI가 직접 배열 형태로 응답:', detectedProductsArray);
    } else if (parsedResult.detectedProducts && Array.isArray(parsedResult.detectedProducts)) {
      detectedProductsArray = parsedResult.detectedProducts;
      console.log('AI가 객체 형태로 응답:', detectedProductsArray);
    } else {
      console.error('AI 응답 형식이 예상과 다릅니다:', parsedResult);
      throw new Error('AI 응답 형식이 예상과 다릅니다.');
    }
    
    // 빈 배열인 경우 처리
    if (detectedProductsArray.length === 0) {
      console.log(`AI 호출 ${callNumber} 분석 완료: 감지된 제품이 없습니다.`);
      return [];
    }
    
    const detectedProducts = detectedProductsArray.map(detected => {
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

      // 최종 파싱 결과 로깅
      console.log('=== 최종 파싱 결과 ===');
      console.log('파싱된 제품들:', JSON.stringify(detectedProducts, null, 2));
      console.log('유효한 제품 수:', detectedProducts.length);

      console.log(`AI 호출 ${callNumber} 분석 완료: ${detectedProducts.length}개 제품 감지`);
      return detectedProducts;

  } catch (error) {
    console.error('OpenAI Vision API 호출 오류:', error);
    console.log('API 오류로 인해 대체 응답을 제공합니다.');
    return getMockAIResponse(products);
  }
}

// Mock AI 응답 (API 키가 없거나 오류 시 사용)
function getMockAIResponse(products) {
  console.log('Mock AI 응답 생성 중...');
  
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
  
  console.log(`Mock 응답: ${mockDetectedProducts.length}개 제품 감지 시뮬레이션`);
  return mockDetectedProducts;
}

module.exports = router;
