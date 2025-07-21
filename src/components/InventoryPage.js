import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const InventoryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('missing');

  // 피그마 디자인에 맞는 미구비 품목들
  const missingItems = [
    { id: 1, code: 'DSO-003', name: '생활용품 세제', location: '2층 A구역', needed: 20 },
    { id: 2, code: 'DSO-007', name: '운동용품 매트', location: '3층 A구역', needed: 15 },
    { id: 3, code: 'DSO-008', name: '전자제품 케이블', location: '1층 D구역', needed: 30 },
    { id: 4, code: 'DSO-012', name: '주방용품 도구', location: '1층 A구역', needed: 10 },
    { id: 5, code: 'DSO-015', name: '문구용품 펜', location: '1층 B구역', needed: 50 },
    { id: 6, code: 'DSO-018', name: '홈데코 소품', location: '2층 C구역', needed: 25 }
  ];

  // 미진열 재고 품목들
  const unstockedItems = [
    { id: 1, code: 'DSO-002', name: '키친용품 세트', location: '창고 A', stock: 15 },
    { id: 2, code: 'DSO-006', name: '화장품 립밤', location: '창고 B', stock: 8 },
    { id: 3, code: 'DSO-009', name: '장난감 블록', location: '창고 A', stock: 22 },
    { id: 4, code: 'DSO-011', name: '청소용품', location: '창고 C', stock: 12 },
    { id: 5, code: 'DSO-014', name: '의류 액세서리', location: '창고 B', stock: 18 },
    { id: 6, code: 'DSO-017', name: '원예용품', location: '창고 D', stock: 6 }
  ];

  return (
    <div className="mobile-container">
      <div className="header">
        <button className="header-back" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>재고 현황</h1>
        <div></div>
      </div>
      
      <div className="content">
        {/* 탭 선택 */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '20px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <button 
            onClick={() => setActiveTab('missing')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'missing' ? 'bold' : 'normal',
              color: activeTab === 'missing' ? '#dc3545' : '#666',
              borderBottom: activeTab === 'missing' ? '2px solid #dc3545' : 'none',
              cursor: 'pointer'
            }}
          >
            미구비품목탭
          </button>
          <button 
            onClick={() => setActiveTab('unstocked')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'unstocked' ? 'bold' : 'normal',
              color: activeTab === 'unstocked' ? '#dc3545' : '#666',
              borderBottom: activeTab === 'unstocked' ? '2px solid #dc3545' : 'none',
              cursor: 'pointer'
            }}
          >
            미진열재고탭
          </button>
        </div>

        {/* 미구비 품목 탭 */}
        {activeTab === 'missing' && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: '#333' }}>미구비 품목</h3>
            {missingItems.map((item, index) => (
              <div key={item.id}>
                <div className="list-item" style={{ cursor: 'default' }}>
                  <div style={{ flex: 1 }}>
                    <div className="list-item-title">{item.name}</div>
                    <div className="list-item-subtitle">{item.code} · {item.location}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="list-item-value" style={{ color: '#dc3545' }}>
                      {item.needed}개 필요
                    </div>
                    <div style={{ fontSize: '12px', color: '#dc3545', fontWeight: 'bold' }}>
                      품절
                    </div>
                  </div>
                </div>
                {index < missingItems.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 16px' }}></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 미진열 재고 탭 */}
        {activeTab === 'unstocked' && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: '#333' }}>미진열 재고</h3>
            {unstockedItems.map((item, index) => (
              <div key={item.id}>
                <div className="list-item" style={{ cursor: 'default' }}>
                  <div style={{ flex: 1 }}>
                    <div className="list-item-title">{item.name}</div>
                    <div className="list-item-subtitle">{item.code} · {item.location}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="list-item-value" style={{ color: '#ffc107' }}>
                      {item.stock}개
                    </div>
                    <div style={{ fontSize: '12px', color: '#ffc107', fontWeight: 'bold' }}>
                      미진열
                    </div>
                  </div>
                </div>
                {index < unstockedItems.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 16px' }}></div>
                )}
              </div>
            ))}
          </div>
        )}

        <Link to="/scan" className="btn btn-primary" style={{ marginTop: '20px' }}>
          QR 스캔으로 재고 확인
        </Link>

        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '20px' }}>
          <p>마지막 업데이트: 2024년 1월 21일 오후 2:02</p>
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
        <Link to="/store-info" className="nav-item">
          <div className="nav-icon">🏪</div>
          <div className="nav-label">매장</div>
        </Link>
        <Link to="/inventory" className="nav-item active">
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

export default InventoryPage; 