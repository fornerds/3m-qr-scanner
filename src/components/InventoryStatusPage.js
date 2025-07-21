import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const InventoryStatusPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('missing');

  const missingItems = [
    { name: '3M 다목적 접착제', code: '재고 18개', time: '3일 전', status: '높음' },
    { name: '3M 청소용 스펀지', code: '예상 재고 25개', time: '5일 전', status: '높음' },
    { name: '3M 글래스 클리너', code: '예상 재고 9개', time: '4일 전', status: '높음' },
    { name: '3M 글래스 클리너', code: '예상 재고 9개', time: '4일 전', status: '높음' }
  ];

  const lowStockItems = [
    { name: '3M 포스트잇 노트', code: '예상 재고 12개', time: '1주일 전', status: '보통' },
    { name: '3M 양면테이프', code: '예상 재고 8개', time: '1주일 전', status: '보통' }
  ];

  const normalItems = [
    { name: '3M 보온 단열재', code: '예상 재고 6개', time: '2주일 전', status: '낮음' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case '높음': return '#dc3545';
      case '보통': return '#ffc107';
      case '낮음': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case '높음': return '#fff5f5';
      case '보통': return '#fffbf0';
      case '낮음': return '#f0fff4';
      default: return '#f8f9fa';
    }
  };

  const getCurrentItems = () => {
    if (activeTab === 'missing') return missingItems;
    if (activeTab === 'lowstock') return lowStockItems;
    return normalItems;
  };

  const getCurrentTitle = () => {
    if (activeTab === 'missing') return '높은 우선순위';
    if (activeTab === 'lowstock') return '보통 우선순위';
    return '낮은 우선순위';
  };

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
          onClick={() => navigate(-1)}
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
          재고 현황
        </h1>
        <div style={{
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          ↓
        </div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 120px)' }}>
        {/* 매장 정보 및 통계 */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderBottom: '8px solid #f5f5f5'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                다이소 강남점
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#666'
              }}>
                서울 강남구 테헤란로 123
              </p>
            </div>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#ffe6e6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #dc3545'
            }}>
                          <i className="fas fa-store" style={{
              fontSize: '20px',
              color: '#dc3545'
            }}></i>
            </div>
          </div>

          {/* 통계 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#007bff',
                marginBottom: '4px'
              }}>
                150
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                전체 품목수
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#28a745',
                marginBottom: '4px'
              }}>
                50
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                스캔 완료
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#fd7e14',
                marginBottom: '4px'
              }}>
                60
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                미진열
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#dc3545',
                marginBottom: '4px'
              }}>
                40
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                미구비
              </div>
            </div>
          </div>

          {/* 진행률 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>진행률</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc3545' }}>13%</span>
            </div>
            <div style={{
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '13%',
                height: '100%',
                backgroundColor: '#dc3545',
                borderRadius: '4px'
              }}></div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div style={{
          backgroundColor: 'white',
          display: 'flex',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <button
            onClick={() => setActiveTab('missing')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'missing' ? 'bold' : 'normal',
              color: activeTab === 'missing' ? '#dc3545' : '#666',
              borderBottom: activeTab === 'missing' ? '2px solid #dc3545' : 'none',
              cursor: 'pointer'
            }}
          >
            미진열 재고 (100)
          </button>
          <button
            onClick={() => setActiveTab('lowstock')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: activeTab === 'lowstock' ? 'bold' : 'normal',
              color: activeTab === 'lowstock' ? '#dc3545' : '#666',
              borderBottom: activeTab === 'lowstock' ? '2px solid #dc3545' : 'none',
              cursor: 'pointer'
            }}
          >
            미구비 품목 (90)
          </button>
        </div>

        {/* 우선순위 섹션 */}
        <div style={{
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: getStatusColor(activeTab === 'missing' ? '높음' : activeTab === 'lowstock' ? '보통' : '낮음'),
              borderRadius: '50%',
              marginRight: '8px'
            }}></div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {getCurrentTitle()}
            </h3>
          </div>

          {getCurrentItems().map((item, index) => (
            <div 
              key={index}
              style={{
                padding: '16px 20px',
                borderBottom: index < getCurrentItems().length - 1 ? '1px solid #f5f5f5' : 'none',
                backgroundColor: getStatusBgColor(item.status)
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {item.name}
                  </h4>
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    {item.code}
                  </p>
                  <div style={{
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    {item.time}
                  </div>
                </div>
                <div>
                  <span style={{
                    backgroundColor: getStatusColor(item.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
            color: '#dc3545',
            backgroundColor: '#ffeaea'
          }}
        >
          <i className="fas fa-qrcode" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>QR스캔</div>
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
            color: '#999'
          }}
        >
          <i className="fas fa-cog" style={{ fontSize: '18px', marginBottom: '2px' }}></i>
          <div style={{ fontSize: '11px' }}>설정</div>
        </Link>
      </div>
    </div>
  );
};

export default InventoryStatusPage; 