import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const AICaptureePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '1';
  
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [showAiResults, setShowAiResults] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('카메라 준비 중...');
  
  const scannerRef = useRef();
  const scannerDivRef = useRef();



  // 카메라 시작
  const startCamera = async () => {
    try {
      setCameraStatus('카메라 시작 중...');
      
      // 기존 스캐너가 있으면 정리
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {
          console.log('기존 스캐너 정리 중 오류:', e);
        }
      }

      const html5QrCode = new Html5Qrcode("ai-camera-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 30,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          let qrboxSize = Math.floor(minEdgeSize * 0.7);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: false,
        defaultZoomValueIfSupported: 1,
        disableFlip: false
      };

      // 카메라 제약 조건
      const cameraConstraints = {
        facingMode: "environment",
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 }
      };

      console.log('카메라 시작 시도...');
      
      await html5QrCode.start(
        cameraConstraints,
        config,
        () => {}, // onScanSuccess - 빈 함수 (QR 스캔 안함)
        () => {}  // onScanFailure - 빈 함수
      );

      console.log('카메라 시작 성공');
      setIsScanning(true);
      setCameraStatus('매대를 화면 중앙에 맞춰 촬영하세요');

    } catch (error) {
      console.error('카메라 시작 오류:', error);
      
      // 구체적인 오류 메시지 표시
      let errorMessage = '카메라 접근 실패';
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라 권한이 필요합니다';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '카메라가 다른 앱에서 사용 중입니다';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '카메라 설정을 지원하지 않습니다';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCameraStatus(errorMessage);
      setIsScanning(false);
      
      // 스캐너 정리
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (e) {
          console.log('스캐너 정리 오류:', e);
        }
      }
    }
  };

  // 카메라 중단
  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
      setCameraStatus('카메라 중단됨');
    } catch (error) {
      console.error('카메라 중단 오류:', error);
    }
  };

  // 매대 사진 촬영
  const captureShelfPhoto = async () => {
    if (!isScanning) {
      alert('카메라를 먼저 시작해주세요.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setCameraStatus('사진 촬영 중...');
      
      // 현재 비디오 스트림에서 이미지 캡처
      const videoElement = document.querySelector('#ai-camera-reader video');
      if (!videoElement) {
        throw new Error('비디오 요소를 찾을 수 없습니다.');
      }

      // Canvas를 생성하여 현재 프레임 캡처
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // 이미지를 Base64로 변환
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      
      // 진동 피드백 (사진 촬영 완료)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      
      setCameraStatus('AI 분석 중...');
      
      // AI 분석 요청
      await analyzeShelfWithAI(imageDataUrl);
      
    } catch (error) {
      console.error('사진 촬영 오류:', error);
      alert('사진 촬영 중 오류가 발생했습니다: ' + error.message);
      setIsAnalyzing(false);
      setCameraStatus('매대를 화면 중앙에 맞춰 촬영하세요');
    }
  };

  // AI 매대 분석
  const analyzeShelfWithAI = async (imageDataUrl) => {
    try {
      // 3M 제품 리스트 가져오기
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      if (!productsData.success) {
        throw new Error('제품 리스트를 가져올 수 없습니다.');
      }

      // AI 분석 API 호출
      const analysisResponse = await fetch('/api/ai-analyze-shelf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          products: productsData.products,
          storeId: storeId
        })
      });

      const analysisResult = await analysisResponse.json();
      
      if (analysisResult.success) {
        setAiResults(analysisResult.detectedProducts);
        setShowAiResults(true);
        setCameraStatus(`${analysisResult.detectedProducts.length}개 제품 감지됨`);
      } else {
        throw new Error(analysisResult.message || 'AI 분석에 실패했습니다.');
      }
      
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('AI 분석 중 오류가 발생했습니다: ' + error.message);
      setCameraStatus('분석 실패');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI 분석 결과에서 제품을 재고로 등록
  const confirmAIProduct = async (product) => {
    try {
      // 스캔 기록 DB에 저장
      const saveResponse = await fetch('/api/scan-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: storeId,
          productCode: product.sku,
          productName: product.name,
          sessionId: `ai_${Date.now()}`, // AI 세션 ID
          source: 'ai_analysis'
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        alert(`${product.name}이(가) 재고로 등록되었습니다.`);
        
        // AI 결과에서 해당 제품을 등록됨으로 표시
        setAiResults(prev => prev.map(p => 
          p.sku === product.sku ? { ...p, registered: true } : p
        ));
      } else {
        if (saveResult.isDuplicate) {
          alert('이미 등록된 제품입니다.');
        } else {
          throw new Error(saveResult.message || '등록 실패');
        }
      }
      
    } catch (error) {
      console.error('제품 등록 오류:', error);
      alert('제품 등록 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 컴포넌트 마운트 시 자동으로 카메라 시작
  useEffect(() => {
    startCamera();
    
    return () => {
      if (scannerRef.current) {
        stopCamera();
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          AI 매대 분석
        </h1>
        
        <Link to={`/qr-scan?storeId=${storeId}`} style={{
          textDecoration: 'none',
          color: '#666',
          fontSize: '16px'
        }}>
          <i className="fas fa-times" style={{ fontSize: '20px' }}></i>
        </Link>
      </div>

      {/* 카메라 영역 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div 
          id="ai-camera-reader" 
          ref={scannerDivRef}
          style={{
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000',
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '16px'
          }}
        >
          {!isScanning && '카메라를 시작하세요'}
        </div>
      </div>

      {/* 상태 표시 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        border: '1px solid #e9ecef',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: (cameraStatus.includes('실패') || cameraStatus.includes('권한') || cameraStatus.includes('없습니다')) ? '12px' : '0'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAnalyzing ? '#ffc107' : isScanning ? '#28a745' : 
                           (cameraStatus.includes('실패') || cameraStatus.includes('권한') || cameraStatus.includes('없습니다')) ? '#dc3545' : '#6c757d'
          }}></div>
          <span style={{
            fontSize: '15px',
            fontWeight: '600',
            color: isAnalyzing ? '#ffc107' : isScanning ? '#28a745' : 
                  (cameraStatus.includes('실패') || cameraStatus.includes('권한') || cameraStatus.includes('없습니다')) ? '#dc3545' : '#6c757d'
          }}>
            {cameraStatus}
          </span>
        </div>
        
        {/* 오류 시 재시도 버튼 */}
        {(cameraStatus.includes('실패') || cameraStatus.includes('권한') || cameraStatus.includes('없습니다')) && (
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              새로고침
            </button>
            <button
              onClick={startCamera}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {/* 컨트롤 버튼 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {/* 첫 번째 줄: 카메라 시작/중단, 촬영 */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={isScanning ? stopCamera : startCamera}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: isScanning ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            <i className={`fas ${isScanning ? 'fa-stop' : 'fa-play'}`} style={{
              fontSize: '14px'
            }}></i>
            {isScanning ? '카메라 중단' : '카메라 시작'}
          </button>

          <button
            onClick={captureShelfPhoto}
            disabled={!isScanning || isAnalyzing}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: isAnalyzing ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (!isScanning || isAnalyzing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              opacity: (!isScanning || isAnalyzing) ? 0.6 : 1
            }}
          >
            <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-camera'}`} style={{
              fontSize: '14px'
            }}></i>
            {isAnalyzing ? '분석 중...' : '매대 촬영'}
          </button>
        </div>

        {/* 두 번째 줄: 돌아가기 버튼 */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <Link
            to={`/qr-scan?storeId=${storeId}`}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            <i className="fas fa-arrow-left" style={{
              fontSize: '14px'
            }}></i>
            QR 스캔으로 돌아가기
          </Link>
        </div>
      </div>

      {/* AI 분석 결과 모달 */}
      {showAiResults && aiResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
          }}>
            {/* 모달 헤더 */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#333'
              }}>
                AI 분석 결과
              </h3>
              <button
                onClick={() => setShowAiResults(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* 촬영된 이미지 미리보기 */}
            {capturedImage && (
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '8px'
                }}>
                  촬영된 매대 이미지
                </div>
                <img
                  src={capturedImage}
                  alt="촬영된 매대"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '150px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}
                />
              </div>
            )}

            {/* AI 분석 결과 리스트 */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px'
            }}>
              {aiResults.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '16px',
                  padding: '40px 20px'
                }}>
                  매대에서 3M 제품을 찾지 못했습니다.
                </div>
              ) : (
                <>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '16px'
                  }}>
                    {aiResults.length}개의 3M 제품이 감지되었습니다. 확인 후 재고로 등록하세요.
                  </div>
                  
                  {aiResults.map((product, index) => (
                    <div key={index} style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: product.registered ? '#f8f9fa' : 'white'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '16px',
                            color: '#333',
                            marginBottom: '4px'
                          }}>
                            {product.name}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#666',
                            marginBottom: '4px'
                          }}>
                            SKU: {product.sku}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#666'
                          }}>
                            카테고리: {product.category}
                          </div>
                          {product.confidence && (
                            <div style={{
                              fontSize: '12px',
                              color: '#999',
                              marginTop: '4px'
                            }}>
                              신뢰도: {Math.round(product.confidence * 100)}%
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => confirmAIProduct(product)}
                          disabled={product.registered}
                          style={{
                            backgroundColor: product.registered ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: product.registered ? 'not-allowed' : 'pointer',
                            opacity: product.registered ? 0.6 : 1,
                            minWidth: '80px'
                          }}
                        >
                          {product.registered ? '등록됨' : '재고 등록'}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowAiResults(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '414px',
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '8px 0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-home" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>홈</span>
        </Link>
        <Link to="/store-list" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-store" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>매장</span>
        </Link>
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-magic" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>AI 분석</span>
        </Link>
      </div>
    </div>
  );
};

export default AICaptureePage;
