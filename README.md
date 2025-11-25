# Catch up - 친구들 근황 공유 앱

친구들과 만나기 전에 요즘 어떻게 지내는지 근황을 공유하는 웹 애플리케이션입니다.

## 기능

- ✍️ 근황 작성 및 공유
- 📋 친구들의 근황 목록 조회
- 📅 날짜별 근황 관리
- 💬 회사생활, 취미생활, 건강관리, 가족 소식, 최근 관심사 등 다양한 항목 공유

## 조사 항목

1. **이름** (필수)
2. **날짜** (필수)
3. **회사생활**
4. **취미생활**
5. **건강관리**
6. **가족들 소식**
7. **최근 관심사**

## 사용 방법

### 1. 파일 구조

```
catchup/
├── index.html      # 메인 HTML 파일
├── style.css       # 스타일시트
├── app.js          # 애플리케이션 로직
├── config.js       # Supabase 설정
└── README.md       # 이 파일
```

### 2. Supabase 설정

`config.js` 파일에 Supabase 프로젝트 정보가 이미 설정되어 있습니다. 
다른 프로젝트를 사용하려면 다음 정보를 변경하세요:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. 실행 방법

1. 웹 서버를 실행하거나 `index.html` 파일을 브라우저에서 직접 열기
2. 로컬 개발 서버를 사용하는 경우:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (http-server 설치 필요)
   npx http-server
   ```
3. 브라우저에서 `http://localhost:8000` 접속

### 4. 데이터베이스 구조

Supabase에 `cat_updates` 테이블이 생성되어 있으며, 다음 컬럼을 포함합니다:

- `id` (UUID, Primary Key)
- `name` (TEXT, 필수) - 이름
- `date` (DATE, 필수) - 날짜
- `work_life` (TEXT) - 회사생활
- `hobby_life` (TEXT) - 취미생활
- `health_care` (TEXT) - 건강관리
- `family_news` (TEXT) - 가족들 소식
- `recent_interests` (TEXT) - 최근 관심사
- `created_at` (TIMESTAMPTZ) - 생성일시
- `updated_at` (TIMESTAMPTZ) - 수정일시

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL)
- **라이브러리**: @supabase/supabase-js

## 주요 기능 설명

### 근황 작성
- 이름과 날짜는 필수 입력 항목입니다
- 나머지 항목들은 선택 사항입니다
- 작성한 근황은 즉시 목록에 표시됩니다

### 근황 조회
- 날짜순으로 정렬되어 표시됩니다
- 최신 근황이 상단에 표시됩니다
- 작성된 항목만 카드에 표시됩니다

## 보안 설정

현재 RLS(Row Level Security) 정책이 모든 사용자에게 읽기/쓰기 권한을 허용하도록 설정되어 있습니다. 
프로덕션 환경에서는 인증된 사용자만 접근할 수 있도록 정책을 수정하는 것을 권장합니다.

## 라이선스

이 프로젝트는 자유롭게 사용할 수 있습니다.
