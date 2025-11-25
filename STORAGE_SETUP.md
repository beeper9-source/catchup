# Supabase Storage 버킷 설정 가이드

이미지 업로드 기능을 사용하려면 Supabase Storage 버킷을 생성해야 합니다.

## 버킷 생성 방법

### 1. Supabase 대시보드 접속
1. [Supabase 대시보드](https://app.supabase.com)에 로그인
2. 프로젝트 선택

### 2. Storage 메뉴로 이동
왼쪽 사이드바에서 **Storage** 메뉴 클릭

### 3. 새 버킷 생성
1. **New bucket** 버튼 클릭
2. 다음 정보 입력:
   - **Name**: `catchup-images` (정확히 이 이름으로 입력)
   - **Public bucket**: ✅ 체크 (이미지 공개 접근을 위해 필수)
3. **Create bucket** 버튼 클릭

### 4. Storage 정책 설정 (선택사항)

버킷 생성 후, 업로드 권한을 설정할 수 있습니다:

1. 생성된 `catchup-images` 버킷 클릭
2. **Policies** 탭으로 이동
3. **New Policy** 클릭
4. 다음 정책 추가:

**정책 1: 공개 읽기 (Public Read)**
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Policy definition: `true`

**정책 2: 공개 업로드 (Public Upload)**
- Policy name: `Public upload access`
- Allowed operation: `INSERT`
- Policy definition: `true`

> **보안 참고**: 프로덕션 환경에서는 인증된 사용자만 업로드할 수 있도록 정책을 수정하는 것을 권장합니다.

## 확인 방법

버킷이 정상적으로 생성되었는지 확인하려면:

1. Storage 메뉴에서 `catchup-images` 버킷이 보이는지 확인
2. 앱에서 이미지를 업로드해보기
3. 업로드된 이미지가 근황 카드에 표시되는지 확인

## 문제 해결

### "Bucket not found" 오류가 발생하는 경우
- 버킷 이름이 정확히 `catchup-images`인지 확인
- Public bucket 옵션이 활성화되어 있는지 확인
- 브라우저를 새로고침하고 다시 시도

### 이미지가 업로드되지만 표시되지 않는 경우
- Storage 정책에서 SELECT 권한이 있는지 확인
- 브라우저 개발자 도구의 Network 탭에서 이미지 URL이 정상적으로 로드되는지 확인

## 추가 정보

- Supabase Storage 문서: https://supabase.com/docs/guides/storage
- Storage 정책 가이드: https://supabase.com/docs/guides/storage/security/access-control
