import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ManagerPage = () => {
  const [loading, setLoading] = useState(false);
  const [productStatus, setProductStatus] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 제품 데이터 상태 확인
  const checkProductStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/init-sample-data');
      const data = await response.json();
      
      if (data.success) {
        setProductStatus(data);
      } else {
        setMessage('상태 확인 실패: ' + data.message);
      }
    } catch (error) {
      console.error('상태 확인 오류:', error);
      setMessage('상태 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 제품 데이터 초기화
  const initializeProducts = async (force = false) => {
    try {
      setInitLoading(true);
      setMessage('');
      
      const response = await fetch('/api/init-sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'init-products', force })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`${data.message} (${data.insertedCount || data.existingCount}개 제품)`);
        // 상태 재확인
        setTimeout(() => {
          checkProductStatus();
        }, 1000);
      } else {
        setMessage(`초기화 실패: ${data.message}`);
      }
    } catch (error) {
      console.error('초기화 오류:', error);
      setMessage('초기화 중 오류가 발생했습니다.');
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    checkProductStatus();
  }, []);

  return (
    <div className="mobile-container">
      {/* 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '16px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Link 
          to="/"
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            textDecoration: 'none',
            position: 'absolute',
            left: '16px'
          }}
        >
          ←
        </Link>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white'
        }}>
          관리자 페이지
        </h1>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        minHeight: 'calc(100vh - 60px)', 
        padding: '20px' 
      }}>
        {/* 제품 데이터 관리 섹션 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
            borderBottom: '2px solid #dc3545',
            paddingBottom: '8px'
          }}>
            제품 데이터 관리
          </h2>

          {/* 현재 상태 */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#495057'
            }}>
              현재 상태
            </h3>
            
            {loading ? (
              <div style={{ color: '#666' }}>상태 확인 중...</div>
            ) : productStatus ? (
              <div>
                <div style={{ 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: productStatus.initialized ? '#d4edda' : '#f8d7da',
                    color: productStatus.initialized ? '#155724' : '#721c24'
                  }}>
                    {productStatus.initialized ? 'DB 초기화됨' : 'DB 비어있음'}
                  </span>
                  <span style={{ color: '#666' }}>
                    DB: {productStatus.productCount}개 / 전체: {productStatus.availableProducts || '?'}개 제품
                  </span>
                </div>
                
                {productStatus.sampleProducts && productStatus.sampleProducts.length > 0 && (
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    <strong>샘플 제품:</strong>
                    <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                      {productStatus.sampleProducts.slice(0, 3).map((product, index) => (
                        <li key={index} style={{ marginBottom: '2px' }}>
                          {product.name} ({product.sku})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#dc3545' }}>상태를 확인할 수 없습니다.</div>
            )}
          </div>

          {/* 제품 초기화 버튼들 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <button
              onClick={() => initializeProducts(false)}
              disabled={initLoading}
              style={{
                padding: '14px 20px',
                backgroundColor: productStatus?.initialized ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: initLoading ? 'not-allowed' : 'pointer',
                opacity: initLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {initLoading ? '초기화 중...' : '제품 데이터 초기화'}
            </button>



            <button
              onClick={checkProductStatus}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              상태 새로고침
            </button>
          </div>

          {/* 메시지 표시 */}
          {message && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: message.includes('실패') || message.includes('오류') ? '#f8d7da' : '#d4edda',
              color: message.includes('실패') || message.includes('오류') ? '#721c24' : '#155724',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {message}
            </div>
          )}
        </div>

        {/* 시스템 정보 섹션 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
            borderBottom: '2px solid #dc3545',
            paddingBottom: '8px'
          }}>
            시스템 정보
          </h2>

          <div style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.6'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>앱 버전:</strong> 3M QR Scanner v1.0
            </div>
            <div>
              <strong>기능:</strong> QR 스캔, 재고 관리, 보고서 생성
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
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default ManagerPage; 