import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStores: 0,
    totalProducts: 0,
    totalScans: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // 매장 수 조회
      const storesResponse = await fetch('/api/stores');
      const storesResult = await storesResponse.json();
      const stores = storesResult.success ? storesResult.data : storesResult;
      
      // 제품 수 조회
      const productsResponse = await fetch('/api/products');
      const productsResult = await productsResponse.json();
      const products = productsResult.success ? (productsResult.data || productsResult.products) : productsResult;
      console.log('제품 데이터 응답:', productsResult); // 디버깅용
      
      // 스캔 기록 수 조회
      const scansResponse = await fetch('/api/scan-records');
      const scansResult = await scansResponse.json();
      const scans = scansResult.success ? scansResult.data : scansResult;
      
      setStats({
        totalStores: Array.isArray(stores) ? stores.length : (storesResult.totalStores || 0),
        totalProducts: Array.isArray(products) ? products.length : (productsResult.pagination?.totalCount || 0),
        totalScans: Array.isArray(scans) ? scans.length : (scansResult.pagination?.total || 0),
        recentActivity: Array.isArray(scans) ? scans.slice(0, 5) : []
      });
    } catch (error) {
      console.error('대시보드 데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '30px' }}>
      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: isMobile ? '16px' : '20px',
        marginBottom: isMobile ? '20px' : '30px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: isMobile ? '16px' : '0'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '24px' : '28px',
            color: '#333',
            fontWeight: 'bold'
          }}>
            대시보드
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: isMobile ? '14px' : '16px'
          }}>
            3M QR 스캐너 시스템 현황
          </p>
        </div>
        <button
          onClick={fetchDashboardStats}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: isMobile ? '12px 20px' : '8px 16px',
            borderRadius: '6px',
            fontSize: isMobile ? '16px' : '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: isMobile ? '48px' : 'auto',
            alignSelf: isMobile ? 'stretch' : 'flex-start'
          }}
        >
          <i className="fas fa-sync-alt" style={{ fontSize: isMobile ? '16px' : '14px' }}></i>
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: isMobile ? '16px' : '20px',
        marginBottom: isMobile ? '24px' : '40px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: isMobile ? '20px' : '24px',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '16px'
          }}>
            <div style={{
              width: isMobile ? '44px' : '50px',
              height: isMobile ? '44px' : '50px',
              backgroundColor: '#1976d2',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-store" style={{ color: 'white', fontSize: isMobile ? '18px' : '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#666', marginBottom: '4px' }}>총 매장 수</div>
              <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 'bold', color: '#1976d2' }}>
                {stats.totalStores}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: isMobile ? '20px' : '24px',
          borderRadius: '8px',
          border: '1px solid #e1bee7'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '16px'
          }}>
            <div style={{
              width: isMobile ? '44px' : '50px',
              height: isMobile ? '44px' : '50px',
              backgroundColor: '#7b1fa2',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-box" style={{ color: 'white', fontSize: isMobile ? '18px' : '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#666', marginBottom: '4px' }}>총 제품 수</div>
              <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {stats.totalProducts}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#e8f5e8',
          padding: isMobile ? '20px' : '24px',
          borderRadius: '8px',
          border: '1px solid #c8e6c9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '16px'
          }}>
            <div style={{
              width: isMobile ? '44px' : '50px',
              height: isMobile ? '44px' : '50px',
              backgroundColor: '#388e3c',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-qrcode" style={{ color: 'white', fontSize: isMobile ? '18px' : '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#666', marginBottom: '4px' }}>총 스캔 수</div>
              <div style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 'bold', color: '#388e3c' }}>
                {stats.totalScans}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          color: '#333',
          marginBottom: isMobile ? '16px' : '20px'
        }}>
          최근 스캔 활동
        </h2>
        
        {stats.recentActivity.length > 0 ? (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {stats.recentActivity.map((activity, index) => (
              <div key={index} style={{
                padding: isMobile ? '12px 16px' : '16px 20px',
                borderBottom: index < stats.recentActivity.length - 1 ? '1px solid #e0e0e0' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '12px' : '16px'
              }}>
                <div style={{
                  width: isMobile ? '36px' : '40px',
                  height: isMobile ? '36px' : '40px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-qrcode" style={{ color: 'white', fontSize: isMobile ? '12px' : '14px' }}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: isMobile ? '14px' : '16px', 
                    fontWeight: '500', 
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {activity.productName || '알 수 없는 제품'}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '12px' : '14px', 
                    color: '#666', 
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    매장 {activity.storeId} • {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: isMobile ? '32px 20px' : '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ 
              fontSize: isMobile ? '32px' : '36px',
              marginBottom: '12px'
            }}>
              📊
            </div>
            <div style={{ fontSize: isMobile ? '14px' : '16px' }}>
              아직 스캔 기록이 없습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 