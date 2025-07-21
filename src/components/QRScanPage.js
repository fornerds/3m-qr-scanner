import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

const QRScanPage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  
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
      // QR 데이터 파싱
      const [productCode, productName, category, price, stock] = qrData.split('|');
      
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
                productCode,
                productName,
                category,
                price,
                stock,
                timestamp: new Date()
              }
            }
          })
        });
      }
      
      // 결과 표시
      setScanResult({
        productCode,
        productName,
        category,
        price,
        stock,
        timestamp: new Date()
      });
      
      // 3초 후 결과 초기화
      setTimeout(() => setScanResult(null), 3000);
      
      console.log(`QR 코드 처리됨: ${productCode} - ${productName}`);
    } catch (error) {
      console.error('QR 처리 오류:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsScanning(true);

      // 세션 시작
      await startSession();

      // 비디오 로드 완료 후 QR 스캔 시작
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
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        // 비디오 프레임을 캔버스에 그리기
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        
        // 캔버스에서 이미지 데이터 추출
        const imageData = context.getImageData(0, 0, 640, 480);
        
        // jsQR로 QR 코드 감지
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          // 중복 스캔 방지 (1초 간격)
          if (code.data !== lastScannedCode) {
            setLastScannedCode(code.data);
            
            console.log('QR 코드 감지:', code.data);
            
            // QR 데이터 처리
            processQR(code.data);
            
            // 1초 후 중복 방지 해제
            setTimeout(() => setLastScannedCode(''), 1000);
          }
        }
        
        // 다음 프레임 스캔 (30fps)
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

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="mobile-container">
      {/* 3M 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontWeight: 'bold',
          color: '#dc3545',
          fontSize: '12px'
        }}>
          3M
        </div>
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
          width: '250px',
          height: '250px',
          border: '2px solid #fff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            color: 'white',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            QR 코드를 이 영역에<br />맞춰주세요
          </div>
        </div>

        {/* 스캔 결과 표시 */}
        {scanResult && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#dc3545' }}>
              스캔 완료!
            </h3>
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
              {scanResult.productName}
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
              {scanResult.category} | {scanResult.price}
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: '#28a745' }}>
              {scanResult.stock}
            </p>
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div style={{
        padding: '20px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <button
            onClick={stopCamera}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            스캔 중단
          </button>
          
          <div style={{
            textAlign: 'center',
            color: '#666'
          }}>
            {sessionId && (
              <div style={{ fontSize: '12px' }}>
                세션 ID: {sessionId}
              </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {isScanning ? '스캔 중...' : '스캔 준비'}
            </div>
          </div>

          <Link
            to="/"
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            홈으로
          </Link>
        </div>

        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#999'
        }}>
          QR 코드가 감지되면 자동으로 스캔됩니다
        </div>
      </div>
    </div>
  );
};

export default QRScanPage; 