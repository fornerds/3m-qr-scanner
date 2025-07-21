import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const StoreInfoPage = () => {
  const navigate = useNavigate();
  
  // 피그마 디자인에 나타난 정확한 수치들
  const storeStats = [
    { label: '총재고', value: '150', color: '#dc3545' },
    { label: '진열상품', value: '50', color: '#28a745' },
    { label: '미진열', value: '60', color: '#ffc107' },
    { label: '부족상품', value: '40', color: '#fd7e14' }
  ];

  // 피그마에 보이는 재고 목록들 (예시 데이터)
  const inventoryList = [
    { code: 'DSO-KIT-001', name: '키친용품 세트', stock: 25, status: 'normal' },
    { code: 'DSO-STA-002', name: '문구용품 A4', stock: 8, status: 'low' },
    { code: 'DSO-CLN-003', name: '청소용품 세제', stock: 0, status: 'out' },
    { code: 'DSO-TOY-004', name: '장난감 블록세트', stock: 15, status: 'normal' },
    { code: 'DSO-COS-005', name: '화장품 립밤', stock: 5, status: 'low' },
    { code: 'DSO-DEC-006', name: '홈데코 소품', stock: 12, status: 'normal' },
    { code: 'DSO-SPO-007', name: '운동용품 매트', stock: 0, status: 'out' },
    { code: 'DSO-ELE-008', name: '전자제품 케이블', stock: 3, status: 'low' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return '#28a745';
      case 'low': return '#ffc107';
      case 'out': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'normal': return '정상';
      case 'low': return '부족';
      case 'out': return '품절';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="mobile-container">
      <div className="header">
        <button className="header-back" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>다이소 관련점</h1>
        <div></div>
      </div>
      
      <div className="content">
        {/* 매장 통계 - 피그마 디자인의 정확한 수치 */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {storeStats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-number" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 재고 목록 */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', color: '#333' }}>재고 현황 목록</h3>
          {inventoryList.map((item, index) => (
            <div key={index}>
              <div className="list-item" style={{ cursor: 'default' }}>
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">{item.name}</div>
                  <div className="list-item-subtitle">{item.code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="list-item-value">{item.stock}</div>
                  <div style={{ 
                    color: getStatusColor(item.status),
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {getStatusText(item.status)}
                  </div>
                </div>
              </div>
              {index < inventoryList.length - 1 && (
                <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 16px' }}></div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <Link to="/inventory" className="btn btn-primary" style={{ flex: 1 }}>
            재고 관리
          </Link>
          <Link to="/scan" className="btn btn-secondary" style={{ flex: 1 }}>
            QR 스캔
          </Link>
        </div>

        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '20px' }}>
          <p>마지막 업데이트: 2024년 1월 21일 오후 2:02</p>
          <p>총 재고 수량: {inventoryList.reduce((sum, item) => sum + item.stock, 0)}개</p>
        </div>
      </div>
      
      <div className="bottom-nav">
        <Link to="/" className="nav-item">
          <div className="nav-icon">🏠</div>
          <div className="nav-label">홈</div>
        </Link>
        <Link to="/scan" className="nav-item">
          <div className="nav-icon">📱</div>
          <div className="nav-label">스캔</div>
        </Link>
        <Link to="/store-info" className="nav-item active">
          <div className="nav-icon">🏪</div>
          <div className="nav-label">매장</div>
        </Link>
        <Link to="/inventory" className="nav-item">
          <div className="nav-icon">📊</div>
          <div className="nav-label">재고</div>
        </Link>
        <Link to="/settings" className="nav-item">
          <div className="nav-icon">⚙️</div>
          <div className="nav-label">설정</div>
        </Link>
      </div>
    </div>
  );
};

export default StoreInfoPage; 