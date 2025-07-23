import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const QRScannerMain = () => {
  const [stores, setStores] = useState([]);
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
    
    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`;
    } else if (diffInDays < 2) {
      return '1일 전';
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}일 전`;
    } else if (diffInDays < 14) {
      return '1주일 전';
    } else if (diffInDays < 21) {
      return '2주일 전';
    } else {
      return '3주일 전';
    }
  };

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
        // 모든 매장 표시
        setStores(data);
      } catch (err) {
        console.error('매장 목록 조회 오류:', err);
        setError(err.message);
        // 오류 시 빈 배열로 설정 (더 이상 하드코딩 데이터 사용 안함)
        setStores([]);
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
      paddingBottom: '80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '17px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#dc3545',
          fontSize: '14px',
          position: 'absolute',
          left: '16px'
        }}>
          3M
        </div>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white'
        }}>
          QR Scanner
        </h1>
        <Link
          to="/manager"
          style={{
            color: 'white',
            fontSize: '16px',
            textDecoration: 'none',
            padding: '4px',
            position: 'absolute',
            right: '16px'
          }}
        >
          <i className="fas fa-cog"></i>
        </Link>
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
            <i className="fas fa-qrcode" style={{
              fontSize: '48px',
              color: '#dc3545'
            }}></i>
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
            to="/store-select"
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
            <i className="fas fa-qrcode" style={{ marginRight: '8px', fontSize: '16px' }}></i>
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
                    <i className="fas fa-store" style={{
                      fontSize: '18px',
                      color: '#dc3545'
                    }}></i>
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
                      <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                      {getRelativeTime(store.lastVisit)}
                      <span style={{ margin: '0 8px', color: '#ddd' }}>•</span>
                      <i className="fas fa-chart-bar" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                      {store.scanCount}
                    </div>
                  </div>

                  {/* 화살표 아이콘 */}
                  <i className="fas fa-chevron-right" style={{
                    color: '#ccc',
                    fontSize: '12px'
                  }}></i>
                </div>
              </div>
            </Link>
          ))}
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
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default QRScannerMain; 