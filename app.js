// 페이지 로드 시 근황 목록 불러오기
document.addEventListener('DOMContentLoaded', async () => {
    // 오늘 날짜를 기본값으로 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // 근황 목록 불러오기
    await loadUpdates();

    // 폼 제출 이벤트
    document.getElementById('updateForm').addEventListener('submit', handleSubmit);
});

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value.trim(),
        date: document.getElementById('date').value,
        work_life: document.getElementById('work_life').value.trim() || null,
        hobby_life: document.getElementById('hobby_life').value.trim() || null,
        health_care: document.getElementById('health_care').value.trim() || null,
        family_news: document.getElementById('family_news').value.trim() || null,
        recent_interests: document.getElementById('recent_interests').value.trim() || null
    };

    // 이름과 날짜는 필수
    if (!formData.name || !formData.date) {
        alert('이름과 날짜는 필수 입력 항목입니다.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('cat_updates')
            .insert([formData])
            .select();

        if (error) {
            throw error;
        }

        // 성공 메시지
        alert('근황이 성공적으로 공유되었습니다!');
        
        // 폼 초기화
        document.getElementById('updateForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];

        // 목록 새로고침
        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('근황 공유 중 오류가 발생했습니다: ' + error.message);
    }
}

// 근황 목록 불러오기
async function loadUpdates() {
    const updatesList = document.getElementById('updatesList');
    updatesList.innerHTML = '<p class="loading">로딩 중...</p>';

    try {
        const { data, error } = await supabase
            .from('cat_updates')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            updatesList.innerHTML = '<p class="empty-state">아직 공유된 근황이 없습니다. 첫 번째 근황을 작성해보세요!</p>';
            return;
        }

        // 각 근황에 대한 댓글도 함께 불러오기
        const updatesWithComments = await Promise.all(
            data.map(async (update) => {
                const { data: comments } = await supabase
                    .from('cat_comments')
                    .select('*')
                    .eq('update_id', update.id)
                    .order('created_at', { ascending: true });
                
                return { ...update, comments: comments || [] };
            })
        );

        updatesList.innerHTML = updatesWithComments.map(update => createUpdateCard(update)).join('');
        
        // 댓글 폼 이벤트 리스너 추가
        attachCommentListeners();
    } catch (error) {
        console.error('Error:', error);
        updatesList.innerHTML = '<p class="empty-state">근황을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 근황 카드 생성
function createUpdateCard(update) {
    const date = new Date(update.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const fields = [
        { label: '회사생활', value: update.work_life },
        { label: '취미생활', value: update.hobby_life },
        { label: '건강관리', value: update.health_care },
        { label: '가족들 소식', value: update.family_news },
        { label: '최근 관심사', value: update.recent_interests }
    ].filter(field => field.value); // 값이 있는 필드만 표시

    const contentHtml = fields.length > 0
        ? fields.map(field => `
            <div class="update-item">
                <div class="update-item-label">${field.label}</div>
                <div class="update-item-value">${field.value}</div>
            </div>
        `).join('')
        : '<div class="update-item"><div class="update-item-value">작성된 내용이 없습니다.</div></div>';

    // 댓글 목록 HTML
    const commentsHtml = (update.comments || []).length > 0
        ? update.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.commenter_name)}</span>
                    <span class="comment-date">${formatCommentDate(comment.created_at)}</span>
                </div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
            </div>
        `).join('')
        : '<p class="no-comments">아직 댓글이 없습니다.</p>';

    return `
        <div class="update-card" data-update-id="${update.id}">
            <div class="update-header">
                <div class="update-name">${escapeHtml(update.name)}</div>
                <div class="update-date">${date}</div>
            </div>
            <div class="update-content">
                ${contentHtml}
            </div>
            <div class="comments-section">
                <h3 class="comments-title">댓글 (${(update.comments || []).length})</h3>
                <div class="comments-list">
                    ${commentsHtml}
                </div>
                <form class="comment-form" data-update-id="${update.id}">
                    <div class="comment-form-row">
                        <select class="commenter-name" required>
                            <option value="">이름 선택</option>
                            <option value="김구">김구</option>
                            <option value="조원일">조원일</option>
                            <option value="이병근">이병근</option>
                            <option value="김경남">김경남</option>
                            <option value="김재환">김재환</option>
                        </select>
                        <textarea class="comment-content-input" rows="2" placeholder="댓글을 입력하세요..." required></textarea>
                        <button type="submit" class="comment-submit-btn">댓글 작성</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// XSS 방지를 위한 HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 댓글 날짜 포맷팅
function formatCommentDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 댓글 폼 이벤트 리스너 추가
function attachCommentListeners() {
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', handleCommentSubmit);
    });
}

// 댓글 제출 처리
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const updateId = form.dataset.updateId;
    const commenterName = form.querySelector('.commenter-name').value.trim();
    const content = form.querySelector('.comment-content-input').value.trim();

    if (!commenterName || !content) {
        alert('이름과 댓글 내용을 모두 입력해주세요.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('cat_comments')
            .insert([{
                update_id: updateId,
                commenter_name: commenterName,
                content: content
            }])
            .select();

        if (error) {
            throw error;
        }

        // 댓글 입력 필드 초기화
        form.querySelector('.comment-content-input').value = '';
        form.querySelector('.commenter-name').value = '';

        // 근황 목록 새로고침
        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('댓글 작성 중 오류가 발생했습니다: ' + error.message);
    }
}
