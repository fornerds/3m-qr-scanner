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
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scanStats, setScanStats] = useState({
    totalScans: 0
  });
  const [scannedProducts, setScannedProducts] = useState(new Set()); // 이미 스캔한 제품들
  
  const [scanStatus, setScanStatus] = useState('스캔 준비 중...');
  
  // 검색 관련 state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // 제품 캐시 시스템 (최고 속도를 위한 로컬 캐싱)
  const [productCache, setProductCache] = useState(new Map());
  const [isPreloading, setIsPreloading] = useState(false);
  const SCAN_COOLDOWN = 30; // 30ms로 극한 최적화
  
  // 카메라 설정 옵션
  const [currentSetting, setCurrentSetting] = useState('extreme'); // 기본값: 극한 최적화
  const [showSettings, setShowSettings] = useState(false);
  
  // AI 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [showAiResults, setShowAiResults] = useState(false);
  

  
  // 카메라 설정 프리셋
  const CAMERA_PRESETS = {
    extreme: {
      name: '극한 최적화',
      description: '빠른 스캔 (VGA/15fps)',
      fps: 15,
      qrboxPercentage: 0.6,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        frameRate: { ideal: 15, min: 10 }
      }
    },
    standard: {
      name: '표준',
      description: '균형잡힌 성능 (HD/30fps)',
      fps: 30,
      qrboxPercentage: 0.7,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 }
      }
    },
    highPerformance: {
      name: '고성능',
      description: '높은 해상도 (Full HD/60fps)',
      fps: 60,
      qrboxPercentage: 0.75,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        frameRate: { ideal: 60, min: 30 }
      }
    },
    basic: {
      name: '기본',
      description: '호환성 우선 (기본/15fps)',
      fps: 15,
      qrboxPercentage: 0.5,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      }
    }
  };
  
  const scannerRef = useRef();
  const scannerDivRef = useRef();
  const [pinchDistance, setPinchDistance] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(1);

  // 현재 설정에 따른 카메라 설정 생성
  const getCurrentCameraConfig = () => {
    const preset = CAMERA_PRESETS[currentSetting];
    
    const config = {
      fps: preset.fps,
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        let qrboxSize = Math.floor(minEdgeSize * preset.qrboxPercentage);
        return {
          width: qrboxSize,
          height: qrboxSize
        };
      },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: false,
      defaultZoomValueIfSupported: 1,
      disableFlip: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.PDF_417
      ],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    const cameraConfig = {
      ...config,
      videoConstraints: {
        ...preset.videoConstraints,
        focusMode: { ideal: "continuous" },
        whiteBalanceMode: { ideal: "continuous" },
        exposureMode: { ideal: "continuous" }
      }
    };

    return { config, cameraConfig };
  };



  // 설정 변경 시 카메라 재시작
  const changeCameraSetting = async (newSetting) => {
    console.log('카메라 설정 변경:', currentSetting, '->', newSetting);
    
    setScanStatus('설정 변경 중...');
    setCurrentSetting(newSetting);
    
    // 카메라 정지 후 재시작
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        console.log('카메라 정지 완료');
        
        // 잠깐 대기 후 재시작
        setTimeout(() => {
          startCamera();
        }, 500);
      } catch (error) {
        console.error('카메라 정지 중 오류:', error);
        // 강제로 재시작
        setTimeout(() => {
          startCamera();
        }, 500);
      }
    } else {
      // 카메라가 실행 중이 아니면 바로 시작
      startCamera();
    }
    
    setShowSettings(false);
  };

  // 핀치 줌 관련 함수들
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    console.log('터치 시작, 터치 수:', e.touches.length);
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setPinchDistance(distance);
      console.log('핀치 시작 거리:', distance);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchDistance > 0) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scale = distance / pinchDistance;
      
      const newZoom = Math.min(Math.max(currentZoom * scale, 1), 3);
      
      if (Math.abs(newZoom - currentZoom) > 0.02) {
        console.log('줌 변경:', currentZoom, '->', newZoom);
        setCurrentZoom(newZoom);
        applyZoom(newZoom);
        setPinchDistance(distance);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setPinchDistance(0);
    }
  };

  const applyZoom = (zoomLevel) => {
    // 다양한 선택자로 비디오 요소 찾기
    let video = document.querySelector('#qr-reader video');
    if (!video) {
      video = document.querySelector('video');
    }
    
    if (video) {
      // 비디오만 확대 (컨테이너는 그대로)
      video.style.transform = `scale(${zoomLevel})`;
      video.style.transformOrigin = 'center center';
      video.style.transition = 'transform 0.2s ease';
      video.style.maxWidth = 'none'; // 확대 시 maxWidth 제한 제거
      video.style.maxHeight = 'none';
      
      console.log('줌 적용됨:', zoomLevel);
    } else {
      console.log('비디오 요소를 찾을 수 없음');
    }
  };

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

  // 제품 캐시 프리로딩 (앱 시작 시 자주 스캔되는 제품들 미리 로드)
  const preloadPopularProducts = async () => {
    if (isPreloading) return;
    
    setIsPreloading(true);
    try {
      // 인기 제품들을 백그라운드에서 미리 로드
      const response = await fetch('/api/products?limit=50'); // 상위 50개 제품
      const result = await response.json();
      
      if (result.success && result.products) {
        const newCache = new Map(productCache);
        result.products.forEach(product => {
          newCache.set(product.sku, product);
        });
        setProductCache(newCache);
        console.log(`${result.products.length}개 제품을 캐시에 프리로드했습니다.`);
      }
    } catch (error) {
      console.log('제품 프리로딩 실패:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  // 캐시된 제품 검색 (초고속)
  const searchProductFromCache = (productCode) => {
    return productCache.get(productCode);
  };

  // 제품 캐시에 추가
  const addToCache = (productCode, product) => {
    const newCache = new Map(productCache);
    newCache.set(productCode, product);
    setProductCache(newCache);
  };

  // 제품 검색 함수
  const searchProducts = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=20`);
      const result = await response.json();
      
      if (result.success && result.products) {
        setSearchResults(result.products);
        setShowSearchResults(true);
        
        // 검색 결과를 캐시에도 추가
        result.products.forEach(product => {
          if (product.sku) {
            addToCache(product.sku, product);
          }
        });
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('제품 검색 오류:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색된 제품 선택 시 처리 (스캔과 동일한 로직)
  const selectProduct = async (product) => {
    try {
      const productCode = product.sku;
      
      // 이미 스캔한 제품인지 확인
      if (scannedProducts.has(productCode)) {
        setScanResult({
          productCode,
          productName: product.name,
          category: product.category,
          price: `${product.price.toLocaleString()}원`,
          status: 'already_scanned',
          statusMessage: '이미 스캔됨',
          statusColor: '#ffc107',
          timestamp: new Date()
        });
        
        // 검색 결과 숨기기
        setShowSearchResults(false);
        setSearchTerm('');
        
        // 1.5초 후 결과 초기화
        setTimeout(() => setScanResult(null), 1500);
        return;
      }

      // 스캔 기록 DB에 저장
      try {
        const saveResponse = await fetch('/api/scan-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storeId: storeId,
            productCode,
            productName: product.name,
            sessionId
          })
        });
        
        const saveResult = await saveResponse.json();
        
        let scanResult;
        
        if (saveResult.isDuplicate) {
          // 중복 처리
          scanResult = {
            productCode,
            productName: product.name,
            category: product.category,
            price: `${product.price.toLocaleString()}원`,
            status: 'already_scanned',
            statusMessage: '이미 스캔됨',
            statusColor: '#ffc107',
            timestamp: new Date()
          };
        } else {
          // 정상적으로 새로 선택된 경우
          scanResult = {
            productCode,
            productName: product.name,
            category: product.category,
            price: `${product.price.toLocaleString()}원`,
            status: 'found',
            statusMessage: '검색으로 등록됨',
            statusColor: '#28a745',
            product: product,
            timestamp: new Date()
          };
          
          // 스캔한 제품 목록에 추가
          setScannedProducts(prev => new Set([...prev, productCode]));
          
          // 통계 업데이트
          setScanStats(prev => ({
            totalScans: prev.totalScans + 1
          }));
        }
        
        setScanResult(scanResult);
        
        // 검색 결과 숨기기
        setShowSearchResults(false);
        setSearchTerm('');
        
        // 진동 피드백
        if (navigator.vibrate && scanResult.status === 'found') {
          navigator.vibrate(200);
        }
        
        // 2초 후 결과 초기화
        setTimeout(() => setScanResult(null), 2000);
        
      } catch (error) {
        console.error('스캔 기록 저장 실패:', error);
        
        // 오류가 있어도 기본 결과는 표시
        setScanResult({
          productCode,
          productName: product.name,
          category: product.category,
          price: `${product.price.toLocaleString()}원`,
          status: 'found',
          statusMessage: '검색으로 등록됨',
          statusColor: '#28a745',
          product: product,
          timestamp: new Date()
        });
        
        setShowSearchResults(false);
        setSearchTerm('');
        setTimeout(() => setScanResult(null), 2000);
      }
      
    } catch (error) {
      console.error('제품 선택 처리 오류:', error);
      setShowSearchResults(false);
      setSearchTerm('');
    }
  };

  // QR 코드 처리 (초고속 버전)
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
        
        // 1.5초 후 결과 초기화 (빠른 연속 스캔)
        setTimeout(() => setScanResult(null), 1500);
        return;
      }
      
      // 1단계: 캐시에서 초고속 검색 먼저 시도
      let product = searchProductFromCache(productCode);
      let result = null;
      
      if (product) {
        // 캐시 히트! 즉시 응답
        console.log('캐시에서 제품 찾음:', productCode);
        result = { success: true, product };
        setScanStatus('캐시에서 찾음 ⚡');
      } else {
        // 캐시 미스, API 호출
        setScanStatus('DB에서 검색 중...');
      const response = await fetch(`/api/products?sku=${encodeURIComponent(productCode)}`);
        result = await response.json();
        
        // API 결과를 캐시에 저장
        if (result.success && result.product) {
          addToCache(productCode, result.product);
          product = result.product;
        }
      }
      
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
          const saveResponse = await fetch('/api/scan-records', {
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
          
          const saveResult = await saveResponse.json();
          
          // API에서 중복이라고 응답하면 중복 처리
          if (saveResult.isDuplicate) {
            scanResult = {
              productCode,
              productName: product.name,
              category: product.category,
              price: `${product.price.toLocaleString()}원`,
              status: 'already_scanned',
              statusMessage: '이미 스캔됨',
              statusColor: '#ffc107',
              timestamp: new Date()
            };
            
            // 스캔한 제품 목록에는 추가하지 않음
            // 통계도 업데이트하지 않음
          } else {
            // 정상적으로 새로 스캔된 경우에만 처리
            // 스캔한 제품 목록에 추가 (3M 제품만)
            setScannedProducts(prev => new Set([...prev, productCode]));
            
            // 통계 업데이트 (3M 제품만 카운트)
            setScanStats(prev => ({
              totalScans: prev.totalScans + 1
            }));
          }
        } catch (error) {
          console.error('스캔 기록 저장 실패:', error);
        }

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
      
      // 스캔 성공시 진동 피드백 (지원하는 기기에서)
      if (navigator.vibrate && scanResult.status === 'found') {
        navigator.vibrate(200);
      }
      
      // 2초 후 결과 초기화 (빠른 연속 스캔을 위해 단축)
      setTimeout(() => {
        setScanResult(null);
        setScanStatus('바코드 스캔 중...');
      }, 2000);
      
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
      
      // 현재 설정에 따른 카메라 설정 가져오기
      const { config, cameraConfig: dynamicCameraConfig } = getCurrentCameraConfig();

      // 스캔 성공 콜백
      const onScanSuccess = (decodedText, decodedResult) => {
        const currentTime = Date.now();
        
        // 강화된 중복 스캔 방지
        // 1. 같은 코드인지 확인
        // 2. 쿨다운 시간 확인 (2초)
        if (decodedText === lastScannedCode && (currentTime - lastScanTime) < SCAN_COOLDOWN) {
          console.log('스캔 쿨다운 중:', decodedText);
          return;
        }
        
        // 스캔 허용
        setLastScannedCode(decodedText);
        setLastScanTime(currentTime);
        
        // 즉시 피드백 제공
        setScanStatus(`✓ 스캔됨! 검색 중... (${decodedText.substring(0, 10)}...)`);
        
        // 진동 피드백 (지원하는 기기에서)
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
        
        // 제품 검색
        processQR(decodedText);
        
        // 1초 후 중복 방지 해제 (최고 속도 재스캔)
        setTimeout(() => {
          setLastScannedCode('');
          setLastScanTime(0);
        }, 1000);
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
        
        // 동적 카메라 설정 사용
        const cameraConfig = dynamicCameraConfig;
        
        // 후면 카메라 우선 시작 (카메라 목록에서 후면 카메라 찾기)
        let cameraId = { facingMode: "environment" };
        
        try {
          // 사용 가능한 카메라 목록 가져오기
          const cameras = await Html5Qrcode.getCameras();
          console.log('사용 가능한 카메라:', cameras);
          
          if (cameras && cameras.length > 0) {
            // 후면 카메라 찾기 (보통 "back" 또는 "environment"라는 이름 포함)
            const backCamera = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('rear') ||
              camera.label.toLowerCase().includes('environment') ||
              !camera.label.toLowerCase().includes('front')
            );
            
            if (backCamera) {
              cameraId = backCamera.id;
              console.log('후면 카메라 선택:', backCamera);
            } else if (cameras.length > 1) {
              // 후면 카메라를 찾지 못했지만 여러 카메라가 있다면 마지막 카메라 사용 (보통 후면)
              cameraId = cameras[cameras.length - 1].id;
              console.log('마지막 카메라 선택 (후면 추정):', cameras[cameras.length - 1]);
            }
          }
        } catch (err) {
          console.log('카메라 목록 조회 실패, 기본 설정 사용:', err);
        }
        
        await scannerRef.current.start(
          cameraId,
          cameraConfig,
          qrCodeSuccessCallback,
          onScanError
        );

        setIsScanning(true);
        setScanStatus(`바코드 스캔 중...`);

        // 줌 초기화
        setCurrentZoom(1);

        // 세션 시작
        await startSession();
        
        // 카메라가 로드된 후 터치 이벤트 추가
        setTimeout(() => {
          const video = document.querySelector('#qr-reader video');
          console.log('카메라 로드 확인 - Video:', !!video);
          
          // QR reader의 pointerEvents를 auto로 변경하여 터치 가능하게
          const qrReader = document.getElementById('qr-reader');
          if (qrReader) {
            qrReader.style.pointerEvents = 'auto';
          }
          
          applyZoom(1);
        }, 1000); // 1초로 늘림
      } catch (renderError) {
        console.error('스캐너 렌더링 오류:', renderError);
        
        // 권한이 거부된 경우 상세한 안내 표시
        if (renderError.name === 'NotAllowedError') {
          setScanStatus('카메라 권한이 필요합니다');
          showCameraPermissionGuide();
        } else if (renderError.name === 'NotFoundError') {
          setScanStatus('카메라를 찾을 수 없습니다');
          alert('카메라가 연결되어 있는지 확인해주세요.');
        } else if (renderError.name === 'NotReadableError') {
          setScanStatus('카메라가 다른 앱에서 사용 중입니다');
          alert('다른 앱에서 카메라를 사용 중입니다. 다른 앱을 종료한 후 다시 시도해주세요.');
        } else if (renderError.name === 'OverconstrainedError') {
          setScanStatus('카메라 설정이 지원되지 않습니다');
          console.log('설정이 지원되지 않아 단계적 폴백을 시작합니다.');
          tryDifferentCameraSettings();
          return; // 폴백 시스템이 실행되므로 에러를 throw하지 않음
        } else if (!renderError.name || renderError.message === 'undefined' || String(renderError).includes('undefined')) {
          setScanStatus('현재 설정이 지원되지 않음 - 다른 설정 시도 중...');
          console.log('현재 설정이 지원되지 않아 자동으로 다른 설정을 시도합니다.');
          setTimeout(() => tryDifferentCameraSettings(), 300);
          return; // 폴백 시스템이 실행되므로 에러를 throw하지 않음
        } else {
          setScanStatus('카메라 접근 오류');
          alert(`카메라 오류: ${renderError.message || 'Unknown error'}`);
        }
        throw renderError;
      }

    } catch (error) {
      console.error('바코드 스캐너 시작 실패:', error);
      
      // 에러 타입별 상세 처리
      if (error.name === 'NotAllowedError') {
        setScanStatus('카메라 권한이 필요합니다');
        showCameraPermissionGuide();
      } else if (error.name === 'NotFoundError') {
        setScanStatus('카메라를 찾을 수 없습니다');
        alert('카메라가 연결되어 있는지 확인해주세요.');
      } else if (error.name === 'NotReadableError') {
        setScanStatus('카메라가 다른 앱에서 사용 중입니다');
        alert('다른 앱에서 카메라를 사용 중입니다. 다른 앱을 종료한 후 다시 시도해주세요.');
      } else if (error.name === 'OverconstrainedError' || !error.name || error.message === 'undefined' || String(error).includes('undefined')) {
        setScanStatus('현재 설정이 지원되지 않음 - 다른 설정 시도 중...');
        console.log('현재 설정이 지원되지 않아 자동으로 다른 설정을 시도합니다.');
        // 자동으로 단계적 설정으로 재시도
        setTimeout(() => tryDifferentCameraSettings(), 300);
      } else {
      setScanStatus('카메라 접근 실패');
        alert(`카메라 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
      }
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
      
      // 줌 상태 초기화
      setCurrentZoom(1);
      setPinchDistance(0);
      
    } catch (error) {
      console.error('카메라 정지 오류:', error);
    }
  };

  const resetStats = () => {
    setScanStats({
      totalScans: 0
    });
    setScannedProducts(new Set()); // 스캔한 제품 목록도 초기화
  };

  // 카메라 권한 안내 표시
  const showCameraPermissionGuide = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    let message = '카메라 권한이 필요합니다.\n\n';
    
    if (isMobile) {
      if (isChrome) {
        message += '모바일 Chrome에서 권한 허용 방법:\n';
        message += '1. 주소창 왼쪽의 자물쇠 아이콘을 탭하세요\n';
        message += '2. "카메라" 항목을 "허용"으로 변경하세요\n';
        message += '3. 페이지를 새로고침하세요';
      } else if (isSafari) {
        message += 'Safari에서 권한 허용 방법:\n';
        message += '1. 주소창 왼쪽의 "AA" 아이콘을 탭하세요\n';
        message += '2. "웹사이트 설정"을 선택하세요\n';
        message += '3. "카메라"를 "허용"으로 변경하세요\n';
        message += '4. 페이지를 새로고침하세요';
      } else {
        message += '모바일에서 권한 허용 방법:\n';
        message += '1. 브라우저 주소창 근처의 설정 아이콘을 찾으세요\n';
        message += '2. 카메라 권한을 "허용"으로 변경하세요\n';
        message += '3. 페이지를 새로고침하세요';
      }
    } else {
      if (isChrome) {
        message += 'Chrome에서 권한 허용 방법:\n';
        message += '1. 주소창 왼쪽의 자물쇠/카메라 아이콘을 클릭하세요\n';
        message += '2. "카메라" 항목을 "허용"으로 변경하세요\n';
        message += '3. 페이지를 새로고침하세요';
      } else if (isFirefox) {
        message += 'Firefox에서 권한 허용 방법:\n';
        message += '1. 주소창 왼쪽의 방패/카메라 아이콘을 클릭하세요\n';
        message += '2. "권한" 탭에서 카메라를 "허용"으로 변경하세요\n';
        message += '3. 페이지를 새로고침하세요';
      } else {
        message += '브라우저에서 권한 허용 방법:\n';
        message += '1. 주소창 근처의 카메라/자물쇠 아이콘을 클릭하세요\n';
        message += '2. 카메라 권한을 "허용"으로 변경하세요\n';
        message += '3. 페이지를 새로고침하세요';
      }
    }

    message += '\n\n⚠️ 중요: HTTPS 연결이 필요합니다\n';
    message += 'http:// 주소에서는 카메라를 사용할 수 없습니다.';

    alert(message);
  };

  // 단계적 카메라 설정 폴백 시스템
  const tryDifferentCameraSettings = async () => {
    const settingsToTry = [
              {
          name: '표준 설정',
          config: {
            fps: 30,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
              let minEdgePercentage = 0.7;
              let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30, min: 15 }
            }
          }
        },
      {
        name: '표준 설정',
        config: {
          fps: 30,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          }
        }
      },
      {
        name: '기본 설정',
        config: {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
          }
        }
      },
      {
        name: '최소 설정',
        config: {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment"
          }
        }
      }
    ];

    for (let i = 0; i < settingsToTry.length; i++) {
      const setting = settingsToTry[i];
      try {
        setScanStatus(`${setting.name}으로 시도 중...`);
        
        // 이전 스캐너 정리
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            scannerRef.current = null;
          } catch (e) {
            console.log('기존 스캐너 정리 중 무시 가능한 오류:', e);
          }
        }

        // DOM 정리
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv) {
          qrReaderDiv.innerHTML = '';
        }

        // 잠깐 대기
        await new Promise(resolve => setTimeout(resolve, 200));

        scannerRef.current = new Html5Qrcode("qr-reader");
        
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
          onScanSuccess(decodedText, decodedResult);
        };

        // 카메라 시작
        await scannerRef.current.start(
          { facingMode: "environment" },
          setting.config,
          qrCodeSuccessCallback,
          () => {} // 에러 무시
        );

        setIsScanning(true);
        setScanStatus(`바코드 스캔 중...`);
        console.log(`카메라 시작 성공: ${setting.name}`);
        return; // 성공하면 반복 중단
        
      } catch (error) {
        console.log(`${setting.name} 실패:`, error);
        if (i === settingsToTry.length - 1) {
          // 모든 설정 실패
          setScanStatus('카메라 시작 실패 - 모든 설정 시도 완료');
          alert('카메라를 시작할 수 없습니다. 브라우저나 기기의 카메라 지원을 확인해주세요.');
        }
      }
    }
  };

  // AI 매대 분석 - 사진 촬영
  const capturePhotoForAI = async () => {
    if (!isScanning) {
      alert('카메라를 먼저 시작해주세요.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setScanStatus('매대 촬영 중...');

      const videoElement = document.querySelector('#qr-reader video');
      if (!videoElement) {
        throw new Error('비디오 요소를 찾을 수 없습니다.');
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      setScanStatus('AI 분석 중...');
      await analyzeShelfWithAI(imageDataUrl);

    } catch (error) {
      console.error('사진 촬영 오류:', error);
      alert('사진 촬영 중 오류가 발생했습니다: ' + error.message);
      setIsAnalyzing(false);
      setScanStatus(isScanning ? '바코드 스캔 중' : '스캔 중단됨');
    }
  };

  // AI 매대 분석 실행
  const analyzeShelfWithAI = async (imageDataUrl) => {
    try {
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();

      if (!productsData.success) {
        throw new Error('제품 리스트를 가져올 수 없습니다.');
      }

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
        setScanStatus('AI 분석 완료');
      } else {
        throw new Error(analysisResult.message || 'AI 분석에 실패했습니다.');
      }

    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('AI 분석 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsAnalyzing(false);
      if (!showAiResults) {
        setScanStatus(isScanning ? '바코드 스캔 중' : '스캔 중단됨');
      }
    }
  };

  // AI 분석 결과 제품 확인 및 재고 등록
  const confirmAIProduct = async (product) => {
    try {
      const saveResponse = await fetch('/api/scan-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: storeId,
          productCode: product.sku,
          productName: product.name,
          sessionId: sessionId || 'ai-session-' + Date.now(),
          source: 'ai_analysis'
        })
      });

      const saveResult = await saveResponse.json();

      if (saveResult.success) {
        alert(`${product.name}이(가) 재고로 등록되었습니다.`);
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

  // QR 스캐너 스타일 오버라이드
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      #qr-reader__scan_region {
        overflow: hidden !important;
        position: relative !important;
      }
      #qr-reader video {
        object-fit: cover !important;
      }
      #qr-reader__dashboard_section_swaplink {
        display: none !important;
      }
      /* 스캔 박스가 확대되지 않도록 */
      #qr-reader__scan_region > div {
        transform: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    // 컴포넌트 마운트 후 제품 프리로딩과 카메라 시작을 병렬로 실행
    const timer = setTimeout(() => {
      startCamera();
      preloadPopularProducts(); // 백그라운드에서 제품 캐싱
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
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
            position: 'absolute',
            left: '16px'
          }}
        >
          ←
        </button>
        
        {/* 설정 버튼 */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            position: 'absolute',
            right: '16px'
          }}
        >
          <i className="fas fa-cog"></i>
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

      {/* 카메라 설정 메뉴 */}
      {showSettings && (
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          padding: '16px',
          position: 'relative',
          zIndex: 1000
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            카메라 설정
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '8px'
          }}>
            {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => changeCameraSetting(key)}
                style={{
                  backgroundColor: currentSetting === key ? '#007bff' : '#f8f9fa',
                  color: currentSetting === key ? 'white' : '#333',
                  border: currentSetting === key ? '2px solid #0056b3' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {preset.name}
                  {currentSetting === key && ' ✓'}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  opacity: currentSetting === key ? 0.9 : 0.7 
                }}>
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
          
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#f0f8ff',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            💡 <strong>팁:</strong> 스캔이 잘 안되면 '기본' 설정을, 빠른 스캔을 원하면 '극한 최적화'를 선택하세요.
          </div>
        </div>
      )}

      {/* HTML5-QRCode 스캐너 */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: 'black', // 카메라 배경을 검은색으로
          height: '440px', // 정사각형 스캔박스에 맞는 고정 높이
          touchAction: 'none', // 모든 터치 제스처 차단하고 JS로 처리
          overflow: 'hidden' // 확대 시 넘침 방지
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HTML5-QRCode가 여기에 렌더링됨 */}
        <div 
          id="qr-reader" 
          ref={scannerDivRef}
          style={{
            width: '100%',
            pointerEvents: 'none' // 하위 요소의 터치 이벤트 차단
          }}
        ></div>

        {/* 줌 레벨 표시 */}
        {currentZoom > 1 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 1000
          }}>
            <i className="fas fa-search-plus"></i>
            {(currentZoom * 100).toFixed(0)}%
            <button
              onClick={() => {
                setCurrentZoom(1);
                applyZoom(1);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0 0 0 8px',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

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

      {/* 제품 검색 섹션 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #f8f9fa',
            paddingBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '6px',
                height: '20px',
                backgroundColor: '#007bff',
                borderRadius: '3px'
              }}></div>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#495057'
              }}>
                제품 검색
              </span>
            </div>
          </div>
          
          {/* 검색 입력 영역 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <input
              type="text"
              placeholder="제품명을 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchProducts(searchTerm);
                }
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            />
            <button
              onClick={() => searchProducts(searchTerm)}
              disabled={isSearching || !searchTerm.trim()}
              style={{
                padding: '12px 20px',
                backgroundColor: isSearching || !searchTerm.trim() ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSearching || !searchTerm.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '80px',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {isSearching ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  검색중
                </>
              ) : (
                <>
                  <i className="fas fa-search"></i>
                  검색
                </>
              )}
            </button>
          </div>
          
          <div style={{
            fontSize: '13px',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            QR 인식이 안되는 제품을 검색으로 등록하세요
          </div>
        </div>

        {/* 검색 결과 */}
        {showSearchResults && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            marginTop: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e9ecef',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {searchResults.length > 0 ? (
              <>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #f8f9fa'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057'
                  }}>
                    검색 결과 ({searchResults.length}개)
                  </span>
                  <button
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                    style={{
                      float: 'right',
                      background: 'none',
                      border: 'none',
                      color: '#6c757d',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0'
                    }}
                  >
                    ×
                  </button>
                </div>
                {searchResults.map((product, index) => (
                  <div
                    key={product.sku || index}
                    onClick={() => selectProduct(product)}
                    style={{
                      padding: '16px',
                      borderBottom: index < searchResults.length - 1 ? '1px solid #f8f9fa' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '4px'
                      }}>
                        {product.name}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#666',
                        marginBottom: '2px'
                      }}>
                        {product.category} • {product.sku}
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#dc3545'
                      }}>
                        {product.price ? `${product.price.toLocaleString()}원` : '가격 정보 없음'}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: scannedProducts.has(product.sku) ? '#ffc107' : '#28a745',
                      color: 'white',
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontWeight: '600'
                    }}>
                      {scannedProducts.has(product.sku) ? '이미 등록됨' : '등록하기'}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '48px',
                  color: '#dee2e6',
                  marginBottom: '16px'
                }}>
                  🔍
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#6c757d',
                  marginBottom: '8px'
                }}>
                  검색 결과가 없습니다
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#adb5bd'
                }}>
                  다른 검색어로 시도해보세요
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS 애니메이션 추가 */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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
            gap: '8px',
            marginBottom: scanStatus.includes('권한') || scanStatus.includes('접근 실패') || scanStatus.includes('초기화 실패') ? '12px' : '0'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isScanning ? '#28a745' : 
                            (scanStatus.includes('권한') || scanStatus.includes('접근 실패') || scanStatus.includes('초기화 실패')) ? '#dc3545' : '#6c757d'
            }}></div>
            <span style={{
              fontSize: '15px',
              fontWeight: '600',
              color: isScanning ? '#28a745' : 
                    (scanStatus.includes('권한') || scanStatus.includes('접근 실패') || scanStatus.includes('초기화 실패')) ? '#dc3545' : '#6c757d'
            }}>
              {scanStatus || (isScanning ? '스캔 중...' : '스캔 준비')}
              {isScanning && (
                <div style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  marginTop: '2px'
                }}>
                  {CAMERA_PRESETS[currentSetting]?.name}
                </div>
              )}
            </span>
          </div>
          
          {/* 카메라 권한 문제 시 재시도 버튼 표시 */}
          {(scanStatus.includes('권한') || scanStatus.includes('접근 실패') || scanStatus.includes('초기화 실패')) && (
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
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 새로고침
              </button>
              <button
                onClick={tryDifferentCameraSettings}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔧 다른 설정으로 재시도
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
          {/* 첫 번째 줄: 스캔 시작/중단, AI 분석 */}
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
            {isScanning ? '스캔 중단' : '스캔 시작'}
          </button>
          
            <button
              onClick={capturePhotoForAI}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                cursor: (!isScanning || isAnalyzing) ? 'not-allowed' : 'pointer',
                opacity: (!isScanning || isAnalyzing) ? 0.6 : 1
              }}
            >
              <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-camera'}`} style={{
                fontSize: '14px'
              }}></i>
              {isAnalyzing ? 'AI 분석 중...' : '매대 촬영'}
            </button>
          </div>

          {/* 두 번째 줄: 돌아가기 버튼 */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
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
                AI 매대 분석 결과
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

            {/* AI 분석 결과 목록 */}
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

    </div>
  );
};

export default QRScanPage; 