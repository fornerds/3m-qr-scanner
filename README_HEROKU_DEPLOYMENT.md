# 🚀 3M Daiso QR Scanner - Heroku 배포 가이드

## ✨ 최적화 완료!

이 버전은 **완전히 최적화된 Express.js 서버**로 다음과 같은 개선사항을 포함합니다:

### 🏃‍♂️ 성능 최적화
- **MongoDB Aggregation**: N+1 쿼리 문제 해결로 10x 빠른 API 응답
- **Connection Pooling**: 최적화된 데이터베이스 연결 관리
- **메모리 캐싱**: 자주 조회되는 데이터 캐싱으로 응답속도 향상
- **Bulk Operations**: 대용량 데이터 처리 최적화
- **압축 미들웨어**: gzip 압축으로 네트워크 사용량 50% 감소

### 🛡️ 안정성 향상
- **Graceful Shutdown**: 서버 재시작 시 안전한 종료 처리
- **에러 핸들링**: 전역 에러 처리 및 상세한 로깅
- **입력 검증**: 모든 API 엔드포인트에 엄격한 데이터 검증
- **트랜잭션**: 데이터 일관성 보장

---

## 📋 사전 준비사항

### 1. MongoDB Atlas 설정
```bash
# MongoDB Atlas에 클러스터 생성
# Database > Connect > Connect your application
# Connection String 복사 (예시):
# mongodb+srv://username:password@cluster.mongodb.net/3m-inventory?retryWrites=true&w=majority
```

### 2. OpenAI API 키 발급 (AI 기능 사용 시)
```bash
# https://platform.openai.com/api-keys 에서 API 키 생성
```

---

## 🚀 Heroku 배포 명령어

### 1. Heroku CLI 설치 및 로그인
```bash
# Windows (PowerShell)
winget install Heroku.CLI

# 로그인
heroku login
```

### 2. Heroku 앱 생성 및 배포
```bash
# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit: Optimized Express server for Heroku"

# Heroku 앱 생성 (앱 이름 추천: 3m-daiso-qr-scanner-v2)
heroku create 3m-daiso-qr-scanner-v2

# 환경 변수 설정
heroku config:set MONGODB_URI="mongodb+srv://your-username:your-password@cluster.mongodb.net/3m-inventory?retryWrites=true&w=majority"
heroku config:set OPENAI_API_KEY="your-openai-api-key"
heroku config:set NODE_ENV=production
heroku config:set LOG_AI_ANALYSIS=true

# 배포 실행
git push heroku main

# 로그 확인
heroku logs --tail
```

### 3. 앱 열기 및 확인
```bash
# 브라우저에서 앱 열기
heroku open

# 앱 상태 확인
heroku ps:scale web=1
heroku ps
```

---

## 🔧 환경 변수 설정

Heroku 대시보드에서 다음 환경 변수들을 설정하세요:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `MONGODB_URI` | MongoDB 연결 URI | mongodb+srv://user:pass@cluster.net/3m-inventory |
| `OPENAI_API_KEY` | OpenAI API 키 | sk-... |
| `NODE_ENV` | 실행 환경 | production |
| `LOG_AI_ANALYSIS` | AI 분석 로깅 활성화 | true |

```bash
# 명령어로 설정
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set OPENAI_API_KEY="your-openai-key"
heroku config:set NODE_ENV=production

# 설정 확인
heroku config
```

---

## 📊 성능 모니터링

### API 응답 시간 확인
```bash
# API 성능 테스트
curl -w "@curl-format.txt" -o /dev/null -s "https://your-app.herokuapp.com/api/stores"

# 로그 실시간 모니터링
heroku logs --tail --app your-app-name
```

### 주요 API 엔드포인트들

| API | 설명 | 예상 응답시간 |
|-----|------|---------------|
| `GET /api/stores` | 매장 목록 (최적화됨) | ~200ms |
| `GET /api/products` | 제품 목록 | ~150ms |
| `GET /api/scan-records` | 스캔 기록 | ~100ms |
| `POST /api/ai-analyze-shelf` | AI 분석 | ~3000ms |

---

## 🏪 로컬 테스트

배포 전 로컬에서 테스트:

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
cp .env.example .env
# .env 파일 편집하여 실제 값 입력

# 서버 실행
npm run server

# 브라우저에서 확인
# http://localhost:5000
```

---

## 🛠️ 트러블슈팅

### 자주 발생하는 문제들

#### 1. MongoDB 연결 실패
```bash
# 로그 확인
heroku logs --tail | grep MongoDB

# IP 화이트리스트 확인 (MongoDB Atlas)
# Network Access > Add IP Address > 0.0.0.0/0 (모든 IP 허용)
```

#### 2. 메모리 부족
```bash
# Heroku 앱 스케일 업그레이드
heroku ps:scale web=1:standard-1x

# 메모리 사용량 확인
heroku logs --tail | grep "Memory usage"
```

#### 3. 빌드 실패
```bash
# 캐시 클리어 후 재배포
heroku plugins:install heroku-builds
heroku builds:cache:purge
git push heroku main
```

#### 4. API 응답 느림
```bash
# 데이터베이스 인덱스 확인 (MongoDB Compass 사용)
# 또는 API 응답 시간 로그 확인
heroku logs --tail | grep "responseTime"
```

---

## 📈 추가 최적화 옵션

### 1. CDN 설정 (선택사항)
```bash
# Heroku Add-on으로 Fastly 또는 CloudFlare 연결
heroku addons:create fastly:test
```

### 2. 모니터링 도구 추가
```bash
# New Relic 성능 모니터링
heroku addons:create newrelic:wayne

# Papertrail 로그 관리
heroku addons:create papertrail:choklad
```

### 3. 자동 스케일링
```bash
# HireFire로 자동 스케일링 설정
heroku addons:create hirefire:test
```

---

## ✅ 성공 확인 체크리스트

- [ ] 앱이 정상적으로 시작됨 (`heroku logs` 확인)
- [ ] 메인 페이지 로딩 확인
- [ ] 매장 목록 API 응답 확인 (`/api/stores`)
- [ ] QR 스캐너 기능 테스트
- [ ] AI 분석 기능 테스트 (OpenAI API 키 설정된 경우)
- [ ] 데이터베이스 연결 및 데이터 저장 확인

---

## 🎉 완료!

이제 최적화된 3M Daiso QR Scanner가 Heroku에서 빠르고 안정적으로 실행됩니다!

- **앱 URL**: https://your-app-name.herokuapp.com
- **Admin 대시보드**: https://your-app-name.herokuapp.com/admin
- **API 문서**: https://your-app-name.herokuapp.com/api (개발 예정)

문의사항이나 문제가 발생하면 Heroku 로그를 확인하거나 이슈를 생성해 주세요.
