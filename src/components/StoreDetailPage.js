import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const StoreDetailPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProductList, setShowProductList] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // lastVisit 날짜를 상대적 시간으로 변환하는 함수
  const getRelativeTime = (lastVisit) => {
    if (!lastVisit) return '방문 기록 없음';
    
    const visitDate = new Date(lastVisit);
    const now = new Date();
    const diffInMs = now - visitDate;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    if (diffInHours < 24) {
      return '24시간';
    } else if (diffInDays < 2) {
      return '1일 전';
    } else if (diffInDays < 4) {
      return '3일 전';
    } else if (diffInDays < 8) {
      return '1주일 전';
    } else if (diffInDays < 15) {
      return '2주일 전';
    } else {
      return '3주일 전';
    }
  };

  // 미진열 제품 목록 생성 (클라이언트에서 스캔된 제품 제외) - useMemo로 최적화
  const notDisplayedItems = useMemo(() => {
    if (!inventory || !inventory.notDisplayedProducts) return [];

    // 스캔된 제품 코드 Set 생성 (빠른 검색용)
    const scannedProductCodes = new Set(inventory.scannedProductCodes || []);

    // 스캔되지 않은 제품만 필터링
    return inventory.notDisplayedProducts
      .filter(item => !scannedProductCodes.has(item.productCode))
      .map(item => ({
        id: item.productCode,
        name: item.productName,
        code: item.productCode,
        category: item.category || '기타',
        priority: item.priority,
        salesAvg: item.salesAvg || 0,
        type: 'not_displayed'
      }))
      .sort((a, b) => b.salesAvg - a.salesAvg); // 판매량 높은 순으로 정렬
  }, [inventory]);

  // API에서 매장 상세 정보와 재고 현황 가져오기
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        
        // 매장 정보 가져오기
        const storeResponse = await fetch(`/api/stores`);
        if (!storeResponse.ok) {
          throw new Error('매장 정보를 가져올 수 없습니다.');
        }
        const stores = await storeResponse.json();
        const currentStore = stores.find(s => s.id === storeId) || stores[0];
        setStore(currentStore);

        // 재고 현황 가져오기
        const inventoryResponse = await fetch(`/api/inventory?storeId=${storeId}`);
        if (!inventoryResponse.ok) {
          throw new Error('재고 현황을 가져올 수 없습니다.');
        }
        const inventoryData = await inventoryResponse.json();
        setInventory(inventoryData);

        // 전체 제품 리스트 가져오기
        const productsResponse = await fetch('/api/products?limit=1000');
        if (productsResponse.ok) {
          const productsResult = await productsResponse.json();
          if (productsResult.success && productsResult.products) {
            setAllProducts(productsResult.products);
          }
        }
      
      // 최근 스캔된 제품 데이터 설정
      if (inventoryData.recentScans && inventoryData.recentScans.length > 0) {
        setRecentProducts(inventoryData.recentScans.map(product => ({
          id: product.productCode,
          name: product.productName,
          lastScan: getRelativeTime(product.timestamp)
        })));
      } else {
        setRecentProducts([]);
      }
      } catch (err) {
        console.error('매장 데이터 조회 오류:', err);
        setError(err.message);
        
      // 오류 시 기본값 설정 (더 이상 하드코딩 데이터 사용 안함)
        setStore({
          id: storeId,
        name: '매장 정보 없음',
        address: '주소 정보 없음'
        });
        
        setInventory({
        totalItems: 0,
        scannedItems: 0,
        progress: 0,
        recentScans: [],
        notDisplayedProducts: [],
        scannedProductCodes: []
        });
      
      setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchStoreData();
  }, [storeId]);

  // 페이지가 포커스될 때마다 데이터 새로고침 (스캔 후 돌아왔을 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 페이지가 보이게 될 때 데이터 새로고침
        setTimeout(() => {
          fetchStoreData();
        }, 500); // 500ms 지연 후 새로고침
      }
    };

    const handleFocus = () => {
      // 페이지에 포커스가 오면 데이터 새로고침
      setTimeout(() => {
        fetchStoreData();
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);



  if (loading) {
    return (
      <div className="mobile-container">
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
          <h1 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: 'white'
          }}>
            매장 상세
          </h1>
        </div>

        <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 110px)', paddingBottom: '80px' }}>
          {/* 로딩 상태 */}
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#666'
        }}>
          매장 정보를 불러오는 중...
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
          <Link to="/store-select" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
            <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
            <span style={{ fontSize: '12px' }}>스캔</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '414px',
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
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
          onClick={() => navigate('/store-list')}
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
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white' 
        }}>
          매장 상세
        </h1>
      </div>

      {/* 매장 정보 헤더 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px 16px',
        position: 'relative'
      }}>


        {/* 매장 정보 */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <h2 style={{
              margin: '0 8px 0 0',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {store?.name}
            </h2>
            <span style={{
              backgroundColor: '#28a745',
              color: 'white',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              영업중
            </span>
          </div>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: '#666'
          }}>
            {store?.address}
          </p>
          <div style={{
            fontSize: '12px',
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <i className="fas fa-clock" style={{ fontSize: '10px' }}></i>
            마지막 방문: {store?.lastVisit ? getRelativeTime(store.lastVisit) : '방문 기록 없음'}
          </div>
        </div>
      </div>

      {/* 스캔 진행률 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px',
        margin: '8px 0',
        borderRadius: '0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '16px',
            color: '#333',
            fontWeight: '600'
          }}>
            스캔 진행률
          </span>
          <span style={{
            fontSize: '14px',
            color: '#666'
          }}>
            마지막 방문: {store?.lastVisit ? getRelativeTime(store.lastVisit) : '방문 기록 없음'}
          </span>
        </div>
        
        {/* 통계 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '4px'
            }}>
              스캔 완료: {inventory?.scannedItems || 0}개
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '4px'
            }}>
              총 재고: {inventory?.totalItems || 0}개
            </div>
          </div>
        </div>
        
        {/* 프로그레스 바 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            flex: 1,
            height: '8px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${inventory?.progress || 0}%`,
              height: '100%',
              backgroundColor: '#dc3545',
              borderRadius: '4px'
            }}></div>
          </div>
          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#dc3545',
            minWidth: '40px'
          }}>
            {inventory?.progress || 0}%
          </span>
        </div>

        {/* 보고서 생성 버튼 */}
        <Link
          to={`/inventory-report?storeId=${storeId}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            marginTop: '16px',
            gap: '8px'
          }}
        >
          <i className="fas fa-file-alt" style={{ fontSize: '16px' }}></i>
          보고서 생성
        </Link>
      </div>

      {/* 전체 품목 체크리스트 */}
      <div style={{ 
        backgroundColor: 'white',
        paddingBottom: '100px'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            전체 품목 체크리스트
          </h3>
          <span style={{
            fontSize: '14px',
            color: '#666'
          }}>
            {inventory?.scannedItems || 0}/{inventory?.totalItems || 0}개 완료
          </span>
        </div>

        {/* 전체 제품 목록 (처음 5개만 표시) */}
        <div style={{ padding: '0' }}>
          {allProducts.length > 0 ? (
            allProducts.slice(0, 5).map((product, index) => {
              const isScanned = inventory?.scannedProductCodes?.includes(product.sku) || false;
              
              return (
                <div 
                  key={product.sku || index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: isScanned ? 0.7 : 1
                  }}
                >
                  {/* 체크박스 */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isScanned ? 'none' : '2px solid #dee2e6',
                    backgroundColor: isScanned ? '#28a745' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isScanned && (
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
                      color: isScanned ? '#6c757d' : '#333',
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
                    backgroundColor: isScanned ? '#28a745' : '#e9ecef',
                    color: isScanned ? 'white' : '#6c757d',
                    flexShrink: 0
                  }}>
                    {isScanned ? '✓' : '○'}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '12px'
              }}>
                📋
              </div>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                제품 목록을 불러오는 중...
              </p>
            </div>
          )}
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
        <Link to="/store-list" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-store" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>매장</span>
        </Link>
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreDetailPage; 