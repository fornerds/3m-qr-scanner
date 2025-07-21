import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const InventoryReportPage = () => {
  const navigate = useNavigate();

  const inventoryData = [
    {
      productCode: '3M-ADH-001',
      productName: '3M 다목적 접착제',
      priority: '높음',
      status: '미진열'
    },
    {
      productCode: '3M-SPG-002',
      productName: '3M 접착 스펀지',
      priority: '높음',
      status: '미구비'
    },
    {
      productCode: 'KIT-CLN-007',
      productName: '주방 청소용품 세트',
      priority: '높음',
      status: '미구비'
    },
    {
      productCode: 'KTC-UTL-010',
      productName: '주방용 조리도구 세트',
      priority: '높음',
      status: '미구비'
    },
    {
      productCode: 'KTC-UTL-010',
      productName: '주방용 조리도구 세트',
      priority: '높음',
      status: '미구비'
    },
    {
      productCode: '3M-CLN-003',
      productName: '3M 글래스 클리너',
      priority: '보통',
      status: '미진열'
    },
    {
      productCode: '3M-PST-004',
      productName: '3M 포스트잇 노트',
      priority: '보통',
      status: '미구비'
    },
    {
      productCode: 'ORG-STR-008',
      productName: '수납정리함 대형',
      priority: '보통',
      status: '미구비'
    },
    {
      productCode: '3M-TPE-005',
      productName: '3M 양면테이프',
      priority: '낮음',
      status: '미진열'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '높음': return '#dc3545';
      case '보통': return '#ffc107';
      case '낮음': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '미구비': return '#dc3545';
      case '미진열': return '#ffc107';
      default: return '#6c757d';
    }
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
          재고 현황 보고서
        </h1>
        <div style={{
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          ↓
        </div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 60px)', paddingBottom: '100px' }}>
        {/* 매장 정보 */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px 20px',
          borderBottom: '1px solid #f0f0f0'
        }}>
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

        {/* 미진열 상품 현황 */}
        <div style={{
          backgroundColor: 'white',
          margin: '16px',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '2px solid #f0f0f0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              미진열 상품 (1,091)
            </h3>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 2.5fr 1fr 1fr',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#495057'
          }}>
            <div>상품코드</div>
            <div>품목명</div>
            <div>우선순위</div>
            <div>상태</div>
          </div>

          {/* 테이블 데이터 */}
          {inventoryData.map((item, index) => (
            <div 
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 2.5fr 1fr 1fr',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: index < inventoryData.length - 1 ? '1px solid #f0f0f0' : 'none',
                fontSize: '12px',
                alignItems: 'center'
              }}
            >
              <div style={{ color: '#495057', fontWeight: '500' }}>
                {item.productCode}
              </div>
              <div style={{ color: '#333', fontWeight: '500' }}>
                {item.productName}
              </div>
              <div>
                <span style={{
                  backgroundColor: getPriorityColor(item.priority),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  {item.priority}
                </span>
              </div>
              <div>
                <span style={{
                  color: getStatusColor(item.status),
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 정보 */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '12px',
          color: '#999'
        }}>
          <p style={{ margin: '0 0 4px 0' }}>
            보고서 생성일: 2025년 7월 18일 오후 01:41
          </p>
          <p style={{ margin: 0 }}>
            총 항목 수: 1,091개
          </p>
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

export default InventoryReportPage; 