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
        // 최근 3개 매장만 표시 (스크린샷과 일치)
        setStores(data.slice(0, 3));
      } catch (err) {
        console.error('매장 목록 조회 오류:', err);
        setError(err.message);
        // 오류 시 샘플 데이터 사용 (스크린샷과 일치하게 수정)
        setStores([
          {
            id: '1',
            name: '다이소 강남점',
            address: '서울 강남구 테헤란로 123',
            lastVisit: '2시간 전',
            scanCount: '156/27 (13%)'
          },
          {
            id: '2', 
            name: '다이소 신촌점',
            address: '서울 서대문구 연세로 456',
            lastVisit: '1일 전',
            scanCount: '156/27 (13%)'
          },
          {
            id: '3',
            name: '다이소 홍대점', 
            address: '서울 마포구 홍익로 789',
            lastVisit: '3일 전',
            scanCount: '156/27 (13%)'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

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
          fontSize: '14px'
        }}>
          3M
        </div>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'white' 
        }}>
          QR Scanner
        </h1>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ padding: '0' }}>
        {/* 중앙 QR 스캔 영역 */}
        <div style={{ 
          backgroundColor: 'white',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          {/* QR 아이콘 */}
          <div style={{
            width: '100px',
            height: '100px',
            backgroundColor: '#fce4e6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            {/* QR 코드 아이콘 (스크린샷과 동일한 스타일) */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#dc3545">
              <rect x="3" y="3" width="8" height="8" rx="1" fill="#dc3545"/>
              <rect x="13" y="3" width="8" height="8" rx="1" fill="#dc3545"/>
              <rect x="3" y="13" width="8" height="8" rx="1" fill="#dc3545"/>
              <rect x="5" y="5" width="4" height="4" fill="white"/>
              <rect x="15" y="5" width="4" height="4" fill="white"/>
              <rect x="5" y="15" width="4" height="4" fill="white"/>
              <rect x="13" y="13" width="2" height="2" fill="#dc3545"/>
              <rect x="17" y="13" width="2" height="2" fill="#dc3545"/>
              <rect x="19" y="13" width="2" height="2" fill="#dc3545"/>
              <rect x="13" y="17" width="2" height="2" fill="#dc3545"/>
              <rect x="15" y="17" width="2" height="2" fill="#dc3545"/>
              <rect x="19" y="17" width="2" height="2" fill="#dc3545"/>
              <rect x="17" y="19" width="2" height="2" fill="#dc3545"/>
              <rect x="19" y="19" width="2" height="2" fill="#dc3545"/>
            </svg>
          </div>

          {/* 타이틀 */}
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333',
            letterSpacing: '-0.5px'
          }}>
            3M QR 스캐너
          </h2>

          {/* 설명 텍스트 */}
          <p style={{
            margin: '0 0 32px 0',
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            QR코드를 스캔하여<br/>
            다이소 매장을 검색하세요
          </p>

          {/* QR 스캔 시작 버튼 */}
          <Link
            to="/scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              width: '100%',
              maxWidth: '280px',
              boxSizing: 'border-box'
            }}
          >
            <svg style={{ marginRight: '8px' }} width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="3" y="3" width="8" height="8" rx="1"/>
              <rect x="13" y="3" width="8" height="8" rx="1"/>
              <rect x="3" y="13" width="8" height="8" rx="1"/>
              <rect x="5" y="5" width="4" height="4" fill="#dc3545"/>
              <rect x="15" y="5" width="4" height="4" fill="#dc3545"/>
              <rect x="5" y="15" width="4" height="4" fill="#dc3545"/>
            </svg>
            QR코드 스캔 시작
          </Link>
        </div>

        {/* 최근 작업한 매장 섹션 */}
        <div style={{ 
          padding: '20px 16px'
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
              최근 작업한 매장
            </h3>
            <Link
              to="/store-list"
              style={{
                fontSize: '14px',
                color: '#dc3545',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              전체보기
            </Link>
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: '#666'
            }}>
              매장 목록을 불러오는 중...
            </div>
          )}

          {/* 에러 상태 */}
          {error && !loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: '#dc3545',
              backgroundColor: '#fff5f5',
              borderRadius: '8px'
            }}>
              {error}
            </div>
          )}

          {/* 매장 카드 목록 */}
          {!loading && stores.map((store) => (
            <Link
              key={store.id}
              to={`/store-detail/${store.id}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                marginBottom: '12px'
              }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f0f0f0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {/* 매장 아이콘 */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#fce4e6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    flexShrink: 0
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#dc3545">
                      <path d="M12 2L2 7v10c0 5.55 3.84 8.9 9 10 5.16-1.1 9-4.45 9-10V7l-10-5z"/>
                    </svg>
                  </div>

                  {/* 매장 정보 */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {store.name}
                    </h4>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      {store.address}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      <svg style={{ marginRight: '4px' }} width="12" height="12" viewBox="0 0 24 24" fill="#999">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      {store.lastVisit}
                      <span style={{ margin: '0 8px', color: '#ddd' }}>•</span>
                      <svg style={{ marginRight: '4px' }} width="12" height="12" viewBox="0 0 24 24" fill="#999">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {store.scanCount}
                    </div>
                  </div>

                  {/* 화살표 아이콘 */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc">
                    <polyline points="9,18 15,12 9,6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QRScannerMain; 