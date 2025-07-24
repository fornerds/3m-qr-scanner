import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StoreManagement from './admin/StoreManagement';
import ProductManagement from './admin/ProductManagement';
import Dashboard from './admin/Dashboard';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 사이드바 */}
      <div style={{
        width: '280px',
        backgroundColor: 'white',
        borderRight: '1px solid #e0e0e0',
        padding: '20px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
      }}>
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

        {/* 네비게이션 메뉴 */}
        <nav>
          <div
            onClick={() => setActiveTab('dashboard')}
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
            onClick={() => setActiveTab('stores')}
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
            onClick={() => setActiveTab('products')}
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
        margin: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPage; 