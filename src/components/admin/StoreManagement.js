import React, { useState, useEffect } from 'react';

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
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
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores');
      const result = await response.json();
      
      // 새 API 응답 형태 처리: {success: true, data: [...]}
      const storesData = result.success ? result.data : result;
      setStores(Array.isArray(storesData) ? storesData : []);
    } catch (error) {
      console.error('매장 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력 데이터 검증
    if (!formData.name.trim() || !formData.address.trim()) {
      alert('매장명과 주소는 필수 입력 항목입니다.');
      return;
    }
    
    try {
      const url = editingStore 
        ? `/api/stores?storeId=${editingStore.id}` 
        : '/api/stores';
      
      const method = editingStore ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddForm(false);
        setEditingStore(null);
        setFormData({ name: '', address: '' });
        fetchStores(); // 목록 새로고침 (최신 매장이 상단에 표시됨)
        alert(result.message || (editingStore ? '매장이 수정되었습니다.' : '매장이 추가되었습니다.'));
      } else {
        // 상세한 오류 메시지 표시
        alert(result.message || '오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('매장 저장 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address
    });
    setShowAddForm(true);
  };

  const handleDelete = async (storeId) => {
    const store = stores.find(s => s.id === storeId);
    const storeName = store ? store.name : `매장 ID: ${storeId}`;
    
    const confirmMessage = `정말로 "${storeName}"을(를) 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없으며, 관련된 모든 스캔 기록과 세션 데이터가 함께 삭제됩니다.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/stores?storeId=${storeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchStores();
        alert('매장이 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(errorData.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('매장 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingStore(null);
    setFormData({ name: '', address: '' });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>매장 목록을 불러오는 중...</div>
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
            매장 관리
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: isMobile ? '14px' : '16px'
          }}>
            매장 정보를 관리합니다
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
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
          <i className="fas fa-plus"></i>
          새 매장 추가
        </button>
      </div>

      {/* 매장 추가/수정 폼 */}
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
            {editingStore ? '매장 수정' : '새 매장 추가'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: isMobile ? '15px' : '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                매장명 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="매장명을 입력하세요"
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
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: isMobile ? '15px' : '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                주소 *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="주소를 입력하세요"
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

            
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '12px'
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
                  flex: isMobile ? '1' : 'none',
                  minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                {editingStore ? '수정' : '추가'}
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
                  flex: isMobile ? '1' : 'none',
                  minHeight: isMobile ? '48px' : 'auto'
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 매장 목록 */}
      <div>
        <h2 style={{
          fontSize: isMobile ? '18px' : '20px',
          color: '#333',
          marginBottom: isMobile ? '16px' : '20px'
        }}>
          매장 목록
        </h2>
        
        {stores.length > 0 ? (
          isMobile ? (
            // 모바일: 카드 형태
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {stores.map((store) => (
                <div key={store.id} style={{
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
                        {store.name}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {store.address}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px'
                  }}>
                    <button
                      onClick={() => handleEdit(store)}
                      style={{
                        backgroundColor: '#007bff',
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
                        flex: 1,
                        minHeight: '44px'
                      }}
                    >
                      <i className="fas fa-edit"></i>
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
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
                        flex: 1,
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
              overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e0e0e0',
                fontWeight: '500',
                fontSize: '14px',
                color: '#333'
              }}>
                <div>매장명</div>
                <div>주소</div>
                <div>관리</div>
              </div>
              
              {stores.map((store) => (
                <div key={store.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e0e0e0',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                    {store.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {store.address}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => handleEdit(store)}
                      style={{
                        backgroundColor: '#007bff',
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
                      <i className="fas fa-edit"></i>
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
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
              매장
            </div>
            <div style={{ fontSize: isMobile ? '14px' : '16px' }}>
              등록된 매장이 없습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManagement; 