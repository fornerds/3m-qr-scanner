import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const StoreDetailPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // API에서 매장 상세 정보와 재고 현황 가져오기
  useEffect(() => {
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
        
        // 최근 스캔된 제품 데이터 설정
        if (inventoryData.recentScans) {
          setRecentProducts(inventoryData.recentScans.map(product => ({
            id: product.productCode,
            name: product.productName,
            lastScan: getRelativeTime(product.timestamp)
          })));
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
          recentScans: []
        });
        
        setRecentProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeId]);



  if (loading) {
    return (
      <div className="mobile-container">
        {/* 헤더 */}
        <div style={{ 
          backgroundColor: '#dc3545', 
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
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
            color: 'white',
            flex: 1,
            textAlign: 'center'
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
          <Link to="/scan?storeId=1" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
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
        display: 'flex',
        alignItems: 'center'
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
          매장 상세
        </h1>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ backgroundColor: 'white', padding: '20px 16px' }}>
        {/* 매장 정보 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#fce4e6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px',
            flexShrink: 0
          }}>
            <i className="fas fa-store" style={{
              fontSize: '24px',
              color: '#dc3545'
            }}></i>
          </div>
          
          <div style={{ flex: 1 }}>
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
              margin: '0 0 8px 0',
              fontSize: '14px',
              color: '#666'
            }}>
              {store?.address}
            </p>

          </div>
        </div>

        {/* 스캔 진행률 */}
        <div style={{
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '14px',
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
          
          {/* 프로그레스 바 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
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
            }}            >
              {inventory?.progress || 0}%
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>스캔 완료: {inventory?.scannedItems || 0}개</span>
            <span>전체 리스트: {inventory?.totalItems || 0}개</span>
          </div>
        </div>

        {/* 재고현황 보기 버튼 */}
        <Link
          to={`/inventory-status?storeId=${storeId}`}
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
            fontWeight: '600'
          }}
        >
          <i className="fas fa-clipboard-list" style={{ marginRight: '8px', fontSize: '16px' }}></i>
          재고현황 보기
        </Link>
      </div>

      {/* 최근 스캔된 3M 제품 */}
      <div style={{ 
        backgroundColor: 'white',
        margin: '8px 0 0 0',
        padding: '20px 16px',
        paddingBottom: '100px',
        minHeight: 'calc(100vh - 300px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            최근 스캔된 3M 제품
          </h3>
          <span style={{
            fontSize: '14px',
            color: '#666'
          }}>
            {recentProducts.length}개
          </span>
        </div>

        {/* 제품 목록 */}
        {recentProducts.map((product, index) => (
          <div key={product.id}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 0'
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  {product.name}
                </h4>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#999',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <i className="fas fa-clock" style={{ fontSize: '11px' }}></i>
                  {product.lastScan}
                </span>
              </div>
            </div>
            {index < recentProducts.length - 1 && (
              <div style={{ 
                height: '1px', 
                backgroundColor: '#f0f0f0' 
              }}></div>
            )}
          </div>
        ))}
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
        <Link to={`/scan?storeId=${storeId}`} style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreDetailPage; 