import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

const QRScanPage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scanStats, setScanStats] = useState({
    total: 0,
    found: 0,
    notFound: 0
  });
  
  // 카메라 제어 상태 (단순화)
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scanStatus, setScanStatus] = useState('스캔 준비 중...');
  
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const animationFrameRef = useRef();

  // 세션 시작
  const startSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: '1',
          userId: 'user123',
          startTime: new Date(),
          status: 'active',
          scannedItems: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        console.log('세션 시작됨:', data.sessionId);
      }
    } catch (error) {
      console.error('세션 시작 오류:', error);
    }
  };

  // QR 코드 처리
  const processQR = async (qrData) => {
    try {
      // QR 데이터에서 제품코드 추출 (순수 코드만 읽는다고 가정)
      const productCode = qrData.trim();
      
      // 제품 데이터베이스에서 제품 검색
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scannedCode: productCode,
          storeId: '1'
        })
      });
      
      const result = await response.json();
      
      let scanResult;
      
      if (result.success && result.found) {
        // 제품을 찾은 경우
        const product = result.product;
        scanResult = {
          productCode,
          productName: product.daisoName,
          category: product.category,
          price: `${product.price.toLocaleString()}원`,
          status: 'found',
          statusMessage: '진열 상품 확인됨',
          statusColor: '#28a745',
          product: product,
          timestamp: new Date()
        };
      } else {
        // 제품을 찾지 못한 경우
        scanResult = {
          productCode,
          productName: '알 수 없는 제품',
          category: '-',
          price: '-',
          status: 'not_found',
          statusMessage: '3M 제품이 아님',
          statusColor: '#dc3545',
          timestamp: new Date()
        };
      }
      
      // 세션에 스캔 아이템 추가
      if (sessionId) {
        await fetch(`/api/sessions?sessionId=${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            $push: {
              scannedItems: {
                ...scanResult,
                timestamp: new Date()
              }
            }
          })
        });
      }
      
      // 결과 표시
      setScanResult(scanResult);
      
      // 통계 업데이트
      setScanStats(prev => ({
        total: prev.total + 1,
        found: prev.found + (scanResult.status === 'found' ? 1 : 0),
        notFound: prev.notFound + (scanResult.status === 'not_found' ? 1 : 0)
      }));
      
      // 1초 후 결과 초기화
      setTimeout(() => setScanResult(null), 1000);
      
      console.log(`QR 코드 처리됨: ${productCode} - ${scanResult.statusMessage}`);
    } catch (error) {
      console.error('QR 처리 오류:', error);
      
      // 에러 시 표시할 결과
      setScanResult({
        productCode: qrData,
        productName: '처리 오류',
        category: '-',
        price: '-',
        status: 'error',
        statusMessage: '처리 중 오류 발생',
        statusColor: '#ffc107',
        timestamp: new Date()
      });
      
      setTimeout(() => setScanResult(null), 1000);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment'
        } 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsScanning(true);

      // 간단한 플래시라이트 지원 확인만
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        setHasFlashlight(true);
      }

      // 세션 시작
      await startSession();

      // 비디오 로드 완료 후 QR 스캔 시작 (일반 카메라처럼 즉시)
      videoRef.current.onloadedmetadata = () => {
        startQRScanning();
      };
    } catch (error) {
      console.error('카메라 접근 실패:', error);
      alert('카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.');
    }
  };

  const startQRScanning = () => {
    const scanQRCode = () => {
      if (videoRef.current && canvasRef.current && isScanning) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // 캔버스 크기를 고정 크기로 설정 (일반 카메라처럼)
        const canvasWidth = 640;
        const canvasHeight = 480;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // 비디오 프레임을 캔버스에 그리기 (일반 카메라 방식)
        context.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        
        // 캔버스에서 이미지 데이터 추출
        const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
        
        // jsQR로 QR 코드 감지 (기본 설정)
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // 디버그: 스캔 상태 표시
        const now = Math.floor(Date.now() / 1000);
        if (now % 2 === 0) {
          setScanStatus(`스캔 중... ${canvasWidth}x${canvasHeight}`);
        }
        
        if (code && code.data) {
          // 중복 스캔 방지 (1초 간격)
          if (code.data !== lastScannedCode) {
            setLastScannedCode(code.data);
            
            console.log('🎉 QR 코드 감지됨!:', code.data);
            
            setScanStatus(`QR 코드 발견: ${code.data}`);
            
            // QR 데이터 처리
            processQR(code.data);
            
            // 1초 후 중복 방지 해제
            setTimeout(() => setLastScannedCode(''), 1000);
          }
        }
        
        // 다음 프레임 스캔 (더 빠른 스캔을 위해 60fps)
        animationFrameRef.current = requestAnimationFrame(scanQRCode);
      }
    };
    
    scanQRCode();
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
    setLastScannedCode('');
  };

  const resetStats = () => {
    setScanStats({
      total: 0,
      found: 0,
      notFound: 0
    });
  };

  // 플래시라이트 토글
  const toggleFlashlight = async () => {
    if (!hasFlashlight || !streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !flashlightOn }]
      });
      setFlashlightOn(!flashlightOn);
    } catch (error) {
      console.error('플래시라이트 제어 실패:', error);
    }
  };



  // 포커스 조정 (간단하게)
  const handleFocus = async (event) => {
    setScanStatus('포커스 조정 시도중...');
    // 일반 카메라처럼 단순하게 처리
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="mobile-container">
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            marginRight: '12px'
          }}
        >
          ←
        </button>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white' 
        }}>
          QR 스캔
        </h1>
      </div>

      {/* 카메라 화면 */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '60vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onClick={handleFocus}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{ display: 'none' }}
        />

        {/* QR 스캔 가이드 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px',
          height: '280px',
          border: '3px solid #00ff00',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
          animation: 'pulse 2s infinite'
        }}>
          {/* 모서리 표시 */}
          <div style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            width: '30px',
            height: '30px',
            borderTop: '6px solid #00ff00',
            borderLeft: '6px solid #00ff00',
            borderRadius: '16px 0 0 0'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            width: '30px',
            height: '30px',
            borderTop: '6px solid #00ff00',
            borderRight: '6px solid #00ff00',
            borderRadius: '0 16px 0 0'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-3px',
            left: '-3px',
            width: '30px',
            height: '30px',
            borderBottom: '6px solid #00ff00',
            borderLeft: '6px solid #00ff00',
            borderRadius: '0 0 0 16px'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-3px',
            right: '-3px',
            width: '30px',
            height: '30px',
            borderBottom: '6px solid #00ff00',
            borderRight: '6px solid #00ff00',
            borderRadius: '0 0 16px 0'
          }}></div>
          
          {/* 스캔 라인 */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '10px',
            right: '10px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
            animation: 'scanLine 2s infinite'
          }}></div>
          
          <div style={{
            color: 'white',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
          }}>
            QR 코드를 여기에 맞춰주세요
          </div>
        </div>

        {/* 카메라 제어 버튼들 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 플래시라이트 버튼 */}
          {hasFlashlight && (
            <button
              onClick={toggleFlashlight}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: flashlightOn ? '#ffc107' : 'rgba(0, 0, 0, 0.5)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={`fas fa-${flashlightOn ? 'lightbulb' : 'flashlight'}`}></i>
            </button>
          )}
          

          
          {/* 테스트 버튼 */}
          <button
            onClick={() => processQR('56169')}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(40, 167, 69, 0.8)',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            T
          </button>
        </div>



        {/* 스캔 상태 표시 */}
        <div style={{
          position: 'absolute',
          bottom: scanResult ? '100px' : '20px',
          left: '20px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {scanStatus}
          <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
            테스트용: 56169, 1005979, 50056
          </div>
        </div>

        {/* 스캔 결과 표시 */}
        {scanResult && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  marginBottom: '4px'
                }}>
                  {scanResult.productName}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666'
                }}>
                  {scanResult.productCode}
                </div>
              </div>
              
              <span style={{
                backgroundColor: scanResult.statusColor,
                color: 'white',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                {scanResult.statusMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        {/* 스캔 통계 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            스캔 통계
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px'
          }}>
            <div style={{
              textAlign: 'center',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {scanStats.total}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#666'
              }}>
                총 스캔
              </div>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '8px',
              backgroundColor: '#d4edda',
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#28a745'
              }}>
                {scanStats.found}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#155724'
              }}>
                진열 상품
              </div>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: '8px',
              backgroundColor: '#f8d7da',
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#dc3545'
              }}>
                {scanStats.notFound}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#721c24'
              }}>
                미진열
              </div>
            </div>
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <button
            onClick={isScanning ? stopCamera : startCamera}
            style={{
              padding: '12px 20px',
              backgroundColor: isScanning ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              flex: '0 0 auto'
            }}
          >
            {isScanning ? '스캔 중단' : '스캔 시작'}
          </button>
          
          <div style={{
            textAlign: 'center',
            color: '#666',
            flex: '1',
            margin: '0 16px'
          }}>
            {sessionId && (
              <div style={{ 
                fontSize: '11px',
                marginBottom: '2px'
              }}>
                세션: {sessionId.toString().slice(-8)}
              </div>
            )}
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 'bold',
              color: isScanning ? '#28a745' : '#666'
            }}>
              {isScanning ? '스캔 중...' : '스캔 준비'}
            </div>
          </div>

          <Link
            to="/"
            style={{
              padding: '12px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              flex: '0 0 auto'
            }}
          >
            홈으로
          </Link>
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#999',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          QR 코드를 카메라에 맞추면 자동으로 인식됩니다
        </div>
      </div>

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
        <Link to="/scan" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default QRScanPage; 