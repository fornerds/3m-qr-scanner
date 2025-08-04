import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StoreManagement from './admin/StoreManagement';
import ProductManagement from './admin/ProductManagement';
import Dashboard from './admin/Dashboard';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 탭 변경 시 모바일에서 사이드바 닫기
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'stores':
        return <StoreManagement />;
      case 'products':
        return <ProductManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="admin-container">
      {/* 모바일 헤더 (햄버거 메뉴) */}
      {isMobile && (
        <div style={{
          backgroundColor: '#dc3545',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <i className="fas fa-bars"></i>
          </button>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            3M 관리자
          </h1>
          <div style={{ width: '28px' }}></div> {/* 균형을 위한 공간 */}
        </div>
      )}

      {/* 오버레이 (모바일에서 사이드바가 열렸을 때) */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}

      <div style={{ 
        display: 'flex', 
        minHeight: isMobile ? 'calc(100vh - 64px)' : '100vh',
        backgroundColor: '#f5f5f5',
        position: 'relative'
      }}>
        {/* 사이드바 */}
        <div style={{
          width: isMobile ? '280px' : '280px',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          padding: '20px 0',
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
          position: isMobile ? 'fixed' : 'static',
          top: isMobile ? '64px' : '0',
          left: isMobile ? (sidebarOpen ? '0' : '-280px') : '0',
          height: isMobile ? 'calc(100vh - 64px)' : 'auto',
          zIndex: 999,
          transition: 'left 0.3s ease',
          overflowY: 'auto'
        }}>
          {!isMobile && (
            <div style={{
              padding: '0 20px 20px',
              borderBottom: '1px solid #e0e0e0',
              marginBottom: '20px'
            }}>
              <h2 style={{
                color: '#dc3545',
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                3M 관리자
              </h2>
            </div>
          )}

          {/* 네비게이션 메뉴 */}
          <nav>
            <div
              onClick={() => handleTabChange('dashboard')}
              style={{
                padding: '15px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'dashboard' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'dashboard' ? '#1976d2' : '#333',
                borderLeft: activeTab === 'dashboard' ? '4px solid #1976d2' : '4px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fas fa-chart-line" style={{ fontSize: '16px' }}></i>
              <span>대시보드</span>
            </div>

            <div
              onClick={() => handleTabChange('stores')}
              style={{
                padding: '15px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'stores' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'stores' ? '#1976d2' : '#333',
                borderLeft: activeTab === 'stores' ? '4px solid #1976d2' : '4px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fas fa-store" style={{ fontSize: '16px' }}></i>
              <span>매장 관리</span>
            </div>

            <div
              onClick={() => handleTabChange('products')}
              style={{
                padding: '15px 20px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'products' ? '#e3f2fd' : 'transparent',
                color: activeTab === 'products' ? '#1976d2' : '#333',
                borderLeft: activeTab === 'products' ? '4px solid #1976d2' : '4px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fas fa-box" style={{ fontSize: '16px' }}></i>
              <span>제품 관리</span>
            </div>
          </nav>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          margin: isMobile ? '16px' : '20px',
          marginLeft: isMobile ? '16px' : '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {renderContent()}
        </div>
      </div>

      {/* CSS 스타일 */}
      <style jsx>{`
        .admin-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        @media (max-width: 768px) {
          .admin-container {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPage; 