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
          operatingHours: '10:00 - 22:00'
        });
        
        setInventory({
          totalItems: 50,
          scannedItems: 45,
          unstockedItems: 3,
          unavailableItems: 2,
          progress: 90,
          recentScans: [
            {
              productCode: '3M-ADH-001',
              productName: '3M 다목적 접착제',
              category: '사무용품',
              price: '3,500원',
              stock: '재고 24개',
              timestamp: new Date().toISOString()
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeId]);

  // 샘플 상품 데이터 (실제로는 API에서 가져와야 함)
  const products = [
    {
      id: 1,
      name: '3M 스카치 패킷테이프',
      category: '사무용품',
      price: '3,500원',
      stock: '재고 24개',
      lastScan: '2시간 전'
    },
    {
      id: 2,
      name: '3M 포스트잇 플래그',
      category: '사무용품',
      price: '2,800원',
      stock: '재고 8개',
      lastScan: '1일 전'
    },
    {
      id: 3,
      name: '3M 멀티용도 접착테이프',
      category: '생활용품',
      price: '4,200원',
      stock: '재고 15개',
      lastScan: '3일 전'
    },
    {
      id: 4,
      name: '3M 스카치 수세미',
      category: '주방용품',
      price: '2,500원',
      stock: '재고 3개',
      lastScan: '1주일 전'
    },
    {
      id: 5,
      name: '3M 클리닝 와이프',
      category: '청소용품',
      price: '1,900원',
      stock: '재고 12개',
      lastScan: '2일 전'
    }
  ];

  if (loading) {
    return (
      <div className="mobile-container">
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

  if (error && !store) {
    return (
      <div className="mobile-container">
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: '#dc3545',
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          margin: '16px'
        }}>
          {error}
        </div>
      </div>
    );
  }

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
          color: 'white' 
        }}>
          {store?.name || '매장 상세'}
        </h1>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 120px)' }}>
        {/* 매장 정보 */}
        <div style={{ 
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#ffe6e6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              border: '2px solid #dc3545'
            }}>
              <i className="fas fa-store" style={{
                fontSize: '20px',
                color: '#dc3545'
              }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {store?.name}
              </h2>
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
                fontSize: '12px',
                color: '#999'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <i className="fas fa-clock"></i>
                  {store?.operatingHours}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: store?.isOpen ? '#28a745' : '#dc3545'
                }}>
                  <i className="fas fa-circle"></i>
                  {store?.isOpen ? '영업중' : '영업종료'}
                </span>
              </div>
            </div>
          </div>

          {/* 재고 통계 */}
          {inventory && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '12px',
              marginTop: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#dc3545'
                }}>
                  {inventory.totalItems}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  총 재고
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  {inventory.scannedItems}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  스캔 완료
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#ffc107'
                }}>
                  {inventory.unstockedItems}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  미진열
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#fd7e14'
                }}>
                  {inventory.unavailableItems}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666'
                }}>
                  부족
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 상품 목록 */}
        <div style={{ 
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            상품 목록
          </h3>
          {products.map((product, index) => (
            <div key={product.id}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {product.name}
                  </h4>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {product.category} · {product.price}
                  </p>
                  <div style={{
                    fontSize: '11px',
                    color: '#999'
                  }}>
                    {product.stock} · 마지막 스캔: {product.lastScan}
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{
                  color: '#ccc',
                  fontSize: '12px'
                }}></i>
              </div>
              {index < products.length - 1 && (
                <div style={{ 
                  height: '1px', 
                  backgroundColor: '#f0f0f0' 
                }}></div>
              )}
            </div>
          ))}
        </div>

        {/* 액션 버튼들 */}
        <div style={{ padding: '0 16px 20px 16px' }}>
          <Link
            to="/scan"
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              textAlign: 'center',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px'
            }}
          >
            QR 스캔으로 재고 확인
          </Link>
          <Link
            to="/inventory-status"
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              color: '#333',
              textAlign: 'center',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: '1px solid #ddd'
            }}
          >
            재고 현황 상세보기
          </Link>
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
        <Link to="/scan" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
        <Link to="/settings" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-cog" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>설정</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreDetailPage; 