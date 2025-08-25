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
  const [scannedProducts, setScannedProducts] = useState(new Set()); // 이미 스캔한 제품들
  
  // 전체 제품 리스트 관련 state
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  
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
  const [currentSetting, setCurrentSetting] = useState('highPerformance'); // 기본값: 고성능으로 변경
  const [showSettings, setShowSettings] = useState(false);
  
  // AI 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [showAiResults, setShowAiResults] = useState(false);
  
  // 앨범 사진 선택 관련
  const fileInputRef = useRef(null);
  

  
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
        frameRate: { ideal: 15, min: 10 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous"
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
        frameRate: { ideal: 30, min: 15 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous"
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
        frameRate: { ideal: 60, min: 30 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous"
      }
    },
    ultra: {
      name: '울트라 4K',
      description: '최고 화질 (4K/30fps)',
      fps: 30,
      qrboxPercentage: 0.8,
      videoConstraints: {
        facingMode: "environment",
        width: { exact: 3840 },  // 정확한 4K 해상도 요구
        height: { exact: 2160 },
        frameRate: { ideal: 30, min: 20 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous",
        // 추가 고품질 설정
        resizeMode: "none",  // 리사이징 방지
        aspectRatio: { exact: 16/9 }  // 정확한 비율
      }
    },
    maxPerformance: {
      name: '최대 성능',
      description: '디바이스 최대 해상도',
      fps: 60,
      qrboxPercentage: 0.85,
      videoConstraints: {
        facingMode: "environment",
        width: { ideal: 7680, min: 1920 },  // 8K까지 시도
        height: { ideal: 4320, min: 1080 },
        frameRate: { ideal: 60, min: 30 },
        focusMode: "continuous",
        whiteBalanceMode: "continuous",
        exposureMode: "continuous",
        resizeMode: "none",
        aspectRatio: { ideal: 16/9 }
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
      },
      // 카메라 성능 최적화 옵션
      videoConstraints: {
        ...preset.videoConstraints,
        advanced: [
          { focusMode: 'continuous' },
          { exposureMode: 'continuous' },
          { whiteBalanceMode: 'continuous' },
          { torch: false }
        ]
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

  // 전체 제품 리스트 불러오기
  const loadAllProducts = async () => {
    if (isLoadingProducts || allProducts.length > 0) return;
    
    setIsLoadingProducts(true);
    try {
      const response = await fetch('/api/products?limit=1000'); // 모든 제품 가져오기
      const result = await response.json();
      
      if (result.success && result.products) {
        setAllProducts(result.products);
        console.log(`${result.products.length}개 제품을 불러왔습니다.`);
      } else {
        throw new Error('제품 리스트를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('제품 리스트 로딩 오류:', error);
      alert('제품 리스트를 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // 제품 체크박스 토글
  const toggleProductSelection = (productSku) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productSku)) {
      newSelected.delete(productSku);
    } else {
      newSelected.add(productSku);
    }
    setSelectedProducts(newSelected);
  };

  // 선택된 제품들 일괄 등록
  const registerSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('등록할 제품을 선택해주세요.');
      return;
    }

    const selectedProductList = allProducts.filter(product => selectedProducts.has(product.sku));
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const product of selectedProductList) {
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
            sessionId: sessionId || 'manual-session-' + Date.now(),
            source: 'manual_selection'
          })
        });

        const saveResult = await saveResponse.json();

        if (saveResult.success) {
          if (saveResult.isDuplicate) {
            duplicateCount++;
          } else {
            successCount++;
            // 스캔한 제품 목록에 추가
            setScannedProducts(prev => new Set([...prev, product.sku]));
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`제품 등록 오류 (${product.name}):`, error);
        errorCount++;
      }
    }

    // 결과 메시지 표시
    let message = '';
    if (successCount > 0) message += `${successCount}개 제품이 등록되었습니다.\n`;
    if (duplicateCount > 0) message += `${duplicateCount}개 제품은 이미 등록되어 있습니다.\n`;
    if (errorCount > 0) message += `${errorCount}개 제품 등록에 실패했습니다.\n`;

    alert(message.trim());

    // 선택 초기화
    setSelectedProducts(new Set());
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
        setScanStatus('캐시에서 찾음');
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
        // DOM 요소 존재 확인
        const qrReaderElement = document.getElementById("qr-reader");
        if (!qrReaderElement) {
          throw new Error('QR Reader DOM 요소를 찾을 수 없습니다.');
        }
        
        // 기존 스캐너가 있다면 정리
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (e) {
            console.log('기존 스캐너 정리 중 무시 가능한 오류:', e);
          }
          scannerRef.current = null;
        }
        
        // 새 스캐너 인스턴스 생성
        scannerRef.current = new Html5Qrcode("qr-reader");
        
        // 스캐너 생성 확인
        if (!scannerRef.current) {
          throw new Error('Html5Qrcode 인스턴스 생성에 실패했습니다.');
        }
        
        console.log('Html5Qrcode 인스턴스 생성 성공');
        
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
        
        // 카메라 시작 전 최종 확인
        if (scannerRef.current && typeof scannerRef.current.start === 'function') {
          console.log('카메라 시작 시도:', { cameraId, cameraConfig });
          await scannerRef.current.start(
            cameraId,
            cameraConfig,
            qrCodeSuccessCallback,
            onScanError
          );
          console.log('카메라 시작 성공');
        } else {
          throw new Error('스캐너 인스턴스가 유효하지 않습니다.');
        }

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
        
        // 더 구체적인 오류 메시지 제공
        let userMessage = '카메라 접근 중 오류가 발생했습니다.';
        
        if (error && error.message) {
          if (error.message.includes('null') || error.message.includes('reading \'start\'')) {
            userMessage = '카메라 초기화에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.';
          } else if (error.message.includes('device')) {
            userMessage = '카메라 장치에 문제가 있습니다. 다른 브라우저나 기기에서 시도해보세요.';
          } else if (error.message.includes('permission') || error.message.includes('권한')) {
            userMessage = '카메라 권한을 허용해주세요.';
          } else {
            userMessage = `카메라 오류: ${error.message}`;
          }
        }
        
        console.error('카메라 상세 오류:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        });
        
        alert(userMessage + '\n\n해결 방법:\n1. 페이지 새로고침\n2. 브라우저 재시작\n3. 다른 브라우저 시도');
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

  const resetScannedProducts = () => {
    setScannedProducts(new Set()); // 스캔한 제품 목록 초기화
    setSelectedProducts(new Set()); // 선택한 제품 목록도 초기화
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

        // 새 스캐너 인스턴스 생성 및 검증
        scannerRef.current = new Html5Qrcode("qr-reader");
        
        if (!scannerRef.current) {
          throw new Error('Html5Qrcode 인스턴스 생성에 실패했습니다.');
        }
        
        console.log('Html5Qrcode 인스턴스 생성 성공 (재시작)');
        
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
          onScanSuccess(decodedText, decodedResult);
        };

        // 카메라 시작 전 최종 확인
        if (scannerRef.current && typeof scannerRef.current.start === 'function') {
          console.log('카메라 재시작 시도');
          await scannerRef.current.start(
            { facingMode: "environment" },
            setting.config,
            qrCodeSuccessCallback,
            () => {} // 에러 무시
          );
          console.log('카메라 재시작 성공');
        } else {
          throw new Error('스캐너 인스턴스가 유효하지 않습니다 (재시작).');
        }

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

  // AI 매대 분석 - 사진 촬영 (최고 화질)
  const capturePhotoForAI = async () => {
    if (!isScanning) {
      alert('카메라를 먼저 시작해주세요.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setScanStatus('고화질 매대 촬영 중...');
      
      // 잠시 대기하여 카메라 포커스 조정
      await new Promise(resolve => setTimeout(resolve, 500));

      const videoElement = document.querySelector('#qr-reader video');
      if (!videoElement) {
        throw new Error('비디오 요소를 찾을 수 없습니다.');
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 고해상도 캡처를 위해 최대 해상도 사용
      const maxWidth = Math.max(videoElement.videoWidth, 1920);  // 최소 Full HD
      const maxHeight = Math.max(videoElement.videoHeight, 1080);
      
      canvas.width = maxWidth;
      canvas.height = maxHeight;

      // 고품질 렌더링 설정
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      // 비디오를 캔버스 전체에 맞춰 그리기
      context.drawImage(videoElement, 0, 0, maxWidth, maxHeight);

      // 최고 품질로 JPEG 생성 (0.95 = 95% 품질)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
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

  // 앨범에서 사진 선택
  const selectPhotoFromAlbum = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 파일 선택 처리
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (25MB - 원본 이미지 지원을 위해 증가)
    const maxFileSize = 25 * 1024 * 1024;
    if (file.size > maxFileSize) {
      alert('파일 크기는 25MB 이하로 선택해주세요.\n\n현재 파일: ' + Math.round(file.size / 1024 / 1024) + 'MB');
      return;
    }

    try {
      setIsAnalyzing(true);
      setScanStatus('원본 이미지 로딩 중...');

      console.log('원본 이미지 로딩:', {
        파일명: file.name,
        타입: file.type,
        크기: `${Math.round(file.size / 1024)}KB`,
        처리방식: '원본 그대로 (무손실)'
      });

      // 원본 이미지 그대로 로드
      const originalImageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('원본 이미지 로딩 완료:', {
            원본크기: `${Math.round(file.size / 1024)}KB`,
            base64크기: `${Math.round(e.target.result.length / 1024)}KB`,
            포맷: file.type,
            해상도: '원본 유지'
          });
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setCapturedImage(originalImageDataUrl);

      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      setScanStatus('AI 분석 중... (원본 화질)');
      await analyzeShelfWithAI(originalImageDataUrl);

    } catch (error) {
      console.error('원본 이미지 처리 오류:', error);
      
      // 원본 이미지로 실패했을 때만 처리된 이미지로 재시도
      if (error.message.includes('pattern') || error.message.includes('base64') || error.message.includes('형식') || error.message.includes('JSON')) {
        console.log('원본 이미지 실패, 호환성 처리 모드로 재시도...');
        setScanStatus('호환성 모드로 재처리 중...');
        
        try {
          // 호환성을 위한 이미지 처리 (Canvas 사용)
          const processedImageDataUrl = await processImageFile(file);
          setCapturedImage(processedImageDataUrl);
          setScanStatus('AI 분석 중... (호환성 모드)');
          await analyzeShelfWithAI(processedImageDataUrl);
          return; // 성공하면 여기서 종료
        } catch (secondError) {
          console.error('호환성 모드도 실패:', secondError);
          alert('이미지 처리에 실패했습니다. 다른 이미지를 시도해보세요.\n\n세부 오류:\n- 원본: ' + error.message + '\n- 호환성: ' + secondError.message);
        }
      } else {
        alert('앨범 사진 처리 중 오류가 발생했습니다: ' + error.message);
      }
      
      setIsAnalyzing(false);
      setScanStatus(isScanning ? '바코드 스캔 중' : '스캔 중단됨');
    }

    // input 값 초기화 (같은 파일 다시 선택 가능하도록)
    event.target.value = '';
  };

  // 이미지 파일을 표준 포맷으로 처리하는 함수 (해상도 보존 버전)
  const processImageFile = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        try {
          let { width, height } = img;
          
          // 스마트한 해상도 처리
          const maxPixels = 8000000; // 8MP 정도까지 허용 (성능과 품질의 균형)
          const currentPixels = width * height;
          
          console.log('원본 이미지 분석:', {
            해상도: `${width}x${height}`,
            총픽셀: currentPixels.toLocaleString(),
            파일크기: `${Math.round(file.size / 1024)}KB`,
            메가픽셀: `${(currentPixels / 1000000).toFixed(1)}MP`
          });

          // 너무 큰 이미지만 리사이즈 (8MP 초과 시)
          if (currentPixels > maxPixels) {
            const ratio = Math.sqrt(maxPixels / currentPixels);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            
            console.log('해상도 최적화:', {
              기존: `${img.width}x${img.height}`,
              최적화후: `${width}x${height}`,
              축소비율: `${(ratio * 100).toFixed(1)}%`,
              이유: '성능 최적화 (8MP 초과)'
            });
          } else {
            console.log('원본 해상도 유지:', `${width}x${height} (8MP 이하)`);
          }

          // 최소 해상도 보장 (너무 작으면 AI 분석이 어려움)
          const minWidth = 800;
          const minHeight = 600;
          
          if (width < minWidth || height < minHeight) {
            const upscaleRatio = Math.max(minWidth / width, minHeight / height);
            width = Math.floor(width * upscaleRatio);
            height = Math.floor(height * upscaleRatio);
            
            console.log('최소 해상도 보장:', {
              기존: `${img.width}x${img.height}`,
              업스케일후: `${width}x${height}`,
              이유: 'AI 분석 품질 향상'
            });
          }

          canvas.width = width;
          canvas.height = height;

          // 최고 품질 렌더링 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 흰색 배경으로 초기화 (투명도 제거, HEIC 호환성)
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);

          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);

          // 품질에 따른 JPEG 변환
          let quality = 0.95; // 기본 최고 품질
          
          // 파일 크기에 따른 품질 조정
          const expectedSize = width * height * 3; // RGB 기준 예상 크기
          if (expectedSize > 10000000) { // 10MB 초과 시
            quality = 0.85;
            console.log('품질 최적화:', '대용량 이미지로 인해 품질 85%로 조정');
          }

          const standardizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          console.log('✅ 이미지 처리 완료:', {
            원본: `${img.width}x${img.height} (${(img.width * img.height / 1000000).toFixed(1)}MP)`,
            처리후: `${width}x${height} (${(width * height / 1000000).toFixed(1)}MP)`,
            파일크기: `${Math.round(file.size / 1024)}KB → ${Math.round(standardizedDataUrl.length / 1024)}KB`,
            품질: `${(quality * 100)}%`,
            포맷: 'JPEG',
            해상도보존: currentPixels <= maxPixels ? '유지' : '최적화'
          });

          resolve(standardizedDataUrl);
        } catch (error) {
          console.error('Canvas 처리 오류:', error);
          reject(new Error('이미지 처리 중 오류가 발생했습니다.'));
        }
      };

      img.onerror = () => {
        reject(new Error('이미지를 불러올 수 없습니다.'));
      };

      // 파일을 이미지로 로드
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('파일을 읽을 수 없습니다.'));
      };
      reader.readAsDataURL(file);
    });
  };

  // AI 매대 분석 실행
  const analyzeShelfWithAI = async (imageDataUrl) => {
    try {
      const productsResponse = await fetch('/api/products?limit=1000'); // 모든 제품 가져오기
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
        // 새 API 형태와 기존 형태 모두 지원
        const detectedProducts = analysisResult.data || analysisResult.detectedProducts || [];
        
        console.log('AI 분석 결과:', {
          totalDetected: detectedProducts.length,
          products: detectedProducts,
          meta: analysisResult.meta
        });
        
        setAiResults(detectedProducts);
        setShowAiResults(true);
        
        // 감지된 제품 수에 따른 상태 메시지
        if (detectedProducts.length > 0) {
          setScanStatus(`AI 분석 완료 - ${detectedProducts.length}개 제품 감지됨`);
        } else {
          setScanStatus('AI 분석 완료 - 감지된 제품 없음');
        }
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

  // 기존 스캔 기록 불러오기
  const loadExistingScanRecords = async () => {
    try {
      const response = await fetch(`/api/scan-records?storeId=${storeId}&limit=1000`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // 스캔된 제품 코드들을 Set에 저장 (문자열로 정규화)
        const existingScannedProducts = new Set(
          data.data.map(record => String(record.productCode))
        );
        setScannedProducts(existingScannedProducts);
        
        console.log(`기존 스캔 기록 ${data.data.length}개를 불러왔습니다.`, {
          sampleSKUs: Array.from(existingScannedProducts).slice(0, 5),
          totalCount: existingScannedProducts.size
        });
      }
    } catch (error) {
      console.error('기존 스캔 기록 로딩 오류:', error);
      // 오류가 발생해도 계속 진행
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
        
        // AI 분석 결과에서 등록 상태 업데이트
        setAiResults(prev => prev.map(p =>
          p.sku === product.sku ? { ...p, registered: true } : p
        ));
        
        // 스캔된 제품 리스트에 추가 (중요!)
        setScannedProducts(prev => {
          const newSet = new Set(prev);
          const skuString = String(product.sku); // 문자열로 정규화
          newSet.add(skuString);
          console.log('AI 제품 등록 - 스캔된 제품 리스트 업데이트:', {
            sku: skuString,
            type: typeof skuString,
            newSize: newSet.size
          });
          return newSet;
        });
        
        // 선택된 제품에서도 제거 (이미 스캔된 제품이므로)
        setSelectedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(product.sku));
          return newSet;
        });
        
        // 스캔 결과에도 추가하여 하단 리스트에 표시
        setScanResult({
          productCode: product.sku,
          productName: product.name,
          timestamp: new Date(),
          source: 'AI 분석'
        });
        
        // 리렌더링 강제를 위한 콘솔 로그
        console.log(`AI 제품 등록 완료: ${product.sku} - ${product.name}`);
        
      } else {
        if (saveResult.isDuplicate) {
          alert('이미 등록된 제품입니다.');
          // 중복이어도 리스트에는 추가 (이미 스캔된 상태로 표시)
          setScannedProducts(prev => {
            const newSet = new Set(prev);
            const skuString = String(product.sku); // 문자열로 정규화
            newSet.add(skuString);
            console.log('중복 제품 - 스캔된 제품 리스트 업데이트:', {
              sku: skuString,
              type: typeof skuString,
              newSize: newSet.size
            });
            return newSet;
          });
          
          // 선택된 제품에서도 제거
          setSelectedProducts(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(product.sku));
            return newSet;
          });
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
      loadExistingScanRecords(); // 기존 스캔 기록 불러오기
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
            <strong>팁:</strong> 스캔이 잘 안되면 '기본' 설정을, 빠른 스캔을 원하면 '극한 최적화'를 선택하세요.
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

      {/* AI 매대 촬영 및 앨범 선택 버튼 - 카메라 바로 아래 */}
      <div style={{
        padding: '16px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}>
        {/* 숨겨진 파일 입력 요소 */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {/* 버튼들 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '8px'
        }}>
          {/* 카메라 촬영 버튼 */}
          <button
            onClick={capturePhotoForAI}
            disabled={!isScanning || isAnalyzing}
            style={{
              flex: 1,
              padding: '16px',
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
              boxShadow: '0 3px 12px rgba(0, 123, 255, 0.25)',
              cursor: (!isScanning || isAnalyzing) ? 'not-allowed' : 'pointer',
              opacity: (!isScanning || isAnalyzing) ? 0.6 : 1
            }}
          >
            <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-camera'}`} style={{
              fontSize: '16px'
            }}></i>
            {isAnalyzing ? '분석 중...' : '촬영'}
          </button>
          
          {/* 앨범 선택 버튼 */}
          <button
            onClick={selectPhotoFromAlbum}
            disabled={isAnalyzing}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: isAnalyzing ? '#6c757d' : '#28a745',
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
              boxShadow: '0 3px 12px rgba(40, 167, 69, 0.25)',
              cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              opacity: isAnalyzing ? 0.6 : 1
            }}
          >
            <i className="fas fa-images" style={{
              fontSize: '16px'
            }}></i>
            앨범
          </button>
        </div>
        
        {/* 안내 텍스트 */}
        <div style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          {(!isScanning && !isAnalyzing) ? (
            '카메라를 시작하거나 앨범에서 사진을 선택하세요'
          ) : (
            <>
              매대 사진을 촬영하거나 앨범에서 선택해 AI 분석을 받으세요
              <br />
              <span style={{ fontSize: '12px', color: '#999' }}>
                앨범 이미지는 원본 해상도로 분석합니다
              </span>
            </>
          )}
        </div>
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
                  검색
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
        {/* 전체 품목 체크리스트 */}
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
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
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
                backgroundColor: '#28a745',
                borderRadius: '3px'
              }}></div>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#495057'
              }}>
                전체 품목 체크리스트
              </span>
              {selectedProducts.size > 0 && (
                <span style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  {selectedProducts.size}/{allProducts.length}개 선택
                </span>
              )}
            </div>
            
            <button
              onClick={() => {
                if (!showProductList) {
                  loadAllProducts();
                }
                setShowProductList(!showProductList);
              }}
              style={{
                backgroundColor: showProductList ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i className={`fas ${showProductList ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              {showProductList ? '접기' : '펼치기'}
            </button>
          </div>
          
          {!showProductList && (
            <div style={{
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px',
              padding: '20px 0'
            }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '8px'
              }}>
                {scannedProducts.size + selectedProducts.size}개
              </div>
              <div style={{ marginBottom: '4px', fontWeight: '500' }}>
                전체 {allProducts.length || 150}개 중 완료
              </div>
              <div style={{ fontSize: '12px' }}>
                펼치기 버튼을 눌러 전체 품목을 확인하세요
              </div>
            </div>
          )}

          {showProductList && (
            <div>
              {isLoadingProducts ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}></div>
                  제품 목록을 불러오는 중...
                </div>
              ) : allProducts.length > 0 ? (
                <>
                  {/* 일괄 등록 버튼 */}
                  {selectedProducts.size > 0 && (
                    <div style={{
                      marginBottom: '16px',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#495057'
                      }}>
                        {selectedProducts.size}개 제품 선택됨
                      </span>
                      <button
                        onClick={registerSelectedProducts}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fas fa-check"></i>
                        선택 제품 등록
                      </button>
                    </div>
                  )}

                  {/* 제품 리스트 */}
                  <div style={{
                    maxHeight: '400px',
                    overflow: 'auto',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px'
                  }}>
                    {allProducts.map((product, index) => {
                      const skuString = String(product.sku); // 문자열로 정규화
                      const isScanned = scannedProducts.has(skuString);
                      const isSelected = selectedProducts.has(skuString);
                      const isCompleted = isScanned || isSelected;
                      
                      // 디버깅: 첫 번째 제품의 상태 로그 (너무 많은 로그 방지)
                      if (index === 0) {
                        console.log('전체 품목 체크리스트 렌더링 - 첫 번째 제품:', {
                          originalSku: product.sku,
                          skuString,
                          isScanned,
                          scannedProductsSize: scannedProducts.size,
                          hasThisSku: scannedProducts.has(skuString),
                          skuType: typeof product.sku,
                          normalizedSkuType: typeof skuString
                        });
                      }
                      
                      return (
                        <div
                          key={product.sku || index}
                          style={{
                            padding: '12px 16px',
                            borderBottom: index < allProducts.length - 1 ? '1px solid #f8f9fa' : 'none',
                            backgroundColor: isCompleted ? '#f8f9fa' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: isScanned ? 'default' : 'pointer',
                            opacity: isScanned ? 0.6 : 1
                          }}
                          onClick={() => !isScanned && toggleProductSelection(skuString)}
                        >
                          {/* 체크박스 */}
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: isCompleted ? 'none' : '2px solid #dee2e6',
                            backgroundColor: isScanned ? '#28a745' : isSelected ? '#007bff' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isCompleted && (
                              <i className="fas fa-check" style={{
                                color: 'white',
                                fontSize: '12px'
                              }}></i>
                            )}
                          </div>

                          {/* 제품 번호 */}
                          <div style={{
                            width: '50px',
                            fontSize: '12px',
                            color: '#6c757d',
                            fontWeight: '500',
                            textAlign: 'center',
                            flexShrink: 0
                          }}>
                            {product.sku}
                          </div>

                          {/* 제품 정보 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: isCompleted ? '#6c757d' : '#333',
                              marginBottom: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {product.name}
                            </div>
                          </div>

                          {/* 상태 표시 */}
                          <div style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: '500',
                            backgroundColor: isScanned ? '#28a745' : isSelected ? '#007bff' : '#e9ecef',
                            color: isCompleted ? 'white' : '#6c757d',
                            flexShrink: 0
                          }}>
                            {isScanned ? '✓' : isSelected ? '✓' : '○'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  제품 목록을 불러올 수 없습니다.
                </div>
              )}
            </div>
          )}
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
                새로고침
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
      {showAiResults && aiResults !== null && (
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
                  padding: '40px 20px'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>
                    검색
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '12px'
                  }}>
                    매대에서 3M 제품을 찾지 못했습니다
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    • 조명이 충분한지 확인하세요<br/>
                    • 제품이 명확하게 보이도록 촬영하세요<br/>
                    • 다른 각도에서 다시 시도해보세요
                  </div>
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