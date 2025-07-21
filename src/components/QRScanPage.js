import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
  
  const scannerRef = useRef();
  const scannerDivRef = useRef();

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

  // 다이소 QR 코드 전용 처리
  const processDaisoQR = async (qrData) => {
    try {
      console.log('다이소 QR 처리 시작:', qrData);
      setScanStatus('다이소 QR 분석 중...');
      
      // 다이소 QR 코드에서 제품 코드 추출
      let productCode = extractDaisoProductCode(qrData);
      
      if (productCode) {
        console.log('추출된 제품 코드:', productCode);
        setScanStatus(`제품 코드 추출: ${productCode}`);
        
        // 제품 검색
        await processQR(productCode);
      } else {
        console.log('제품 코드 추출 실패 - 모든 가능한 패턴 시도');
        setScanStatus('제품 코드 추출 실패 - 원본 데이터로 시도');
        
        // 원본 데이터의 모든 가능한 조합 시도
        await tryAllPossibleCodes(qrData);
      }
      
    } catch (error) {
      console.error('다이소 QR 처리 오류:', error);
      setScanStatus('QR 코드 처리 중 오류 발생');
    }
  };

  // 모든 가능한 코드 조합 시도
  const tryAllPossibleCodes = async (qrData) => {
    console.log('=== 모든 가능한 코드 시도 ===');
    
    // 1. 원본 그대로
    console.log('1. 원본 시도:', qrData);
    await processQR(qrData);
    
    // 2. 앞뒤 공백 제거
    const trimmed = qrData.trim();
    if (trimmed !== qrData) {
      console.log('2. 공백제거 시도:', trimmed);
      await processQR(trimmed);
    }
    
    // 3. 알파벳 제거하고 숫자만
    const numbersOnly = qrData.replace(/[^\d]/g, '');
    if (numbersOnly) {
      console.log('3. 숫자만 시도:', numbersOnly);
      await processQR(numbersOnly);
      
      // 숫자가 너무 길면 앞/뒤로 잘라서도 시도
      if (numbersOnly.length > 8) {
        const front = numbersOnly.substring(0, 6);
        const back = numbersOnly.substring(numbersOnly.length - 6);
        console.log('4. 앞 6자리 시도:', front);
        await processQR(front);
        console.log('5. 뒤 6자리 시도:', back);
        await processQR(back);
      }
    }
    
    setScanStatus('모든 패턴 시도 완료 - 콘솔 확인');
  };

  // 다이소 QR 코드에서 제품 코드 추출
  const extractDaisoProductCode = (qrData) => {
    console.log('QR 데이터 분석:', qrData);
    console.log('QR 데이터 16진수:', Array.from(qrData).map(c => c.charCodeAt(0).toString(16)).join(' '));
    
    // 가능한 모든 제품 코드 후보들
    const candidates = [];
    
    // 1. 원본 데이터가 숫자인 경우
    if (/^\d+$/.test(qrData.trim())) {
      candidates.push(qrData.trim());
      console.log('제품 코드 후보 (원본):', qrData.trim());
    }
    
    // 2. 파이프(|) 구분자
    if (qrData.includes('|')) {
      const parts = qrData.split('|');
      console.log('파이프 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (파이프 ${index}):`, cleaned);
        }
      });
    }
    
    // 3. 콤마(,) 구분자
    if (qrData.includes(',')) {
      const parts = qrData.split(',');
      console.log('콤마 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (콤마 ${index}):`, cleaned);
        }
      });
    }
    
    // 4. 세미콜론(;) 구분자
    if (qrData.includes(';')) {
      const parts = qrData.split(';');
      console.log('세미콜론 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (세미콜론 ${index}):`, cleaned);
        }
      });
    }
    
    // 5. 스페이스 구분자
    if (qrData.includes(' ')) {
      const parts = qrData.split(' ');
      console.log('스페이스 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (스페이스 ${index}):`, cleaned);
        }
      });
    }
    
    // 6. 탭 구분자
    if (qrData.includes('\t')) {
      const parts = qrData.split('\t');
      console.log('탭 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (탭 ${index}):`, cleaned);
        }
      });
    }
    
    // 7. 개행 구분자
    if (qrData.includes('\n') || qrData.includes('\r')) {
      const parts = qrData.split(/[\r\n]+/);
      console.log('개행 분리:', parts);
      parts.forEach((part, index) => {
        const cleaned = part.trim();
        if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
          candidates.push(cleaned);
          console.log(`제품 코드 후보 (개행 ${index}):`, cleaned);
        }
      });
    }
    
    // 8. 모든 숫자 추출
    const numbers = qrData.match(/\d+/g);
    if (numbers) {
      console.log('정규식으로 추출된 숫자들:', numbers);
      numbers.forEach((num, index) => {
        if (num.length >= 3) {
          candidates.push(num);
          console.log(`제품 코드 후보 (정규식 ${index}):`, num);
        }
      });
    }
    
    // 9. URL에서 추출 시도
    if (qrData.includes('http') || qrData.includes('www')) {
      console.log('URL 형식 감지');
      const urlNumbers = qrData.match(/[?&].*?(\d{4,})/g);
      if (urlNumbers) {
        urlNumbers.forEach(match => {
          const num = match.match(/\d{4,}/)[0];
          candidates.push(num);
          console.log('제품 코드 후보 (URL):', num);
        });
      }
    }
    
    console.log('모든 후보들:', candidates);
    
    if (candidates.length === 0) {
      console.log('제품 코드 추출 실패');
      return null;
    }
    
    // 가장 적절한 후보 선택 (길이 우선, 그 다음 빈도)
    const bestCandidate = candidates
      .filter(c => c.length >= 4) // 최소 4자리
      .sort((a, b) => b.length - a.length)[0] || candidates[0];
    
    console.log('선택된 제품 코드:', bestCandidate);
    return bestCandidate;
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
            { whiteBalanceMode: 'continuous' }
          ]
        }
      };

      // 스캔 성공 콜백
      const onScanSuccess = (decodedText, decodedResult) => {
        console.log('🎉 바코드 감지됨!:', decodedText);
        console.log('바코드 형식:', decodedResult.result.format?.formatName || 'UNKNOWN');
        console.log('바코드 데이터 길이:', decodedText.length);
        console.log('바코드 데이터 내용:', decodedText);
        console.log('바코드 데이터 타입:', typeof decodedText);
        console.log('바코드 데이터 바이트:', [...decodedText].map(c => c.charCodeAt(0)));
        console.log('전체 결과:', decodedResult);

        // 화면에도 원본 데이터 표시
        const format = decodedResult.result.format?.formatName || 'BARCODE';
        setScanStatus(`${format} 감지: ${decodedText.substring(0, 30)}${decodedText.length > 30 ? '...' : ''}`);

        // 중복 스캔 방지
        if (decodedText !== lastScannedCode) {
          setLastScannedCode(decodedText);

          // 즉시 원본 데이터로도 시도
          console.log('=== 원본 데이터로 검색 시도 ===');
          processQR(decodedText);

          // 다이소 바코드 형식 확인 및 처리
          setTimeout(() => {
            console.log('=== 다이소 형식 분석 시도 ===');
            processDaisoQR(decodedText);
          }, 100);

          // 1초 후 중복 방지 해제
          setTimeout(() => setLastScannedCode(''), 1000);
        }
      };

      // 스캔 에러 콜백 (무시)
      const onScanError = (errorMessage) => {
        // 스캔 에러는 정상적인 상황이므로 무시
      };

      // HTML5-QRCode 스캐너 생성 및 시작
      scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);
      scannerRef.current.render(onScanSuccess, onScanError);

      setIsScanning(true);
      setScanStatus('바코드 스캔 활성화됨 (모든 형식 지원)');

      // 세션 시작
      await startSession();

    } catch (error) {
      console.error('바코드 스캐너 시작 실패:', error);
      setScanStatus('바코드 스캐너 시작 실패 - 브라우저 설정을 확인하세요');
      alert('바코드 스캐너를 시작할 수 없습니다.\n\n해결 방법:\n1. 브라우저에서 카메라 권한 허용\n2. HTTPS 사이트에서 접속\n3. Chrome 또는 Safari 브라우저 사용 권장');
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

  const resetStats = () => {
    setScanStats({
      total: 0,
      found: 0,
      notFound: 0
    });
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

      {/* HTML5-QRCode 스캐너 */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '60vh',
        backgroundColor: '#000'
      }}>
        {/* HTML5-QRCode가 여기에 렌더링됨 */}
        <div id="qr-reader" ref={scannerDivRef} style={{
          width: '100%',
          minHeight: '400px'
        }}></div>

        {/* 테스트 버튼 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
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
            📱 QR + Data Matrix 지원 | 다이소 바코드 최적화 | T 테스트 (56169)
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