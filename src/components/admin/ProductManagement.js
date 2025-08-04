import React, { useState, useEffect } from 'react';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    subCategory: '',
    price: 0,
    salesRep: '',
    salesAvg: 0
  });
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const data = await response.json();
      console.log('API 응답:', data); // 디버깅용
      setProducts(data.products || data); // API 응답 구조에 맞게 수정
    } catch (error) {
      console.error('제품 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddForm(false);
        setFormData({ name: '', sku: '', category: '', subCategory: '', price: 0, salesRep: '', salesAvg: 0 });
        fetchProducts();
        alert('제품이 추가되었습니다.');
      } else {
        alert('오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('제품 추가 오류:', error);
      alert('오류가 발생했습니다.');
    }
  };

  const handleDelete = async (productId, productSku) => {
    const product = products.find(p => (p._id || p.id) === productId);
    const productName = product ? product.name : `SKU: ${productSku}`;
    
    const confirmMessage = `정말로 "${productName}"을(를) 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없습니다.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        fetchProducts();
        alert(data.message || '제품이 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(errorData.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('제품 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Excel 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    if (!window.confirm(`"${file.name}" 파일을 업로드하시겠습니까?\n\n파일 구조:\n- No: 순번\n- 다이소 대분류: 카테고리\n- 다이소 소분류: 서브카테고리\n- DAISO SKU ID: 제품코드\n- DAISO SKU Name: 제품명\n- 판매가 (VAT+): 가격\n- 6YTD AVG: 평균 판매량`)) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchProducts();
        const summary = result.summary;
        alert(`제품 리스트가 성공적으로 업로드되었습니다!\n\n처리 결과:\n- 총 처리: ${summary.totalProcessed}개\n- 새 제품: ${summary.newProducts}개\n- 업데이트: ${summary.updatedProducts}개`);
      } else {
        alert(`업로드 중 오류가 발생했습니다: ${result.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('업로드 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({ name: '', sku: '', category: '', subCategory: '', price: 0, salesRep: '', salesAvg: 0 });
  };

  const handleCleanupData = async () => {
    if (!window.confirm('중복된 제품 데이터를 정리하시겠습니까?\n\n이 작업은 다음을 수행합니다:\n- 잘못된 데이터 삭제 (헤더 행 등)\n- SKU 중복 제거\n- displayOrder 재정렬\n\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/cleanup-products', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        fetchProducts();
        const summary = result.summary;
        alert(`데이터 정리 완료!\n\n처리 결과:\n- 잘못된 데이터 삭제: ${summary.invalidDataRemoved}개\n- 중복 데이터 삭제: ${summary.duplicateDataRemoved}개\n- 정리 후 총 제품 수: ${summary.totalProductsAfterCleanup}개\n- displayOrder 업데이트: ${summary.displayOrderUpdated}개`);
      } else {
        alert(`데이터 정리 중 오류가 발생했습니다: ${result.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('데이터 정리 오류:', error);
      alert('데이터 정리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>제품 목록을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '30px' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: isMobile ? '16px' : '20px',
        marginBottom: isMobile ? '20px' : '30px',
        gap: isMobile ? '16px' : '0'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '24px' : '28px',
            color: '#333',
            fontWeight: 'bold'
          }}>
            제품 관리
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: isMobile ? '14px' : '16px'
          }}>
            제품 정보를 관리합니다
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px'
        }}>
          <button
            onClick={handleCleanupData}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: isMobile ? '16px 24px' : '12px 24px',
              borderRadius: '6px',
              fontSize: isMobile ? '16px' : '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
              minHeight: isMobile ? '48px' : 'auto'
            }}
          >
            <i className="fas fa-broom"></i>
            데이터 정리
          </button>
          
          <label style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: isMobile ? '16px 24px' : '12px 24px',
            borderRadius: '6px',
            fontSize: isMobile ? '16px' : '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
            minHeight: isMobile ? '48px' : 'auto'
          }}>
            <i className="fas fa-upload"></i>
            제품리스트 파일 업로드
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: isMobile ? '16px 24px' : '12px 24px',
              borderRadius: '6px',
              fontSize: isMobile ? '16px' : '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
              minHeight: isMobile ? '48px' : 'auto'
            }}
          >
            <i className="fas fa-plus"></i>
            새 제품 추가
          </button>
        </div>
      </div>

      {/* 제품 추가 폼 */}
      {showAddForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: isMobile ? '20px' : '24px',
          borderRadius: '8px',
          marginBottom: isMobile ? '20px' : '30px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: isMobile ? '16px' : '18px',
            color: '#333'
          }}>
            새 제품 추가
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: isMobile ? '15px' : '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  제품명 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="제품명을 입력하세요"
                  required
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px' : '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: isMobile ? '16px' : '14px',
                    boxSizing: 'border-box',
                    minHeight: isMobile ? '48px' : 'auto'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: isMobile ? '15px' : '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  제품 코드 (SKU) *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="제품 코드를 입력하세요"
                  required
                  style={{
                    width: '100%',
                    padding: isMobile ? '16px' : '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: isMobile ? '16px' : '14px',
                    boxSizing: 'border-box',
                    minHeight: isMobile ? '48px' : 'auto'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  카테고리
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="카테고리를 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  서브카테고리
                </label>
                <input
                  type="text"
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  placeholder="서브카테고리를 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  가격
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  placeholder="가격을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  담당자
                </label>
                <input
                  type="text"
                  value={formData.salesRep}
                  onChange={(e) => setFormData({ ...formData, salesRep: e.target.value })}
                  placeholder="담당자를 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  평균 판매량
                </label>
                <input
                  type="number"
                  value={formData.salesAvg}
                  onChange={(e) => setFormData({ ...formData, salesAvg: parseInt(e.target.value) || 0 })}
                  placeholder="평균 판매량을 입력하세요"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px'
            }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '16px 24px' : '12px 24px',
                  borderRadius: '6px',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                추가
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '16px 24px' : '12px 24px',
                  borderRadius: '6px',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 제품 목록 */}
      <div>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          color: '#333',
          marginBottom: isMobile ? '16px' : '20px'
        }}>
          제품 관리
        </h2>
        
        {products.length > 0 ? (
          isMobile ? (
            // 모바일: 간단한 리스트 형태
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {products.map((product) => (
                <div key={product._id || product.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#333',
                        marginBottom: '4px',
                        wordBreak: 'break-word'
                      }}>
                        {product.name}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        SKU: {product.sku}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        카테고리: {product.category}
                      </div>
                      <div style={{ 
                        fontSize: '15px', 
                        fontWeight: '600',
                        color: '#dc3545'
                      }}>
                        {product.price?.toLocaleString() || 0}원
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: '12px'
                  }}>
                    <button
                      onClick={() => handleDelete(product._id || product.id, product.sku)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        minHeight: '44px'
                      }}
                    >
                      <i className="fas fa-trash"></i>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 데스크톱: 테이블 형태
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
              overflow: 'auto',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e0e0e0',
              fontWeight: '500',
              fontSize: '14px',
                color: '#333',
                minWidth: '800px'
            }}>
              <div>제품명</div>
              <div>SKU</div>
              <div>카테고리</div>
              <div>서브카테고리</div>
              <div>가격</div>
              <div>평균 판매량</div>
              <div>작업</div>
            </div>
            
            {products.map((product) => (
              <div key={product._id || product.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto',
                padding: '16px 20px',
                borderBottom: '1px solid #e0e0e0',
                  alignItems: 'center',
                  minWidth: '800px'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {product.sku}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {product.category}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {product.subCategory}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {product.price?.toLocaleString() || 0}원
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {product.salesAvg?.toLocaleString() || 0}
                </div>
                <div>
                  <button
                    onClick={() => handleDelete(product._id || product.id, product.sku)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-trash"></i>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          )
        ) : (
          <div style={{
            padding: isMobile ? '32px 20px' : '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ 
              fontSize: isMobile ? '32px' : '36px',
              marginBottom: '12px'
            }}>
              📦
            </div>
            <div style={{ fontSize: isMobile ? '14px' : '16px' }}>
            등록된 제품이 없습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement; 