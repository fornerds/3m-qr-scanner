import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const QRTestPage = () => {
  const [qrData, setQrData] = useState('3M-ADH-001|3M 다목적 접착제|사무용품|3,500원|재고 24개');
  const [qrUrl, setQrUrl] = useState('');

  const generateQR = () => {
    const encodedData = encodeURIComponent(qrData);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    setQrUrl(qrApiUrl);
  };

  const sampleQRs = [
    {
      name: '3M 다목적 접착제',
      data: '3M-ADH-001|3M 다목적 접착제|사무용품|3,500원|재고 24개'
    },
    {
      name: '3M 스카치 테이프',
      data: '3M-TAPE-002|3M 스카치 테이프|사무용품|2,800원|재고 15개'
    },
    {
      name: '3M 다목적 클리너',
      data: '3M-CLEAN-003|3M 다목적 클리너|청소용품|4,200원|재고 8개'
    },
    {
      name: '3M 보호 테이프',
      data: '3M-PROTECT-004|3M 보호 테이프|산업용품|5,500원|재고 12개'
    }
  ];

  return (
    <div className="mobile-container">
      {/* 3M 헤더 */}
      <div style={{ 
        backgroundColor: '#dc3545', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontWeight: 'bold',
          color: '#dc3545',
          fontSize: '12px'
        }}>
          3M
        </div>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'white' 
        }}>
          QR 테스트
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>QR 코드 생성기</h2>
        
        {/* QR 데이터 입력 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            QR 데이터:
          </label>
          <textarea
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            style={{
              width: '100%',
              height: '80px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            placeholder="QR 코드에 포함될 데이터를 입력하세요"
          />
        </div>

        {/* QR 생성 버튼 */}
        <button
          onClick={generateQR}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}
        >
          QR 코드 생성
        </button>

        {/* 생성된 QR 코드 */}
        {qrUrl && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img 
              src={qrUrl} 
              alt="Generated QR Code"
              style={{ 
                maxWidth: '200px', 
                border: '1px solid #ddd',
                borderRadius: '8px'
              }} 
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              이 QR 코드를 스캔해보세요!
            </p>
          </div>
        )}

        {/* 샘플 QR 코드들 */}
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>샘플 QR 코드들:</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {sampleQRs.map((sample, index) => (
            <div 
              key={index}
              style={{
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer'
              }}
              onClick={() => {
                setQrData(sample.data);
                const encodedData = encodeURIComponent(sample.data);
                setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`);
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                {sample.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {sample.data}
              </div>
            </div>
          ))}
        </div>

        {/* 스캔 페이지로 이동 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link 
            to="/scan"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            <i className="fas fa-qrcode" style={{ marginRight: '8px' }}></i>
            QR 스캔 페이지로 이동
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QRTestPage; 