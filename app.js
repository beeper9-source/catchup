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
        
        // 근황 수정/삭제 버튼 이벤트 리스너 추가
        attachUpdateActionListeners();
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
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.commenter_name)}</span>
                    <div class="comment-header-right">
                        <span class="comment-date">${formatCommentDate(comment.created_at)}</span>
                        <div class="comment-actions">
                            <button class="edit-comment-btn" data-comment-id="${comment.id}" title="수정">✏️</button>
                            <button class="delete-comment-btn" data-comment-id="${comment.id}" title="삭제">🗑️</button>
                        </div>
                    </div>
                </div>
                <div class="comment-content-display" data-comment-id="${comment.id}">
                    ${escapeHtml(comment.content)}
                </div>
                <div class="comment-edit-form" data-comment-id="${comment.id}" style="display: none;">
                    <form class="edit-comment-form">
                        <div class="comment-edit-row">
                            <select class="edit-commenter-name" required>
                                <option value="김구" ${comment.commenter_name === '김구' ? 'selected' : ''}>김구</option>
                                <option value="조원일" ${comment.commenter_name === '조원일' ? 'selected' : ''}>조원일</option>
                                <option value="이병근" ${comment.commenter_name === '이병근' ? 'selected' : ''}>이병근</option>
                                <option value="김경남" ${comment.commenter_name === '김경남' ? 'selected' : ''}>김경남</option>
                                <option value="김재환" ${comment.commenter_name === '김재환' ? 'selected' : ''}>김재환</option>
                            </select>
                            <textarea class="edit-comment-content" rows="2" required>${escapeHtml(comment.content)}</textarea>
                            <div class="comment-edit-actions">
                                <button type="submit" class="save-comment-btn">저장</button>
                                <button type="button" class="cancel-comment-edit-btn">취소</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `).join('')
        : '<p class="no-comments">아직 댓글이 없습니다.</p>';

    return `
        <div class="update-card" data-update-id="${update.id}">
            <div class="update-header">
                <div class="update-name">${escapeHtml(update.name)}</div>
                <div class="update-header-right">
                    <div class="update-date">${date}</div>
                    <div class="update-actions">
                        <button class="edit-update-btn" data-update-id="${update.id}" title="수정">
                            ✏️
                        </button>
                        <button class="delete-update-btn" data-update-id="${update.id}" title="삭제">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
            <div class="update-content-display" data-update-id="${update.id}">
                ${contentHtml}
            </div>
            <div class="update-edit-form" data-update-id="${update.id}" style="display: none;">
                <form class="edit-update-form">
                    <div class="form-group">
                        <label>이름 *</label>
                        <select class="edit-name" required>
                            <option value="김구" ${update.name === '김구' ? 'selected' : ''}>김구</option>
                            <option value="조원일" ${update.name === '조원일' ? 'selected' : ''}>조원일</option>
                            <option value="이병근" ${update.name === '이병근' ? 'selected' : ''}>이병근</option>
                            <option value="김경남" ${update.name === '김경남' ? 'selected' : ''}>김경남</option>
                            <option value="김재환" ${update.name === '김재환' ? 'selected' : ''}>김재환</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>날짜 *</label>
                        <input type="date" class="edit-date" value="${update.date}" required>
                    </div>
                    <div class="form-group">
                        <label>회사생활</label>
                        <textarea class="edit-work_life" rows="3">${escapeHtml(update.work_life || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>취미생활</label>
                        <textarea class="edit-hobby_life" rows="3">${escapeHtml(update.hobby_life || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>건강관리</label>
                        <textarea class="edit-health_care" rows="3">${escapeHtml(update.health_care || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>가족들 소식</label>
                        <textarea class="edit-family_news" rows="3">${escapeHtml(update.family_news || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>최근 관심사</label>
                        <textarea class="edit-recent_interests" rows="3">${escapeHtml(update.recent_interests || '')}</textarea>
                    </div>
                    <div class="edit-form-actions">
                        <button type="submit" class="save-update-btn">저장</button>
                        <button type="button" class="cancel-edit-btn">취소</button>
                    </div>
                </form>
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

// 근황 수정/삭제 버튼 이벤트 리스너 추가
function attachUpdateActionListeners() {
    // 수정 버튼
    document.querySelectorAll('.edit-update-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = e.target.closest('.edit-update-btn').dataset.updateId;
            toggleUpdateEditMode(updateId);
        });
    });

    // 삭제 버튼
    document.querySelectorAll('.delete-update-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = e.target.closest('.delete-update-btn').dataset.updateId;
            if (confirm('이 근황을 삭제하시겠습니까?')) {
                deleteUpdate(updateId);
            }
        });
    });

    // 수정 폼 제출
    document.querySelectorAll('.edit-update-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const updateId = e.target.closest('.update-edit-form').dataset.updateId;
            saveUpdate(updateId);
        });
    });

    // 수정 취소 버튼
    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = e.target.closest('.update-edit-form').dataset.updateId;
            toggleUpdateEditMode(updateId);
        });
    });

    // 댓글 수정 버튼
    document.querySelectorAll('.edit-comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentId = e.target.closest('.edit-comment-btn').dataset.commentId;
            toggleCommentEditMode(commentId);
        });
    });

    // 댓글 삭제 버튼
    document.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentId = e.target.closest('.delete-comment-btn').dataset.commentId;
            if (confirm('이 댓글을 삭제하시겠습니까?')) {
                deleteComment(commentId);
            }
        });
    });

    // 댓글 수정 폼 제출
    document.querySelectorAll('.edit-comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const commentId = e.target.closest('.comment-edit-form').dataset.commentId;
            saveComment(commentId);
        });
    });

    // 댓글 수정 취소 버튼
    document.querySelectorAll('.cancel-comment-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const commentId = e.target.closest('.comment-edit-form').dataset.commentId;
            toggleCommentEditMode(commentId);
        });
    });
}

// 근황 수정 모드 토글
function toggleUpdateEditMode(updateId) {
    const card = document.querySelector(`.update-card[data-update-id="${updateId}"]`);
    const display = card.querySelector('.update-content-display');
    const editForm = card.querySelector('.update-edit-form');

    if (editForm.style.display === 'none') {
        display.style.display = 'none';
        editForm.style.display = 'block';
    } else {
        display.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// 근황 저장
async function saveUpdate(updateId) {
    const editForm = document.querySelector(`.update-edit-form[data-update-id="${updateId}"]`);
    const formData = {
        name: editForm.querySelector('.edit-name').value.trim(),
        date: editForm.querySelector('.edit-date').value,
        work_life: editForm.querySelector('.edit-work_life').value.trim() || null,
        hobby_life: editForm.querySelector('.edit-hobby_life').value.trim() || null,
        health_care: editForm.querySelector('.edit-health_care').value.trim() || null,
        family_news: editForm.querySelector('.edit-family_news').value.trim() || null,
        recent_interests: editForm.querySelector('.edit-recent_interests').value.trim() || null
    };

    if (!formData.name || !formData.date) {
        alert('이름과 날짜는 필수 입력 항목입니다.');
        return;
    }

    try {
        const { error } = await supabase
            .from('cat_updates')
            .update(formData)
            .eq('id', updateId);

        if (error) {
            throw error;
        }

        alert('근황이 수정되었습니다!');
        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('근황 수정 중 오류가 발생했습니다: ' + error.message);
    }
}

// 근황 삭제
async function deleteUpdate(updateId) {
    try {
        const { error } = await supabase
            .from('cat_updates')
            .delete()
            .eq('id', updateId);

        if (error) {
            throw error;
        }

        alert('근황이 삭제되었습니다!');
        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('근황 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 댓글 수정 모드 토글
function toggleCommentEditMode(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const display = commentItem.querySelector('.comment-content-display');
    const editForm = commentItem.querySelector('.comment-edit-form');

    if (editForm.style.display === 'none') {
        display.style.display = 'none';
        editForm.style.display = 'block';
    } else {
        display.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// 댓글 저장
async function saveComment(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const form = commentItem.querySelector('.edit-comment-form');
    
    const formData = {
        commenter_name: form.querySelector('.edit-commenter-name').value.trim(),
        content: form.querySelector('.edit-comment-content').value.trim()
    };

    if (!formData.commenter_name || !formData.content) {
        alert('이름과 댓글 내용을 모두 입력해주세요.');
        return;
    }

    try {
        const { error } = await supabase
            .from('cat_comments')
            .update(formData)
            .eq('id', commentId);

        if (error) {
            throw error;
        }

        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('댓글 수정 중 오류가 발생했습니다: ' + error.message);
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    try {
        const { error } = await supabase
            .from('cat_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            throw error;
        }

        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('댓글 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}
