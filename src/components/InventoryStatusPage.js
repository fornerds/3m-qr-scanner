import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const InventoryStatusPage = () => {
  const navigate = useNavigate();

  // 높은 우선순위 (미구비 품목)
  const highPriorityItems = [
    { name: '3M 다목적 접착제', code: '재고 18개', time: '3일 전' },
    { name: '3M 청소용 스펀지', code: '예상 재고 25개', time: '5일 전' },
    { name: '3M 글래스 클리너', code: '예상 재고 9개', time: '4일 전' },
    { name: '3M 글래스 클리너', code: '예상 재고 9개', time: '4일 전' }
  ];

  // 보통 우선순위
  const mediumPriorityItems = [
    { name: '3M 포스트잇 노트', code: '예상 재고 12개', time: '1주일 전' },
    { name: '3M 양면테이프', code: '예상 재고 8개', time: '1주일 전' }
  ];

  // 낮은 우선순위
  const lowPriorityItems = [
    { name: '3M 보온 단열재', code: '예상 재고 6개', time: '2주일 전' }
  ];

  const PrioritySection = ({ title, items, bgColor, textColor, badgeColor, icon }) => (
    <div style={{ marginBottom: '16px' }}>
      {/* 섹션 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        paddingLeft: '16px'
      }}>
        {icon && (
          <i className={icon} style={{
            color: textColor,
            fontSize: '14px',
            marginRight: '8px'
          }}></i>
        )}
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 'bold',
          color: textColor
        }}>
          {title}
        </h3>
      </div>

      {/* 품목 리스트 */}
      {items.map((item, index) => (
        <div 
          key={index}
          style={{
            backgroundColor: bgColor,
            margin: '0 16px 8px 16px',
            padding: '16px',
            borderRadius: '12px'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                {item.name}
              </h4>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '14px',
                color: '#666'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fas fa-box" style={{ fontSize: '12px' }}></i>
                  {item.code}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
                  {item.time}
                </span>
              </div>
            </div>
            <span style={{
              backgroundColor: badgeColor,
              color: 'white',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '16px',
              fontWeight: '500',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              {title.includes('미구비') ? '높음' : title.includes('보통') ? '보통' : '낮음'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      width: '100%',
      maxWidth: '414px',
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
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
            marginRight: '12px'
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
      </div>

      <div style={{ backgroundColor: '#ffffff', paddingBottom: '100px' }}>
        {/* 매장 정보 및 통계 */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderBottom: '8px solid #f5f5f5',
          position: 'relative'
        }}>
          {/* 보고서 아이콘 */}
          <Link
            to="/inventory-report"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              backgroundColor: '#dc3545',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-file-alt" style={{
              color: 'white',
              fontSize: '16px'
            }}></i>
          </Link>

          <div style={{
            marginBottom: '16px',
            paddingRight: '60px'
          }}>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '18px',
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

          {/* 통계 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
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
                fontSize: '20px',
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
                fontSize: '20px',
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
          </div>

          {/* 진행률 */}
          <div>
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
              height: '6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '13%',
                height: '100%',
                backgroundColor: '#dc3545',
                borderRadius: '3px'
              }}></div>
            </div>
          </div>
        </div>

        {/* 우선순위별 섹션 */}
        <div style={{ padding: '16px 0' }}>
          <PrioritySection
            title="높은 우선순위"
            items={highPriorityItems}
            bgColor="#fff5f5"
            textColor="#dc3545"
            badgeColor="#dc3545"
          />

          <PrioritySection
            title="보통 우선순위"
            items={mediumPriorityItems}
            bgColor="#fffbf0"
            textColor="#ffc107"
            badgeColor="#ffc107"
            icon="fas fa-exclamation-triangle"
          />

          <PrioritySection
            title="낮은 우선순위"
            items={lowPriorityItems}
            bgColor="#f0fff4"
            textColor="#28a745"
            badgeColor="#28a745"
            icon="fas fa-check-circle"
          />
        </div>
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
        <Link to="/scan" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default InventoryStatusPage; 