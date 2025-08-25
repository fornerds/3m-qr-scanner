import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const InventoryReportPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '1';
  
  const [reportData, setReportData] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 판매순위에 따른 우선순위 계산 함수
  const calculatePriority = useCallback((rank) => {
    if (rank <= 20) return 'high';
    if (rank <= 60) return 'medium';
    return 'low';
  }, []);

  // 전체 제품 현황 (진열 + 미진열) 표시
  const allProducts = useMemo(() => {
    if (!reportData || !reportData.data) return [];
    
    const allItems = [];
    
    // 미진열 제품 추가
    const missingData = reportData.data.find(item => item._id === 'missing');
    if (missingData) {
      missingData.items.forEach(item => {
        const apiRank = item.rank || 1;
        const apiPriority = item.priority || calculatePriority(apiRank);
        
        allItems.push({
          productCode: item.sku,
          productName: item.name,
          priority: apiPriority,
          status: 'not_displayed',
          estimatedStock: item.estimatedStock || 0,
          price: item.price || 0,
          category: item.category || '',
          rank: apiRank,
          salesAvg: item.salesAvg || 0,
          lastScanned: null
        });
      });
    }
    
    // 스캔된(진열된) 제품 추가
    const scannedData = reportData.data.find(item => item._id === 'scanned');
    if (scannedData) {
      scannedData.items.forEach(item => {
        const apiRank = item.rank || 1;
        const apiPriority = item.priority || calculatePriority(apiRank);
        
        allItems.push({
          productCode: item.sku,
          productName: item.name,
          priority: apiPriority,
          status: 'displayed',
          estimatedStock: item.estimatedStock || 0,
          price: item.price || 0,
          category: item.category || '',
          rank: apiRank,
          salesAvg: item.salesAvg || 0,
          lastScanned: item.lastScanned
        });
      });
    }
    
    // 판매순위로 정렬
    return allItems.sort((a, b) => a.rank - b.rank);
  }, [reportData, calculatePriority]);

  // API에서 보고서 데이터와 매장 정보 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 병렬로 보고서 데이터와 매장 정보 가져오기
        const [reportResponse, storeResponse] = await Promise.all([
          fetch(`/api/inventory-report?storeId=${storeId}`),
          fetch(`/api/stores`)
        ]);
        
        if (!reportResponse.ok) {
          throw new Error('보고서 데이터를 가져올 수 없습니다.');
        }
        
        const reportData = await reportResponse.json();
        setReportData(reportData);
        
        if (storeResponse.ok) {
          const storesData = await storeResponse.json();
          const stores = storesData.data || storesData.stores || [];
          
          console.log('매장 데이터 조회:', { storeId, storesLength: stores.length });
          console.log('첫 번째 매장 샘플:', stores[0]);
          
          // 여러 방식으로 매장 찾기 시도
          let currentStore = stores.find(store => store._id === storeId) ||
                           stores.find(store => store._id === parseInt(storeId)) ||
                           stores.find(store => store.id === storeId) ||
                           stores.find(store => store.id === parseInt(storeId)) ||
                           stores.find(store => String(store._id) === storeId) ||
                           stores.find(store => String(store.id) === storeId);
          
          console.log('찾은 매장:', currentStore);
          
          if (currentStore) {
            setStoreInfo(currentStore);
          } else {
            // 매장을 찾지 못한 경우, 사용 가능한 매장 ID 범위 로그
            const storeIds = stores.map(s => s._id || s.id).slice(0, 10);
            console.warn(`매장 ID ${storeId}를 찾을 수 없음. 사용 가능한 ID (처음 10개):`, storeIds);
            
            // 기본값으로 첫 번째 매장 사용하거나 정보 없음 표시
            if (stores.length > 0) {
              const fallbackStore = stores.find(s => s._id === '1' || s.id === '1') || stores[0];
              console.log(`기본 매장으로 변경:`, fallbackStore);
              setStoreInfo({
                name: `${fallbackStore.name || '매장'} (ID: ${storeId} → ${fallbackStore._id || fallbackStore.id})`,
                address: fallbackStore.address || '주소 정보 없음'
              });
            } else {
              setStoreInfo({
                name: `매장 ID: ${storeId} (데이터 없음)`,
                address: '주소 정보 없음'
              });
            }
          }
        } else {
          console.error('매장 데이터 조회 실패:', storeResponse.status, storeResponse.statusText);
          setStoreInfo({
            name: '매장 정보 없음',
            address: '주소 정보 없음'
          });
        }
      } catch (err) {
        console.error('데이터 조회 오류:', err);
        setError(err.message);
        
        // 오류 시 기본값 설정
        setReportData({
          data: [],
          summary: {
            totalItems: 0,
            scannedItems: 0,
            missingItems: 0,
            completionRate: 0,
            reportGeneratedAt: new Date().toISOString()
          }
        });
        setStoreInfo({
          name: '매장 정보 없음',
          address: '주소 정보 없음'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  const downloadPDF = () => {
    if (!reportData) {
      alert('보고서 데이터가 없습니다.');
      return;
    }

    // 모바일에서 다운로드 확인 다이얼로그
    const confirmDownload = window.confirm('보고서 파일로 다운로드하시겠습니까?');
    if (!confirmDownload) {
      return;
    }

    try {
      // 현재 페이지의 HTML을 기반으로 보고서 생성
      const printContent = document.querySelector('.mobile-container').cloneNode(true);
      
      // 헤더의 버튼들 제거 (PDF에서는 불필요)
      const buttons = printContent.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());
      
      // 네비게이션 제거
      const nav = printContent.querySelector('div[style*="position: fixed"]');
      if (nav) nav.remove();

      // HTML 문서 생성
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${storeInfo?.name || '매장'} - 재고 현황 보고서</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
              line-height: 1.6;
            }
            .mobile-container { 
              max-width: 800px; 
              margin: 0 auto;
              box-shadow: none;
            }
            h1, h2, h3 { 
              color: #333; 
              margin: 20px 0 10px 0;
            }
            .priority-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              color: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              * { -webkit-print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; color: #dc3545; margin-bottom: 30px;">
            ${storeInfo?.name || '매장'} 재고 현황 보고서
          </h1>
          <div style="text-align: center; margin-bottom: 30px; color: #666;">
            생성일시: ${new Date().toLocaleString('ko-KR')}
          </div>
          ${printContent.outerHTML}
        </body>
        </html>
      `;

      // Blob으로 파일 생성
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      
      // 다운로드 링크 생성
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${storeInfo?.name || '매장'}_재고보고서_${new Date().toISOString().split('T')[0]}.html`;
      
      // 다운로드 실행
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // URL 해제
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // 성공 메시지
      alert('보고서가 다운로드되었습니다.');
      
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
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
          padding: '16px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
              position: 'absolute',
              left: '16px'
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
  }

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
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            position: 'absolute',
            left: '16px'
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
          미진열 현황 보고서
        </h1>
        <button 
          onClick={downloadPDF}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '8px',
            position: 'absolute',
            right: '16px'
          }}
          title="PDF 다운로드"
        >
          <i className="fas fa-file-pdf"></i>
        </button>
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
            {storeInfo?.name || '매장명'}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666'
          }}>
            {storeInfo?.address || '주소 정보 없음'}
          </p>
        </div>

        {/* 재고 현황 */}
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
              전체 상품 ({reportData?.summary?.totalItems || 0})
            </h3>
            <div style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '4px'
            }}>
              미진열: {reportData?.summary?.missingItems || 0}개 | 
              진열완료: {reportData?.summary?.scannedItems || 0}개
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
            <div>판매<br/>순위</div>
            <div>우선<br/>순위</div>
            <div>상태</div>
          </div>

          {/* 테이블 데이터 */}
                      {allProducts.map((item, index) => {
            return (
              <div 
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 0.8fr',
                  gap: '8px',
                  padding: '12px 16px',
                  borderBottom: index < allProducts.length - 1 ? '1px solid #f0f0f0' : 'none',
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
                    {item.rank}위
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
            보고서 생성일: {reportData?.summary?.reportGeneratedAt ? 
              new Date(reportData.summary.reportGeneratedAt).toLocaleString('ko-KR', {
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
            총 항목 수: {reportData?.summary?.totalItems || 0}개
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
        <Link to="/store-select" style={{ textDecoration: 'none', color: '#666', textAlign: 'center' }}>
          <i className="fas fa-qrcode" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}></i>
          <span style={{ fontSize: '12px' }}>스캔</span>
        </Link>
      </div>
    </div>
  );
};

export default InventoryReportPage; 