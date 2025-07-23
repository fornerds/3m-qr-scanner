import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StoreListPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('최근 방문순');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sortOptions = ['최근 방문순', '이름순'];

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

  // 검색 필터링
  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 정렬 로직
  const sortedStores = [...filteredStores].sort((a, b) => {
    switch (sortBy) {
      case '이름순':
        return a.name.localeCompare(b.name, 'ko');
      
      case '최근 방문순':
      default:
        // lastVisit 날짜를 기준으로 정렬 (최신 날짜가 먼저)
        const dateA = a.lastVisit ? new Date(a.lastVisit) : new Date(0);
        const dateB = b.lastVisit ? new Date(b.lastVisit) : new Date(0);
        return dateB - dateA;
    }
  });

  return (
    <div className="mobile-container">
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px'
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
          작업 매장 전체
        </h1>
        <div style={{ width: '24px' }}></div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 110px)', paddingBottom: '80px' }}>
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
            padding: '20px',
            color: '#dc3545',
            backgroundColor: '#fff5f5',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        )}

        {/* 검색 및 필터 */}
        {!loading && (
          <div style={{ 
            backgroundColor: 'white',
            padding: '16px',
            paddingBottom: '6px'
          }}>
            {/* 검색바 */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="매장명 또는 주소 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#f8f9fa',
                  boxSizing: 'border-box'
                }}
              />
              <i className="fas fa-search" style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
                fontSize: '14px'
              }}></i>
            </div>

            {/* 정렬 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '14px', color: '#666' }}>정렬:</span>
                <div
                  style={{
                    position: 'relative',
                    width: '120px',
                    padding: '6px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    textIndent: '4px',
                    boxSizing: 'border-box'
                  }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  {sortBy}
                  <i className="fas fa-caret-down" style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999',
                    fontSize: '12px'
                  }}></i>
                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      width: '100%',
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {sortOptions.map((option, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#333',
                            backgroundColor: option === sortBy ? '#f0f0f0' : 'transparent'
                          }}
                          onClick={() => {
                            setSortBy(option);
                            setDropdownOpen(false);
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '14px', color: '#999' }}>
                총 {sortedStores.length}개 매장
              </span>
            </div>
          </div>
        )}

        {/* 매장 리스트 */}
        {!loading && (
          <div style={{ padding: '16px 16px' }}>
            {sortedStores.map((store) => (
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
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* 매장 정보 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    {/* 매장 아이콘 */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#ffe6e6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      border: '2px solid #dc3545',
                      flexShrink: 0
                    }}>
                      <i className="fas fa-store" style={{
                        fontSize: '16px',
                        color: '#dc3545'
                      }}></i>
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#333'
                      }}>
                        {store.name}
                      </h3>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '13px',
                        color: '#666'
                      }}>
                        {store.address}
                      </p>
                      
                      {/* 스캔 진행률 바 */}
                      <div style={{
                        marginBottom: '6px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#666',
                            fontWeight: '500'
                          }}>
                            스캔 진행률
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#dc3545',
                            fontWeight: 'bold'
                          }}>
                            {store.scanCount}
                          </span>
                        </div>
                        
                        {/* 프로그레스 바 */}
                        <div style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${store.progress || 0}%`,
                            height: '100%',
                            backgroundColor: '#dc3545',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>
                      
                      {/* 작업 시간 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#999'
                      }}>
                        <i className="fas fa-clock" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                        {getRelativeTime(store.lastVisit)}
                      </div>
                    </div>

                    {/* 화살표 아이콘 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '4px'
                    }}>
                      <i className="fas fa-chevron-right" style={{
                        color: '#ccc',
                        fontSize: '14px'
                      }}></i>
                    </div>
                  </div>

                  {/* 선택하기 버튼 */}
                  <div
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      textAlign: 'center',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    선택하기
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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

export default StoreListPage; 