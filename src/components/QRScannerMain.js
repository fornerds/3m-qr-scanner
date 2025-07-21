import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const QRScannerMain = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API에서 매장 목록 가져오기
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stores');
        if (!response.ok) {
          throw new Error('매장 목록을 가져올 수 없습니다.');
        }
        const data = await response.json();
        // 최근 4개 매장만 표시
        setStores(data.slice(0, 4));
      } catch (err) {
        console.error('매장 목록 조회 오류:', err);
        setError(err.message);
        // 오류 시 샘플 데이터 사용
        setStores([
          {
            id: 1,
            name: '다이소 강남점',
            address: '서울 강남구 테헤란로 123',
            time: '24시간',
            progress: '156/247 (13%)'
          },
          {
            id: 2,
            name: '다이소 신촌점',
            address: '서울 서대문구 연세로 456',
            time: '1일 전',
            progress: '78/892 (9%)'
          },
          {
            id: 3,
            name: '다이소 홍대점',
            address: '서울 마포구 홍익로 789',
            time: '3일 전',
            progress: '234/1568 (15%)'
          },
          {
            id: 4,
            name: '다이소 명동점',
            address: '서울 중구 명동길 321',
            time: '1주일 전',
            progress: '89/743 (12%)'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return (
    <div className="mobile-container">
      {/* 3M 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontWeight: 'bold',
          color: '#dc3545',
          fontSize: '12px'
        }}>
          3M
        </div>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white' 
        }}>
          QR 스캐너
        </h1>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 120px)' }}>
        {/* 메인 QR 스캔 버튼 */}
        <div style={{ 
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#ffe6e6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            border: '3px solid #dc3545'
          }}>
            <i className="fas fa-qrcode" style={{
              fontSize: '32px',
              color: '#dc3545'
            }}></i>
          </div>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            QR 스캔 시작
          </h2>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: '#666'
          }}>
            매장 재고를 빠르게 확인하세요
          </p>
          <Link
            to="/scan"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            스캔 시작
          </Link>
        </div>

        {/* 최근 매장 목록 */}
        <div style={{ 
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              최근 작업 매장
            </h3>
            <Link
              to="/store-list"
              style={{
                fontSize: '14px',
                color: '#dc3545',
                textDecoration: 'none'
              }}
            >
              전체보기 →
            </Link>
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#666'
            }}>
              매장 목록을 불러오는 중...
            </div>
          )}

          {/* 에러 상태 */}
          {error && !loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#dc3545',
              backgroundColor: '#fff5f5',
              borderRadius: '8px'
            }}>
              {error}
            </div>
          )}

          {/* 매장 목록 */}
          {!loading && stores.map((store) => (
            <Link
              key={store.id}
              to={`/store-detail/${store.id}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {store.name}
                  </h4>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {store.address}
                  </p>
                  <div style={{
                    fontSize: '11px',
                    color: '#999'
                  }}>
                    {store.time} · {store.progress}
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{
                  color: '#ccc',
                  fontSize: '12px'
                }}></i>
              </div>
            </Link>
          ))}
        </div>

        {/* 빠른 액션 버튼들 */}
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
            빠른 액션
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <Link
              to="/qr-test"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <i className="fas fa-qrcode" style={{
                fontSize: '24px',
                color: '#dc3545',
                marginBottom: '8px'
              }}></i>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>QR 테스트</span>
            </Link>
            <Link
              to="/inventory-status"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <i className="fas fa-chart-bar" style={{
                fontSize: '24px',
                color: '#dc3545',
                marginBottom: '8px'
              }}></i>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>재고 현황</span>
            </Link>
          </div>
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
        <Link to="/" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
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
        <Link to="/settings" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-cog" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>설정</span>
        </Link>
      </div>
    </div>
  );
};

export default QRScannerMain; 