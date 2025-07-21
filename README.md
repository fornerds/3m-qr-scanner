# 3M QR Scanner App

3M 다이소 QR 스캐너 모바일 웹 애플리케이션입니다. 실시간 QR 코드 스캔과 매장 재고 관리를 위한 풀스택 애플리케이션입니다.

## 시스템 아키텍처

```
Frontend (React) ←→ Socket.io ←→ Backend (Node.js) ←→ MongoDB
     ↓                    ↓              ↓              ↓
모바일 UI            실시간 통신      API 서버        데이터 저장
QR 스캔 인터페이스   양방향 통신      비즈니스 로직    매장/재고 정보
```

## 주요 기능

### 프론트엔드 (React)
- **메인 페이지**: QR 스캐너 + 최근 매장 목록
- **매장 목록**: 검색 및 필터링 기능
- **매장 상세**: 재고 현황 및 상품 목록
- **QR 스캔**: 실시간 카메라 스트림 + QR 감지 + **3M 제품 DB 연동**
- **QR 테스트**: 제품 코드 테스트 및 실시간 제품 정보 확인
- **재고 관리**: 탭별 재고 현황 관리
- **설정**: 앱 정보 및 사용자 설정

### 백엔드
- **실시간 QR 스캔**: 제품 코드 스캔 후 즉시 다이소 제품 조회
- **실제 엑셀 데이터**: 146개 전체 다이소 제품 정보 (실제 매장 데이터 기반)
- **메모리 기반 검색**: 빠른 제품 조회 및 검색
- **세션 관리**: 스캔 세션 추적 및 통계
- **REST API**: 제품 조회, 검색

## 기술 스택

### Frontend
- **React 18.2.0** - UI 프레임워크
- **React Router DOM 6.8.0** - 라우팅
- **Socket.io Client** - 실시간 통신
- **Font Awesome** - 아이콘 라이브러리

### Backend
- **Node.js** - 서버 런타임
- **Express.js** - 웹 프레임워크
- **CORS** - 크로스 오리진 설정

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd 3M
```

### 2. 프론트엔드 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행 (포트 3000)
npm start
```

### 3. 백엔드 설정
```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 개발 서버 실행 (포트 5000)
npm run dev
```

### 4. 즉시 사용 가능!
```bash
# 별도의 데이터베이스 설정 불필요
# 제품 데이터가 이미 하드코딩되어 있음
# 바로 QR 스캔 테스트 가능
```

## QR 스캔 및 제품 조회 동작 방식

### 실제 사용법
1. **카메라 활성화**: `/scan` 페이지에서 자동으로 카메라가 켜집니다
2. **실시간 QR 감지**: QR 코드가 화면에 나타나면 자동으로 감지하여 제품 코드를 추출합니다
3. **즉시 제품 조회**: 추출된 제품 코드를 146개 실제 엑셀 데이터에서 검색합니다
4. **결과 표시**: 
   - ✅ **진열 상품**: 녹색으로 제품 정보 표시 (제품명, 카테고리, 가격)
   - ❌ **미진열 상품**: 빨간색으로 "3M 제품이 아님" 표시
5. **통계 추적**: 총 스캔 수, 진열/미진열 개수 실시간 표시
6. **자동 지속**: 결과 표시 후 1초 뒤 자동으로 다음 스캔 대기

### 🔧 기술적 동작 과정

#### 1. 카메라 스트림 시작
```javascript
// 프론트엔드에서 카메라 접근
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
});
```

#### 2. QR 코드 감지 및 제품 조회
```javascript
// jsQR로 QR 코드 감지
const code = jsQR(imageData.data, imageData.width, imageData.height);

// 저장된 데이터에서 제품 검색
const response = await fetch('/api/products', {
  method: 'POST',
  body: JSON.stringify({ scannedCode: code.data })
});
```

#### 3. 메모리 기반 제품 정보 조회
```javascript
// 간단한 메모리 검색 (146개 제품)
const product = DAISO_PRODUCTS.find(p => p.sku === scannedCode);

// 결과 반환
return {
  found: !!product,
  product: product,
  message: product ? '진열 상품 확인됨' : '3M 제품이 아님'
};
```

### 4. 실시간 결과 표시
```javascript
// 스캔 결과 UI에 표시
setScanResult({
  productCode: scannedCode,
  productName: product.daisoName,
  category: product.category,
  price: product.price,
  status: 'found' // or 'not_found'
});
```

## API 엔드포인트

### 매장 관리
- `GET /api/stores` - 매장 목록 조회
- `GET /api/stores/:id` - 매장 상세 정보
- `POST /api/stores` - 매장 추가
- `PUT /api/stores/:id` - 매장 정보 수정

### 스캔 세션
- `GET /api/sessions/:storeId` - 스캔 세션 조회
- `POST /api/sessions` - 새 세션 생성

### 재고 관리
- `GET /api/inventory/:storeId` - 재고 현황 조회
- `POST /api/inventory/:storeId` - 재고 정보 업데이트

### 시스템
- `GET /api/health` - 서버 상태 확인

## Socket.io 이벤트

### 클라이언트 → 서버
- `start-camera` - 카메라 스트림 시작
- `stop-camera` - 카메라 스트림 중단
- `qr-detected` - QR 코드 감지
- `frame-data` - 프레임 데이터 전송

### 서버 → 클라이언트
- `camera-started` - 카메라 시작 확인
- `camera-stopped` - 카메라 중단 확인
- `qr-processed` - QR 처리 결과
- `item-scanned` - 다른 스캐너 알림

## 모바일 최적화

- **반응형 디자인**: 최대 너비 414px (iPhone 기준)
- **터치 친화적**: 큰 버튼과 터치 영역
- **모바일 카메라**: 후면 카메라 우선 사용
- **오프라인 지원**: 기본 기능 오프라인 동작

## UI/UX 특징

- **3M 브랜딩**: 레드 컬러 (#dc3545) 일관성
- **아이콘 시스템**: Font Awesome 아이콘 사용
- **실시간 피드백**: 스캔 결과 즉시 표시
- **직관적 네비게이션**: 하단 탭 메뉴

## 보안 고려사항

- **CORS 설정**: 허용된 도메인만 접근
- **세션 관리**: 사용자별 스캔 세션 분리
- **데이터 검증**: 서버 측 입력 검증
- **에러 처리**: 적절한 에러 메시지

## 배포

### Vercel 원클릭 배포 (추천)
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel

# 또는 GitHub 연동 후 자동 배포
# https://vercel.com 에서 GitHub 저장소 연결
```

### 수동 배포
```bash
# 빌드
npm run build

# Vercel에 배포
vercel --prod
```

### 환경 변수 설정 (Vercel 대시보드)
- `NODE_ENV=production`
- `MONGODB_URI=your_mongodb_atlas_uri` (선택사항)

### 배포 후 확인
- 프론트엔드: `https://your-app.vercel.app`
- API 엔드포인트: `https://your-app.vercel.app/api/stores`
- Socket.io: `https://your-app.vercel.app/api/qr-scan`

## 확장 가능성

- **다중 사용자**: 동시 스캔 지원
- **AI 통합**: 이미지 인식 및 분석
- **실시간 알림**: 푸시 알림 시스템
- **데이터 분석**: 스캔 통계 및 리포트
- **API 확장**: 외부 시스템 연동

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다.

## 지원

- **이메일**: support@3m.com
- **문서**: [API 문서](docs/api.md)
- **이슈**: [GitHub Issues](issues)

---

**3M QR Scanner App** - 실시간 QR 스캔으로 매장 재고를 효율적으로 관리하세요! 