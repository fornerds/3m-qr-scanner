import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StoreListPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('최근 방문순');
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
        setStores(data);
      } catch (err) {
        console.error('매장 목록 조회 오류:', err);
        setError(err.message);
        // 오류 시 샘플 데이터 사용
        setStores([
          {
            id: 1,
            name: '다이소 강남점',
            address: '서울 강남구 테헤란로 123',
            scanCount: '156/247 (13%)',
            time: '24시간',
            distance: '0.3km'
          },
          {
            id: 2,
            name: '다이소 신촌점',
            address: '서울 서대문구 연세로 456',
            scanCount: '78/892 (9%)',
            time: '1일 전',
            distance: '1.2km'
          },
          {
            id: 3,
            name: '다이소 홍대점',
            address: '서울 마포구 홍익로 789',
            scanCount: '234/1568 (15%)',
            time: '3일 전',
            distance: '1.8km'
          },
          {
            id: 4,
            name: '다이소 명동점',
            address: '서울 중구 명동길 321',
            scanCount: '89/743 (12%)',
            time: '1주일 전',
            distance: '2.1km'
          },
          {
            id: 5,
            name: '다이소 잠실점',
            address: '서울 송파구 올림픽로 654',
            scanCount: '345/1125 (31%)',
            time: '10일 전',
            distance: '3.5km'
          },
          {
            id: 6,
            name: '다이소 구로점',
            address: '서울 구로구 구로중앙로 987',
            scanCount: '123/934 (13%)',
            time: '2주일 전',
            distance: '4.2km'
          },
          {
            id: 7,
            name: '다이소 노원점',
            address: '서울 노원구 노원로 258',
            scanCount: '267/1089 (25%)',
            time: '3주일 전',
            distance: '5.8km'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 120px)' }}>
        {/* 로딩 상태 */}
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666',
            backgroundColor: 'white',
            margin: '16px',
            borderRadius: '12px'
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
            borderRadius: '8px',
            margin: '16px'
          }}>
            {error}
          </div>
        )}

        {/* 검색 및 필터 */}
        {!loading && (
          <div style={{ 
            backgroundColor: 'white',
            padding: '16px'
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
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option>최근 방문순</option>
                <option>거리순</option>
                <option>이름순</option>
              </select>
              <span style={{ fontSize: '14px', color: '#999' }}>
                총 {filteredStores.length}개 매장
              </span>
            </div>
          </div>
        )}

        {/* 매장 리스트 */}
        {!loading && (
          <div style={{ padding: '0 16px' }}>
            {filteredStores.map((store) => (
              <div key={store.id} style={{
                backgroundColor: 'white',
                marginBottom: '16px',
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
                    <div style={{
                      display: 'flex',
                      fontSize: '12px',
                      color: '#999',
                      gap: '16px'
                    }}>
                      <span>스캔 진행률: {store.scanCount}</span>
                      <span>{store.time}</span>
                      <span>{store.distance}</span>
                    </div>
                  </div>
                </div>

                {/* 선택하기 버튼 */}
                <Link
                  to={`/store-detail/${store.id}`}
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
                </Link>
              </div>
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
        <Link to="/settings" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-cog" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>설정</span>
        </Link>
      </div>
    </div>
  );
};

export default StoreListPage; 