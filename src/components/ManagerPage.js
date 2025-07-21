import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ManagerPage = () => {
  const navigate = useNavigate();
  
  const daisoTasks = [
    { id: 1, title: '다이소 관련점', subtitle: '재고 현황 확인이 필요합니다', time: '오전 9:00', urgent: true },
    { id: 2, title: '다이소 관련점', subtitle: '신규 상품 등록 및 진열', time: '오전 10:30', urgent: false },
    { id: 3, title: '다이소 관련점', subtitle: '매출 보고서 작성 완료', time: '오후 2:00', urgent: false },
    { id: 4, title: '다이소 관련점', subtitle: '재고 실사 진행 중', time: '오후 3:30', urgent: true },
    { id: 5, title: '다이소 관련점', subtitle: '고객 문의 응답 대기', time: '오후 4:00', urgent: false },
    { id: 6, title: '다이소 관련점', subtitle: '진열 상품 점검 필요', time: '오후 5:00', urgent: true },
  ];

  return (
    <div className="mobile-container">
      <div className="header">
        <button className="header-back" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>매장 책임자</h1>
        <div></div>
      </div>
      
      <div className="content">
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#333', marginBottom: '8px' }}>안녕하세요!</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>오늘의 다이소 업무를 확인하세요</p>
        </div>

        <div className="card">
          {daisoTasks.map((task, index) => (
            <div key={task.id}>
              <div 
                className="list-item"
                onClick={() => {
                  if (task.subtitle.includes('재고')) {
                    navigate('/inventory');
                  } else if (task.subtitle.includes('매출')) {
                    navigate('/store-info');
                  }
                }}
                style={{ 
                  backgroundColor: task.urgent ? '#fff5f5' : 'white',
                  borderLeft: task.urgent ? '4px solid #dc3545' : 'none',
                  paddingLeft: task.urgent ? '12px' : '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="list-item-title" style={{ 
                    color: task.urgent ? '#dc3545' : '#333',
                    fontWeight: task.urgent ? 'bold' : '500'
                  }}>
                    {task.title}
                  </div>
                  <div className="list-item-subtitle">{task.subtitle}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {task.time}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {task.urgent && (
                    <div style={{ 
                      backgroundColor: '#dc3545',
                      color: 'white',
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      marginBottom: '4px'
                    }}>
                      긴급
                    </div>
                  )}
                  <div className="list-item-value">→</div>
                </div>
              </div>
              {index < daisoTasks.length - 1 && (
                <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 16px' }}></div>
              )}
            </div>
          ))}
        </div>

        <Link to="/scan" className="btn btn-primary" style={{ marginTop: '20px' }}>
          QR 스캔 시작하기
        </Link>
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

export default ManagerPage; 