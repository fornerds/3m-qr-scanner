import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StoreSelectPage = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // API에서 매장 목록 가져오기
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stores');
        if (!response.ok) {
          throw new Error('매장 목록을 가져올 수 없습니다.');
        }
        const result = await response.json();
        
        // 새 API 응답 형태 처리: {success: true, data: [...]}
        const storesData = result.success ? result.data : result;
        setStores(Array.isArray(storesData) ? storesData : []);
      } catch (err) {
        console.error('매장 목록 조회 오류:', err);
        setError(err.message);
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

  return (
    <div className="mobile-container">
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '16px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
          color: 'white'
        }}>
          스캔할 매장 선택
        </h1>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 60px)', paddingBottom: '80px' }}>
        {/* 검색 섹션 */}
        <div style={{ 
          backgroundColor: 'white',
          padding: '16px',
          borderBottom: '1px solid #eee'
        }}>
          <div style={{
            position: 'relative',
            marginBottom: '8px'
          }}>
            <input
              type="text"
              placeholder="매장명 또는 주소로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px 12px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <i className="fas fa-search" style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '16px'
            }}></i>
          </div>
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
            margin: '16px',
            borderRadius: '8px'
          }}>
            {error}
          </div>
        )}

        {/* 매장 목록 */}
        {!loading && !error && (
          <div style={{ padding: '16px' }}>
            {filteredStores.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px',
                color: '#666'
              }}>
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
              </div>
            ) : (
              <div>
                <div style={{
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  총 {filteredStores.length}개 매장
                </div>
                
                {filteredStores.map((store) => (
                  <Link
                    key={store.id}
                    to={`/qr-scan?storeId=${store.id}`}
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
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          flex: 1
                        }}>
                          {/* 매장 아이콘 */}
                          <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#fce4e6',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '16px',
                            flexShrink: 0
                          }}>
                            <i className="fas fa-store" style={{
                              fontSize: '20px',
                              color: '#dc3545'
                            }}></i>
                          </div>

                          {/* 매장 정보 */}
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
                              color: '#666',
                              lineHeight: '1.4'
                            }}>
                              {store.address}
                            </p>
                            
                            {/* 스캔 진행률 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                color: '#666'
                              }}>
                                스캔 완료
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: '#dc3545',
                                fontWeight: 'bold'
                              }}>
                                {store.scanCount || 0}개
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 스캔 시작 버튼 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '80px',
                          height: '40px',
                          backgroundColor: '#dc3545',
                          borderRadius: '8px',
                          marginLeft: '16px'
                        }}>
                          <i className="fas fa-qrcode" style={{
                            color: 'white',
                            fontSize: '16px',
                            marginRight: '6px'
                          }}></i>
                          <span style={{
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            스캔
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
        <Link to="/store-list" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-store" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>매장</span>
        </Link>
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#dc3545', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreSelectPage; 