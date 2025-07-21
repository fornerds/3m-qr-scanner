import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import jsQR from 'jsqr';

const QRScanPage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  
  const socketRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const animationFrameRef = useRef();

  useEffect(() => {
    // Vercel 배포 시 자동으로 현재 도메인 사용
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000';
    
    // Socket.io 연결
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/api/qr-scan'
    });

    socketRef.current.on('connect', () => {
      console.log('서버에 연결됨');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('서버 연결 해제');
      setIsConnected(false);
    });

    socketRef.current.on('camera-started', (data) => {
      console.log('카메라 시작됨:', data);
      setSessionId(data.sessionId);
    });

    socketRef.current.on('qr-processed', (data) => {
      console.log('QR 처리됨:', data);
      setScanResult(data);
      // 3초 후 결과 초기화
      setTimeout(() => setScanResult(null), 3000);
    });

    socketRef.current.on('error', (error) => {
      console.error('서버 오류:', error);
      alert(error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

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

      // 서버에 카메라 시작 알림
      socketRef.current.emit('start-camera', {
        storeId: '1',
        userId: 'user123'
      });

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
            
            // 서버로 QR 데이터 전송
            socketRef.current.emit('qr-detected', {
              qrData: code.data,
              timestamp: Date.now()
            });
            
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
    
    // 서버에 카메라 중단 알림
    socketRef.current.emit('stop-camera');
  };

  useEffect(() => {
    if (isConnected) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isConnected]);

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

      {/* 녹색 상태바 */}
      <div style={{
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px 16px',
        fontSize: '14px',
        textAlign: 'center',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <i className="fas fa-store" style={{ fontSize: '14px' }}></i>
        다이소 강남점
        {isConnected && (
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: 'white',
            borderRadius: '50%',
            marginLeft: '8px'
          }}></div>
        )}
      </div>

      {/* 스캔 영역 */}
      <div style={{
        backgroundColor: '#000',
        height: 'calc(100vh - 180px)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* 비디오 요소 (숨김) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        
        {/* 캔버스 (숨김) */}
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{ display: 'none' }}
        />

        {/* 스캔 프레임 */}
        <div style={{
          width: '250px',
          height: '250px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* 노란색 모서리들 */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '40px',
            height: '40px',
            border: '4px solid #ffc107',
            borderRight: 'none',
            borderBottom: 'none',
            borderRadius: '8px 0 0 0'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '40px',
            height: '40px',
            border: '4px solid #ffc107',
            borderLeft: 'none',
            borderBottom: 'none',
            borderRadius: '0 8px 0 0'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '40px',
            height: '40px',
            border: '4px solid #ffc107',
            borderRight: 'none',
            borderTop: 'none',
            borderRadius: '0 0 0 8px'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '40px',
            height: '40px',
            border: '4px solid #ffc107',
            borderLeft: 'none',
            borderTop: 'none',
            borderRadius: '0 0 8px 0'
          }}></div>

          {/* 빨간색 중앙 사각형 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '180px',
            border: '3px solid #dc3545',
            borderRadius: '12px'
          }}></div>

          {/* 스캔 결과 표시 */}
          {scanResult && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              zIndex: 20
            }}>
              <i className="fas fa-check-circle" style={{
                fontSize: '24px',
                color: '#28a745',
                marginBottom: '8px'
              }}></i>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {scanResult.productName}
              </div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>
                {scanResult.productCode}
              </div>
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={() => {
            stopCamera();
            navigate('/');
          }}
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid white',
            borderRadius: '50%',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          ×
        </button>

        {/* 하단 텍스트 */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '14px',
          textAlign: 'center',
          zIndex: 10
        }}>
          {isScanning ? 'QR코드를 스캔 영역에 맞춰주세요' : '카메라 연결 중...'}
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '414px',
        width: '100%',
        height: '60px',
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Link 
          to="/" 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: '#dc3545',
            backgroundColor: '#ffeaea'
          }}
        >
          <i className="fas fa-qrcode" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>QR스캔</div>
        </Link>
        <Link 
          to="/settings" 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: '#999'
          }}
        >
          <i className="fas fa-cog" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>설정</div>
        </Link>
      </div>
    </div>
  );
};

export default QRScanPage; 