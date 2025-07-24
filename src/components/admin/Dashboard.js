import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStores: 0,
    totalProducts: 0,
    totalScans: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // 매장 수 조회
      const storesResponse = await fetch('/api/stores');
      const storesData = await storesResponse.json();
      
      // 제품 수 조회
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      console.log('제품 데이터 응답:', productsData); // 디버깅용
      
      // 스캔 기록 수 조회
      const scansResponse = await fetch('/api/scan-records');
      const scansData = await scansResponse.json();
      
      setStats({
        totalStores: storesData.length || 0,
        totalProducts: productsData.products?.length || productsData.length || 0,
        totalScans: scansData.length || 0,
        recentActivity: scansData.slice(0, 5) || []
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
    <div style={{ padding: '30px' }}>
      {/* 헤더 */}
      <div style={{
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            color: '#333',
            fontWeight: 'bold'
          }}>
            대시보드
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: '16px'
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
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-sync-alt" style={{ fontSize: '14px' }}></i>
          새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#1976d2',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-store" style={{ color: 'white', fontSize: '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>총 매장 수</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                {stats.totalStores}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e1bee7'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#7b1fa2',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-box" style={{ color: 'white', fontSize: '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>총 제품 수</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {stats.totalProducts}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #c8e6c9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#388e3c',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-qrcode" style={{ color: 'white', fontSize: '20px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>총 스캔 수</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>
                {stats.totalScans}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div>
        <h2 style={{
          fontSize: '20px',
          color: '#333',
          marginBottom: '20px'
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
                padding: '16px 20px',
                borderBottom: index < stats.recentActivity.length - 1 ? '1px solid #e0e0e0' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-qrcode" style={{ color: 'white', fontSize: '14px' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                    {activity.productName || '알 수 없는 제품'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    매장 {activity.storeId} • {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            아직 스캔 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 