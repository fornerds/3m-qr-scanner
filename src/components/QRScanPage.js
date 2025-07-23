import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from 'html5-qrcode';

const QRScanPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '1'; // URL에서 storeId 가져오기, 기본값 1
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scanStats, setScanStats] = useState({
    totalScans: 0
  });
  const [scannedProducts, setScannedProducts] = useState(new Set()); // 이미 스캔한 제품들
  
  const [scanStatus, setScanStatus] = useState('스캔 준비 중...');
  
  const scannerRef = useRef();
  const scannerDivRef = useRef();
  const [pinchDistance, setPinchDistance] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(1);

  // 세션 시작
  const startSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: storeId,
          userId: `user_${Date.now()}`, // 동적 사용자 ID 생성
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
      
      // 이미 스캔한 제품인지 확인
      if (scannedProducts.has(productCode)) {
        setScanResult({
          productCode,
          productName: '이미 스캔한 제품',
          category: '-',
          price: '-',
          status: 'already_scanned',
          statusMessage: '이미 스캔됨',
          statusColor: '#ffc107',
          timestamp: new Date()
        });
        
        // 2초 후 결과 초기화
        setTimeout(() => setScanResult(null), 2000);
        return;
      }
      
      // MongoDB에서 제품 검색 (SKU 기준)
      const response = await fetch(`/api/products?sku=${encodeURIComponent(productCode)}`);
      
      const result = await response.json();
      
      let scanResult;
      
      if (result.success && result.product) {
        // 제품을 찾은 경우
        const product = result.product;
        scanResult = {
          productCode,
          productName: product.name,
          category: product.category,
          price: `${product.price.toLocaleString()}원`,
          status: 'found',
          statusMessage: '진열 상품 확인됨',
          statusColor: '#28a745',
          product: product,
          timestamp: new Date()
        };
        
        // 스캔 기록 DB에 저장 (3M 제품만)
        try {
          await fetch('/api/scan-records', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storeId: storeId, // URL에서 가져온 매장 ID
              productCode,
              productName: product.name,
              sessionId
            })
          });
        } catch (error) {
          console.error('스캔 기록 저장 실패:', error);
        }
        
        // 스캔한 제품 목록에 추가 (3M 제품만)
        setScannedProducts(prev => new Set([...prev, productCode]));
        
        // 통계 업데이트 (3M 제품만 카운트)
        setScanStats(prev => ({
          totalScans: prev.totalScans + 1
        }));
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
      
      // 결과 표시
      setScanResult(scanResult);
      
      // 2초 후 결과 초기화
      setTimeout(() => setScanResult(null), 2000);
      
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
      
      setTimeout(() => setScanResult(null), 2000);
    }
  };

  const startCamera = async () => {
    try {
      // 이전 스캐너 완전히 정리
      const qrReaderDiv = document.getElementById('qr-reader');
      if (qrReaderDiv) {
        // 비디오 요소 안전하게 정지
        const video = qrReaderDiv.querySelector('video');
        if (video) {
          video.pause();
          video.srcObject = null;
        }
      }
      
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      
      // QR reader DOM 완전히 정리
      if (qrReaderDiv) {
        qrReaderDiv.innerHTML = '';
      }
      
      // 잠깐 대기 (DOM 정리 시간)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 자동 카메라 시작 설정 (정사각형 스캔 박스)
      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 }, // 명시적으로 정사각형 설정
        aspectRatio: 1.0, // 정사각형 비율 강제
        rememberLastUsedCamera: true, // 마지막 사용 카메라 기억
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], // 카메라만 사용
        showTorchButtonIfSupported: false, // 플래시 버튼 숨김
        showZoomSliderIfSupported: false, // 줌 슬라이더 숨김
        defaultZoomValueIfSupported: 1 // 기본 줌 값
      };

      // 스캔 성공 콜백
      const onScanSuccess = (decodedText, decodedResult) => {
        // 중복 스캔 방지
        if (decodedText !== lastScannedCode) {
          setLastScannedCode(decodedText);
          setScanStatus(`제품 검색 중...`);
          
          // 제품 검색
          processQR(decodedText);
          
          // 3초 후 중복 방지 해제
          setTimeout(() => setLastScannedCode(''), 3000);
        }
      };

      // 스캔 에러 콜백 (무시)
      const onScanError = (errorMessage) => {
        // 스캔 에러는 정상적인 상황이므로 무시
      };

      // Html5Qrcode 직접 사용으로 바로 카메라 시작
      try {
        scannerRef.current = new Html5Qrcode("qr-reader");
        
        // 카메라 설정
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
          onScanSuccess(decodedText, decodedResult);
        };
        
        const cameraConfig = {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0
        };
        
        // 후면 카메라로 바로 시작
        await scannerRef.current.start(
          { facingMode: "environment" }, // 후면 카메라 사용
          cameraConfig,
          qrCodeSuccessCallback,
          onScanError
        );

        setIsScanning(true);
        setScanStatus('바코드 스캔 중...');

        // 세션 시작
        await startSession();
      } catch (renderError) {
        console.error('스캐너 렌더링 오류:', renderError);
        setScanStatus('카메라 초기화 실패');
        // 권한이 거부된 경우 알림 표시
        if (renderError.name === 'NotAllowedError') {
          alert('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
        }
        throw renderError;
      }

    } catch (error) {
      console.error('바코드 스캐너 시작 실패:', error);
      setScanStatus('카메라 접근 실패');
      alert('카메라에 접근할 수 없습니다. 카메라 권한을 허용해주세요.');
    }
  };

  const stopCamera = async () => {
    try {
      // 비디오 요소 안전하게 정지
      const qrReaderDiv = document.getElementById('qr-reader');
      if (qrReaderDiv) {
        const video = qrReaderDiv.querySelector('video');
        if (video) {
          try {
            video.pause();
            if (video.srcObject) {
              const tracks = video.srcObject.getTracks();
              tracks.forEach(track => track.stop());
            }
            video.srcObject = null;
          } catch (videoError) {
            console.log('비디오 정리 중 무시 가능한 오류:', videoError);
          }
        }
      }
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (stopError) {
          console.log('스캐너 정지 중 무시 가능한 오류:', stopError);
        }
        scannerRef.current = null;
      }
      
      // DOM 정리는 약간의 지연 후 실행
      setTimeout(() => {
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv) {
          qrReaderDiv.innerHTML = '';
        }
      }, 100);
      
      setIsScanning(false);
      setScanResult(null);
      setLastScannedCode('');
      setScanStatus('바코드 스캔 중지됨');
    } catch (error) {
      console.error('카메라 정지 오류:', error);
    }
  };

  // 핀치 줌 기능
  const getDistance = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches);
      setPinchDistance(distance);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchDistance > 0) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const scale = newDistance / pinchDistance;
      
      let newZoom = currentZoom * scale;
      newZoom = Math.max(1, Math.min(2, newZoom)); // 1x~2x로 제한 (박스 벗어남 방지)
      
      setCurrentZoom(newZoom);
      setPinchDistance(newDistance);
      
      // 실제 비디오 요소에 줌 적용 (박스 내에서만)
      const video = scannerDivRef.current?.querySelector('video');
      const scanRegion = scannerDivRef.current?.querySelector('#qr-reader__scan_region');
      if (video && scanRegion) {
        video.style.transform = `scale(${newZoom})`;
        video.style.transformOrigin = 'center center';
        // 비디오가 스캔 영역을 벗어나지 않도록 클리핑
        scanRegion.style.overflow = 'hidden';
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setPinchDistance(0);
    }
  };

  const resetStats = () => {
    setScanStats({
      totalScans: 0
    });
    setScannedProducts(new Set()); // 스캔한 제품 목록도 초기화
  };









  useEffect(() => {
    // 컴포넌트 마운트 후 약간의 지연을 두고 카메라 시작
    const timer = setTimeout(() => {
      startCamera();
    }, 100);
    
    return () => {
      // 타이머 정리
      clearTimeout(timer);
      
      // 컴포넌트 언마운트 시 완전한 정리
      try {
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv) {
          // 비디오 요소 안전하게 정지
          const video = qrReaderDiv.querySelector('video');
          if (video) {
            try {
              video.pause();
              if (video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
              }
              video.srcObject = null;
            } catch (videoError) {
              console.log('비디오 정리 중 무시 가능한 오류:', videoError);
            }
          }
        }
        
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (scannerError) {
            console.log('스캐너 정리 중 무시 가능한 오류:', scannerError);
          }
          scannerRef.current = null;
        }
        
        // DOM 정리는 비동기로 실행
        setTimeout(() => {
          const qrReaderDiv = document.getElementById('qr-reader');
          if (qrReaderDiv) {
            qrReaderDiv.innerHTML = '';
          }
        }, 100);
      } catch (error) {
        console.error('Cleanup 오류:', error);
      }
    };
  }, []);

  return (
    <div className="mobile-container">
      {/* QR 스캔 영역 정사각형 박스 */}
      <style jsx>{`
        #qr-shaded-region {
          border-width: 80px 67px !important;
        }
        
        #qr-reader canvas {
          width: 280px !important;
          height: 280px !important;
        }
        
        #qr-reader video {
          width: 100% !important;
          height: 440px !important;
          object-fit: cover !important;
          transform-origin: center center !important;
        }
        
        #qr-reader__scan_region {
          width: 100% !important;
          height: 440px !important;
          overflow: hidden !important;
        }
        
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '16px',
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
          color: 'white',
          flex: 1,
          textAlign: 'center'
        }}>
          QR 스캔
        </h1>
      </div>

      {/* HTML5-QRCode 스캐너 */}
      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'black', // 카메라 배경을 검은색으로
        height: '440px' // 정사각형 스캔박스에 맞는 고정 높이
      }}>
        {/* HTML5-QRCode가 여기에 렌더링됨 */}
        <div 
          id="qr-reader" 
          ref={scannerDivRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: '100%',
            touchAction: 'none' // 기본 터치 제스처 비활성화
          }}
        ></div>





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
        padding: '16px',
        paddingBottom: '80px', // 하단 네비게이션바와 간격 줄임
        backgroundColor: '#f5f5f5'
      }}>
        {/* 스캔 통계 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f8f9fa'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '6px',
                height: '20px',
                backgroundColor: '#dc3545',
                borderRadius: '3px'
              }}></div>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#495057'
              }}>
                스캔 통계
              </span>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '40px',
                fontWeight: '700',
                color: '#dc3545',
                lineHeight: '1',
                marginBottom: '6px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
              }}>
                {scanStats.totalScans}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#6c757d',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                스캔한 제품 수
              </div>
            </div>
          </div>
        </div>

        {/* 상태 표시 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isScanning ? '#28a745' : '#6c757d'
            }}></div>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              color: isScanning ? '#28a745' : '#6c757d'
            }}>
              {isScanning ? '스캔 중...' : '스캔 준비'}
            </span>
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '12px'
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
            {isScanning ? '스캔 중단' : '스캔 시작'}
          </button>
          
          <Link
            to="/"
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
            <i className="fas fa-home" style={{
              fontSize: '14px'
            }}></i>
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
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default QRScanPage; 