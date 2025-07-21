import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();

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
          설정
        </h1>
        <div style={{ width: '24px' }}></div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 120px)' }}>
        {/* 3M 로고 및 타이틀 */}
        <div style={{
          backgroundColor: 'white',
          padding: '60px 20px 40px',
          textAlign: 'center'
        }}>
          {/* 3M 원형 로고 */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#dc3545',
            borderRadius: '50%',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            3M
          </div>

          <h2 style={{
            margin: '0 0 40px 0',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            3M QR 스캐너
          </h2>
        </div>

        {/* 정보 섹션 */}
        <div style={{
          backgroundColor: 'white',
          margin: '20px 16px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              color: '#333'
            }}>
              정보
            </h3>
          </div>

          {/* 앱 정보 */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
                           <i className="fas fa-info-circle" style={{
               fontSize: '16px',
               color: '#666'
             }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                color: '#333',
                marginBottom: '2px'
              }}>
                앱 정보
              </div>
              <div style={{
                fontSize: '13px',
                color: '#666'
              }}>
                버전 1.0.0
              </div>
            </div>
            <div style={{
              color: '#ccc',
              fontSize: '16px'
            }}>
              &gt;
            </div>
          </div>

          <div style={{
            height: '1px',
            backgroundColor: '#f5f5f5',
            margin: '0 20px'
          }}></div>

          {/* 고객 지원 */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
                           <i className="fas fa-headset" style={{
               fontSize: '16px',
               color: '#666'
             }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                color: '#333',
                marginBottom: '2px'
              }}>
                고객 지원
              </div>
              <div style={{
                fontSize: '13px',
                color: '#666'
              }}>
                support@3m.com
              </div>
            </div>
            <div style={{
              color: '#ccc',
              fontSize: '16px'
            }}>
              &gt;
            </div>
          </div>

          <div style={{
            height: '1px',
            backgroundColor: '#f5f5f5',
            margin: '0 20px'
          }}></div>

          {/* 개인정보 보호 */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px'
            }}>
                           <i className="fas fa-shield-alt" style={{
               fontSize: '16px',
               color: '#666'
             }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '16px',
                color: '#333',
                marginBottom: '2px'
              }}>
                개인정보 보호
              </div>
              <div style={{
                fontSize: '13px',
                color: '#666'
              }}>
                데이터 보안
              </div>
            </div>
            <div style={{
              color: '#ccc',
              fontSize: '16px'
            }}>
              &gt;
            </div>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '414px',
        width: '100%',
        height: '60px',
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Link 
          to="/" 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: '#666'
          }}
        >
          <i className="fas fa-camera" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>촬영</div>
        </Link>
        <Link 
          to="/settings" 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: '#dc3545',
            backgroundColor: '#ffeaea'
          }}
        >
          <i className="fas fa-cog" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>설정</div>
        </Link>
      </div>
    </div>
  );
};

export default SettingsPage; 