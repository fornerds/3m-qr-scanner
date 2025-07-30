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

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores');
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error('매장 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      if (response.ok) {
        setShowAddForm(false);
        setEditingStore(null);
        setFormData({ name: '', address: '' });
        fetchStores();
        alert(editingStore ? '매장이 수정되었습니다.' : '매장이 추가되었습니다.');
      } else {
        alert('오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('매장 저장 오류:', error);
      alert('오류가 발생했습니다.');
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
    <div style={{ padding: '30px' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            color: '#333',
            fontWeight: 'bold'
          }}>
            매장 관리
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            color: '#666',
            fontSize: '16px'
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
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s'
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
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            color: '#333'
          }}>
            {editingStore ? '매장 수정' : '새 매장 추가'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
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
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
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
          fontSize: '20px',
          color: '#333',
          marginBottom: '20px'
        }}>
          매장 목록
        </h2>
        
        {stores.length > 0 ? (
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
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            등록된 매장이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManagement; 