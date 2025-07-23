import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const InventoryReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '1';
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API에서 보고서 데이터 가져오기
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/inventory-report?storeId=${storeId}`);
        if (!response.ok) {
          throw new Error('보고서 데이터를 가져올 수 없습니다.');
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        console.error('보고서 데이터 조회 오류:', err);
        setError(err.message);
        
        // 오류 시 기본값 설정 (더 이상 하드코딩 데이터 사용 안함)
        setReportData({
          storeInfo: {
            id: storeId,
            name: '매장 정보 없음',
            address: '주소 정보 없음'
          },
          products: [],
          summary: {
            totalProducts: 0,
            notDisplayedCount: 0,
            displayedCount: 0,
            generatedAt: new Date().toISOString()
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [storeId]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': 
      case '높음': return '#dc3545';
      case 'medium':
      case '보통': return '#ffc107';
      case 'low':
      case '낮음': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return priority;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_displayed':
      case '미진열': return '#ffc107';
      case 'displayed':
      case '진열완료': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'not_displayed': return '미진열';
      case 'displayed': return '진열완료';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="mobile-container">
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
            재고 보고서
          </h1>
        </div>

        <div style={{ backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 110px)', paddingBottom: '80px' }}>
          {/* 로딩 상태 */}
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666'
          }}>
            보고서를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

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
            {reportData?.storeInfo?.name || '매장명'}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666'
          }}>
            {reportData?.storeInfo?.address || '주소 정보 없음'}
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
              전체 상품 ({reportData?.summary?.totalProducts || 0})
            </h3>
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '4px'
            }}>
              미진열: {reportData?.summary?.notDisplayedCount || 0}개 | 
              진열완료: {reportData?.summary?.displayedCount || 0}개
            </div>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 0.8fr',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#495057'
          }}>
            <div>상품코드</div>
            <div>품목명</div>
            <div>판매순위</div>
            <div>우선순위</div>
            <div>상태</div>
          </div>

          {/* 테이블 데이터 */}
          {reportData?.products?.map((item, index) => {
            const rank = getProductRank(item.productCode);
            return (
              <div 
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 0.8fr',
                  gap: '8px',
                  padding: '12px 16px',
                  borderBottom: index < reportData.products.length - 1 ? '1px solid #f0f0f0' : 'none',
                  fontSize: '11px',
                  alignItems: 'center'
                }}
              >
                <div style={{ color: '#495057', fontWeight: '500' }}>
                  {item.productCode}
                </div>
                <div style={{ color: '#333', fontWeight: '500', fontSize: '12px' }}>
                  {item.productName}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: '#f8f9fa',
                    color: '#495057',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
                    {rank}위
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: getPriorityColor(item.priority),
                    color: 'white',
                    padding: '3px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {getPriorityText(item.priority)}
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    color: getStatusColor(item.status),
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {getStatusText(item.status)}
                  </span>
                </div>
              </div>
            );
          }) || []}
        </div>

        {/* 하단 정보 */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '12px',
          color: '#999'
        }}>
          <p style={{ margin: '0 0 4px 0' }}>
            보고서 생성일: {reportData?.summary?.generatedAt ? 
              new Date(reportData.summary.generatedAt).toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 
              '정보 없음'
            }
          </p>
          <p style={{ margin: 0 }}>
            총 항목 수: {reportData?.summary?.totalProducts || 0}개
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