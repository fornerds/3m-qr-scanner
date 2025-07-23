import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
      // HTML5-QRCode 스캐너 설정
      const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        disableFlip: false,
        // 모든 바코드 형식 지원
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        videoConstraints: {
          facingMode: 'environment',
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
            { zoom: { min: 1, max: 3 } }
          ]
        }
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

      // HTML5-QRCode 스캐너 생성 및 시작
      scannerRef.current = new Html5QrcodeScanner("qr-reader", config, /* verbose= */ false);
      scannerRef.current.render(onScanSuccess, onScanError);

      // 기본 UI 요소들 숨기기
      setTimeout(() => {
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv) {
          // 권한 요청 메시지와 기본 버튼들 숨기기
          const selectElements = qrReaderDiv.querySelectorAll('select');
          const spanElements = qrReaderDiv.querySelectorAll('span');
          const divElements = qrReaderDiv.querySelectorAll('div');
          
          selectElements.forEach(el => el.style.display = 'none');
          spanElements.forEach(el => {
            if (el.innerText && (
              el.innerText.includes('Request') || 
              el.innerText.includes('Camera') || 
              el.innerText.includes('Permission') ||
              el.innerText.includes('Select') ||
              el.innerText.includes('Choose')
            )) {
              el.style.display = 'none';
            }
          });
          
          // 불필요한 컨트롤 숨기기
          divElements.forEach(el => {
            if (el.style && el.style.textAlign === 'center' && el.children.length > 0) {
              const hasSelect = el.querySelector('select');
              const hasSpan = el.querySelector('span');
              if (hasSelect || (hasSpan && hasSpan.innerText && hasSpan.innerText.includes('Camera'))) {
                el.style.display = 'none';
              }
            }
          });
        }
      }, 100);

      setIsScanning(true);
      setScanStatus('바코드 스캔 중...');

      // 세션 시작
      await startSession();

    } catch (error) {
      console.error('바코드 스캐너 시작 실패:', error);
      setScanStatus('카메라 접근 실패');
      alert('카메라에 접근할 수 없습니다. 카메라 권한을 허용해주세요.');
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
    setLastScannedCode('');
    setScanStatus('바코드 스캔 중지됨');
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
      newZoom = Math.max(1, Math.min(3, newZoom)); // 1x~3x 제한
      
      setCurrentZoom(newZoom);
      setPinchDistance(newDistance);
      
      // 실제 비디오 요소에 줌 적용
      const video = scannerDivRef.current?.querySelector('video');
      if (video) {
        video.style.transform = `scale(${newZoom})`;
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
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="mobile-container">
      {/* CSS 스타일로 HTML5-QRCode 기본 UI 숨기기 */}
      <style jsx>{`
        #qr-reader select,
        #qr-reader span:contains("Request"),
        #qr-reader span:contains("Camera"),
        #qr-reader span:contains("Permission"),
        #qr-reader span:contains("Select"),
        #qr-reader span:contains("Choose"),
        #qr-reader__dashboard_section,
        #qr-reader__camera_selection,
        #qr-reader__camera_permission_button {
          display: none !important;
        }
        
        #qr-reader video {
          border-radius: 0 !important;
          object-fit: cover !important;
        }
        
        #qr-reader__scan_region {
          border: none !important;
        }
        
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
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

      {/* HTML5-QRCode 스캐너 */}
      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#000'
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
            minHeight: '400px',
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
        padding: '20px',
        paddingBottom: '100px', // 하단 네비게이션바와 간격
        backgroundColor: '#f5f5f5'
      }}>
        {/* 스캔 통계 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingBottom: '16px',
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
                fontSize: '48px',
                fontWeight: '700',
                color: '#dc3545',
                lineHeight: '1',
                marginBottom: '8px',
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
          marginBottom: '16px'
        }}>
          <button
            onClick={isScanning ? stopCamera : startCamera}
            style={{
              flex: 1,
              padding: '16px',
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
              padding: '16px',
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
        <Link to="/scan" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default QRScanPage; 