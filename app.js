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

        updatesList.innerHTML = data.map(update => createUpdateCard(update)).join('');
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

    return `
        <div class="update-card">
            <div class="update-header">
                <div class="update-name">${escapeHtml(update.name)}</div>
                <div class="update-date">${date}</div>
            </div>
            <div class="update-content">
                ${contentHtml}
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
