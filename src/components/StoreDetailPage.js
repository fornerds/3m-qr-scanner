import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const StoreDetailPage = () => {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        console.error('매장 데이터 조회 오류:', err);
        setError(err.message);
        
        // 오류 시 샘플 데이터 사용
        setStore({
          id: storeId,
          name: '다이소 강남점',
          address: '서울 강남구 테헤란로 123',
          isOpen: true,
          operatingHours: '10:00 - 22:00',
          distance: '0.3km'
        });
        
        setInventory({
          totalItems: 247,
          scannedItems: 156,
          progress: 13
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeId]);

  // 샘플 상품 데이터
  const recentProducts = [
    {
      id: 1,
      name: '3M 스카치 패킷테이프',
      lastScan: '2시간 전'
    },
    {
      id: 2,
      name: '3M 다목적 접착제',
      lastScan: '2시간 전'
    },
    {
      id: 3,
      name: '3M 청소용 스펀지',
      lastScan: '2시간 전'
    },
    {
      id: 4,
      name: '3M 글래스 클리너',
      lastScan: '2시간 전'
    },
    {
      id: 5,
      name: '3M 포스트잇 노트',
      lastScan: '2시간 전'
    }
  ];

  if (loading) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '414px',
        margin: '0 auto',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#666'
        }}>
          매장 정보를 불러오는 중...
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
        padding: '12px 16px',
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
          fontWeight: '600', 
          color: 'white' 
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: '#999'
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
                {store?.operatingHours}
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-map-marker-alt" style={{ fontSize: '12px' }}></i>
                {store?.distance}
              </span>
            </div>
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
              마지막 방문: 2시간 전
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
                width: `${inventory?.progress || 13}%`,
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
              {inventory?.progress || 13}%
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>스캔 완료: {inventory?.scannedItems || 156}개</span>
            <span>전체 리스트: {inventory?.totalItems || 247}개</span>
          </div>
        </div>

        {/* 재고현황 보기 버튼 */}
        <Link
          to="/inventory-status"
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
        paddingBottom: '100px'
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
        <Link to="/scan" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreDetailPage; 