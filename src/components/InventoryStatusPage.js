import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const InventoryStatusPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '1'; // URL에서 storeId 가져오기
  
  const [store, setStore] = useState(null);
  const [inventory, setInventory] = useState(null);
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

  // API에서 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 매장 정보 가져오기
        const storeResponse = await fetch('/api/stores');
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
        console.error('데이터 조회 오류:', err);
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
          notDisplayedItems: 0,
          progress: 0,
          notDisplayedProducts: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [storeId]);

  // API 데이터를 기반으로 우선순위별 아이템 생성 (미진열 제품만)
  const getPriorityItems = () => {
    if (!inventory) return { high: [], medium: [], low: [] };

    const highPriorityItems = inventory.notDisplayedProducts?.filter(item => item.priority === 'high').map(item => ({
      name: item.productName,
      code: '미진열',
      time: '진열 필요',
      type: 'not_displayed',
      rank: item.rank || 0,
      salesAvg: item.salesAvg || 0
    })) || [];

    const mediumPriorityItems = inventory.notDisplayedProducts?.filter(item => item.priority === 'medium').map(item => ({
      name: item.productName,
      code: '미진열',
      time: '확인 필요',
      type: 'not_displayed',
      rank: item.rank || 0,
      salesAvg: item.salesAvg || 0
    })) || [];

    const lowPriorityItems = inventory.notDisplayedProducts?.filter(item => item.priority === 'low').map(item => ({
      name: item.productName,
      code: '미진열',
      time: '모니터링',
      type: 'not_displayed',
      rank: item.rank || 0,
      salesAvg: item.salesAvg || 0
    })) || [];

    return {
      high: highPriorityItems,
      medium: mediumPriorityItems,
      low: lowPriorityItems
    };
  };

  const priorityItems = getPriorityItems();

  if (loading) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '414px',
        margin: '0 auto',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          textAlign: 'center', 
          color: '#666'
        }}>
          재고 현황을 불러오는 중...
        </div>
      </div>
    );
  }

  const PrioritySection = ({ title, items, bgColor, textColor, badgeColor, icon }) => (
    <div style={{ marginBottom: '16px' }}>
      {/* 섹션 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        paddingLeft: '16px'
      }}>
        {icon && (
          <i className={icon} style={{
            color: textColor,
            fontSize: '14px',
            marginRight: '8px'
          }}></i>
        )}
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 'bold',
          color: textColor
        }}>
          {title}
        </h3>
      </div>

      {/* 품목 리스트 */}
      {items.map((item, index) => (
        <div 
          key={index}
          style={{
            backgroundColor: bgColor,
            margin: '0 16px 8px 16px',
            padding: '16px',
            borderRadius: '12px'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                {item.name}
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '14px',
                color: '#666'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fas fa-box" style={{ fontSize: '12px' }}></i>
                  {item.code}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
                  {item.time}
                </span>
                {item.rank && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    <i className="fas fa-chart-line" style={{ fontSize: '10px' }}></i>
                    판매 {item.rank}위
                  </span>
                )}
              </div>
            </div>
            <span style={{
              backgroundColor: badgeColor,
              color: 'white',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '16px',
              fontWeight: '500',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              {title.includes('높은') ? '높음' : title.includes('보통') ? '보통' : '낮음'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

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
          재고 현황
        </h1>
      </div>

      <div style={{ backgroundColor: '#ffffff', paddingBottom: '100px', minHeight: 'calc(100vh - 60px)' }}>
        {/* 매장 정보 및 통계 */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderBottom: '8px solid #f5f5f5',
          position: 'relative'
        }}>
          {/* 보고서 아이콘 */}
          <Link
            to={`/inventory-report?storeId=${storeId}`}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              backgroundColor: '#dc3545',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-file-alt" style={{
              color: 'white',
              fontSize: '16px'
            }}></i>
          </Link>

          <div style={{
            marginBottom: '16px',
            paddingRight: '60px'
          }}>
              <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '18px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {store?.name || '매장명'}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#666'
              }}>
                {store?.address || '주소 정보 없음'}
              </p>
          </div>

          {/* 통계 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#007bff',
                marginBottom: '4px'
              }}>
                {inventory?.totalItems || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                전체 품목수
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#28a745',
                marginBottom: '4px'
              }}>
                {inventory?.scannedItems || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                스캔 완료
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#fd7e14',
                marginBottom: '4px'
              }}>
                {inventory?.notDisplayedItems || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                미진열
              </div>
            </div>
          </div>

          {/* 진행률 */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>진행률</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc3545' }}>{inventory?.progress || 0}%</span>
            </div>
            <div style={{
              height: '6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${inventory?.progress || 0}%`,
                height: '100%',
                backgroundColor: '#dc3545',
                borderRadius: '3px'
              }}></div>
            </div>
          </div>
        </div>

        {/* 우선순위별 섹션 */}
        <div style={{ padding: '16px 0' }}>
          {priorityItems.high.length > 0 && (
          <PrioritySection
            title="높은 우선순위"
              items={priorityItems.high}
            bgColor="#fff5f5"
            textColor="#dc3545"
            badgeColor="#dc3545"
          />
          )}

          {priorityItems.medium.length > 0 && (
          <PrioritySection
            title="보통 우선순위"
              items={priorityItems.medium}
            bgColor="#fffbf0"
            textColor="#ffc107"
            badgeColor="#ffc107"
            icon="fas fa-exclamation-triangle"
          />
          )}

          {priorityItems.low.length > 0 && (
          <PrioritySection
            title="낮은 우선순위"
              items={priorityItems.low}
            bgColor="#f0fff4"
            textColor="#28a745"
            badgeColor="#28a745"
            icon="fas fa-check-circle"
          />
          )}
          
          {priorityItems.high.length === 0 && priorityItems.medium.length === 0 && priorityItems.low.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666',
              backgroundColor: 'white',
              margin: '16px',
              borderRadius: '12px'
            }}>
              현재 주의가 필요한 품목이 없습니다.
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
        <Link to="/store-list" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
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

export default InventoryStatusPage; 