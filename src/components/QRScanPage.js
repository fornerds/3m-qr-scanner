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
  
  // 카메라 제어 상태
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
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
          facingMode: 'environment',
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        } 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsScanning(true);

      // 카메라 기능 확인
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      // 플래시라이트 지원 확인
      if (capabilities.torch) {
        setHasFlashlight(true);
      }
      
      // 줌 기능 확인
      if (capabilities.zoom) {
        setMaxZoom(capabilities.zoom.max || 3);
      }

      // 세션 시작
      await startSession();

      // 비디오 로드 완료 후 QR 스캔 시작
      videoRef.current.onloadedmetadata = () => {
        // 비디오가 완전히 준비될 때까지 잠시 기다림
        setTimeout(() => {
          startQRScanning();
        }, 500);
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
        
        // 비디오가 준비되지 않았으면 다음 프레임에서 다시 시도
        if (video.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(scanQRCode);
          return;
        }
        
        // 캔버스 크기를 비디오 크기에 맞게 조정
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        // 이미지 선명도를 위한 컨텍스트 설정
        context.imageSmoothingEnabled = false;
        context.imageSmoothingQuality = 'high';
        context.filter = 'contrast(1.3) brightness(1.15) saturate(1.1) sharpen(1)';
        
        // 비디오 프레임을 캔버스에 그리기
        context.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        // 캔버스에서 이미지 데이터 추출
        const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
        
        // jsQR로 QR 코드 감지 (최고 감도 설정)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        
        // 스캔 영역을 중앙으로 제한해서 더 정확한 스캔
        let centerCode = null;
        if (!code) {
          const centerX = Math.floor(videoWidth * 0.25);
          const centerY = Math.floor(videoHeight * 0.25);
          const centerWidth = Math.floor(videoWidth * 0.5);
          const centerHeight = Math.floor(videoHeight * 0.5);
          
          const centerImageData = context.getImageData(centerX, centerY, centerWidth, centerHeight);
          centerCode = jsQR(centerImageData.data, centerImageData.width, centerImageData.height, {
            inversionAttempts: "attemptBoth",
          });
        }
        
        const finalCode = code || centerCode;
        
        // 디버그: 스캔 상태 표시
        const now = Math.floor(Date.now() / 1000);
        if (now % 2 === 0) {
          setScanStatus(`스캔 중... ${videoWidth}x${videoHeight}`);
          console.log('스캔 중... 해상도:', videoWidth, 'x', videoHeight);
        }
        
        if (finalCode && finalCode.data) {
          // 중복 스캔 방지 (1초 간격)
          if (finalCode.data !== lastScannedCode) {
            setLastScannedCode(finalCode.data);
            
            console.log('🎉 QR 코드 감지됨!:', finalCode.data);
            console.log('QR 코드 위치:', finalCode.location);
            console.log('스캔 방법:', code ? '전체 영역' : '중앙 영역');
            
            setScanStatus(`QR 코드 발견: ${finalCode.data}`);
            
            // QR 데이터 처리
            processQR(finalCode.data);
            
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

  // 줌 조정
  const adjustZoom = async (direction) => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.zoom) {
        let newZoom = zoomLevel;
        if (direction === 'in' && zoomLevel < maxZoom) {
          newZoom = Math.min(zoomLevel + 0.5, maxZoom);
        } else if (direction === 'out' && zoomLevel > 1) {
          newZoom = Math.max(zoomLevel - 0.5, 1);
        }
        
        await track.applyConstraints({
          advanced: [{ zoom: newZoom }]
        });
        setZoomLevel(newZoom);
      }
    } catch (error) {
      console.error('줌 조정 실패:', error);
    }
  };

  // 포커스 조정 (탭하여 포커스)
  const handleFocus = async (event) => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      // 수동 포커스 시도
      if (capabilities.focusMode) {
        await track.applyConstraints({
          advanced: [{ 
            focusMode: 'manual',
            focusDistance: 0.1 
          }]
        });
        
        // 잠시 후 연속 포커스로 전환
        setTimeout(async () => {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            });
          } catch (e) {
            console.log('연속 포커스 설정 실패:', e);
          }
        }, 100);
      }
      
      // 노출 최적화
      if (capabilities.exposureMode) {
        await track.applyConstraints({
          advanced: [{ exposureMode: 'manual', exposureCompensation: 0 }]
        });
      }
      
      setScanStatus('포커스 조정됨');
    } catch (error) {
      console.error('포커스 조정 실패:', error);
    }
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
          
          {/* 줌 인 버튼 */}
          <button
            onClick={() => adjustZoom('in')}
            disabled={zoomLevel >= maxZoom}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: zoomLevel >= maxZoom ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: zoomLevel >= maxZoom ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-search-plus"></i>
          </button>
          
          {/* 줌 아웃 버튼 */}
          <button
            onClick={() => adjustZoom('out')}
            disabled={zoomLevel <= 1}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: zoomLevel <= 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: zoomLevel <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-search-minus"></i>
          </button>
          
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

        {/* 줌 레벨 표시 */}
        {zoomLevel > 1 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {zoomLevel.toFixed(1)}x
          </div>
        )}

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