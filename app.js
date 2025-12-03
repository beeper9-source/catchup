// 현재 선택된 모임 ID
let currentGroupId = null;
let currentGroupName = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 항상 모임 선택 페이지를 첫 화면으로 표시
    showGroupSelectionPage();
    await loadGroups();

    // 모임 추가 폼 이벤트
    document.getElementById('addGroupForm').addEventListener('submit', handleAddGroup);
    
    // 모임 변경 버튼 이벤트
    document.getElementById('changeGroupBtn').addEventListener('click', () => {
        showGroupSelectionPage();
        loadGroups();
    });
});

// 모임 선택 페이지 표시
function showGroupSelectionPage() {
    document.getElementById('groupSelectionPage').style.display = 'block';
    document.getElementById('mainPage').style.display = 'none';
}

// 메인 페이지 표시
function showMainPage() {
    document.getElementById('groupSelectionPage').style.display = 'none';
    document.getElementById('mainPage').style.display = 'block';
    if (currentGroupName) {
        document.getElementById('currentGroupName').textContent = currentGroupName;
    }
}

// 모임 목록 불러오기
async function loadGroups() {
    const groupsList = document.getElementById('groupsList');
    groupsList.innerHTML = '<p class="loading">로딩 중...</p>';

    try {
        const { data, error } = await supabase
            .from('cat_groups')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            groupsList.innerHTML = '<p class="empty-state">아직 생성된 모임이 없습니다. 새 모임을 만들어보세요!</p>';
            return;
        }

        // 각 모임의 멤버 목록도 함께 불러오기
        const groupsWithMembers = await Promise.all(
            data.map(async (group) => {
                const { data: members } = await supabase
                    .from('cat_group_members')
                    .select('*')
                    .eq('group_id', group.id)
                    .order('name', { ascending: true });
                
                return { ...group, members: members || [] };
            })
        );

        groupsList.innerHTML = groupsWithMembers.map(group => createGroupCard(group)).join('');

        // 모임 선택 버튼 이벤트 리스너
        document.querySelectorAll('.select-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.dataset.groupId;
                const groupName = e.target.dataset.groupName;
                selectGroup(groupId, groupName);
            });
        });

        // 모임 정보 수정 버튼 이벤트 리스너
        document.querySelectorAll('.edit-group-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.closest('.group-card').dataset.groupId;
                showEmployeeIdModal(groupId);
            });
        });

        // 모임 정보 저장 버튼 이벤트 리스너
        document.querySelectorAll('.save-group-info-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const groupId = e.target.closest('.group-card').dataset.groupId;
                await saveGroupInfo(groupId);
            });
        });

        // 모임 정보 취소 버튼 이벤트 리스너
        document.querySelectorAll('.cancel-group-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.closest('.group-card').dataset.groupId;
                toggleGroupInfoEdit(groupId);
            });
        });
    } catch (error) {
        console.error('Error:', error);
        groupsList.innerHTML = '<p class="empty-state">모임을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 이름 마스킹 (두 번째 글자를 *로)
function maskName(name) {
    if (!name || name.length < 2) return name;
    return name.charAt(0) + '*' + name.substring(2);
}

// 모임 카드 생성
function createGroupCard(group) {
    const formatDate = (date) => {
        if (!date) return '미정';
        return new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (time) => {
        if (!time) return '';
        return time.substring(0, 5); // HH:MM 형식
    };

    const currentMeetingInfo = group.current_meeting_date 
        ? `${formatDate(group.current_meeting_date)} ${formatTime(group.current_meeting_time) || ''} ${group.current_meeting_location || ''}`.trim()
        : '미정';

    const nextMeetingInfo = group.next_meeting_date 
        ? `${formatDate(group.next_meeting_date)} ${formatTime(group.next_meeting_time) || ''} ${group.next_meeting_location || ''}`.trim()
        : '미정';

    return `
        <div class="group-card" data-group-id="${group.id}">
            <div class="group-card-header">
                <div class="group-name">${escapeHtml(group.name)}</div>
                <div class="group-card-actions">
                    <button class="edit-group-info-btn" data-group-id="${group.id}" title="모임 정보 수정">⚙️</button>
                    <button class="select-group-btn" data-group-id="${group.id}" data-group-name="${escapeHtml(group.name)}">
                        선택
                    </button>
                </div>
            </div>
            
            <div class="group-info-display" data-group-id="${group.id}">
                <div class="group-info-item">
                    <span class="group-info-label">이번 모임:</span>
                    <span class="group-info-value">${currentMeetingInfo}</span>
                </div>
                <div class="group-info-item">
                    <span class="group-info-label">다음 모임:</span>
                    <span class="group-info-value">${nextMeetingInfo}</span>
                </div>
            </div>

            <div class="group-info-edit" data-group-id="${group.id}" style="display: none;">
                <h4>리더</h4>
                <div class="form-group">
                    <label>리더 선택</label>
                    <select class="edit-leader-name">
                        <option value="">리더 없음</option>
                        ${(group.members || []).map(member => `
                            <option value="${escapeHtml(member.name)}" ${group.leader_name === member.name ? 'selected' : ''}>
                                ${escapeHtml(maskName(member.name))}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <h4>이번 모임 일정</h4>
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" class="edit-current-meeting-date" value="${group.current_meeting_date || ''}">
                </div>
                <div class="form-group">
                    <label>시간</label>
                    <input type="time" class="edit-current-meeting-time" value="${group.current_meeting_time || ''}">
                </div>
                <div class="form-group">
                    <label>장소</label>
                    <input type="text" class="edit-current-meeting-location" value="${escapeHtml(group.current_meeting_location || '')}" placeholder="장소를 입력하세요">
                </div>

                <h4>다음 모임 일정</h4>
                <div class="form-group">
                    <label>날짜</label>
                    <input type="date" class="edit-next-meeting-date" value="${group.next_meeting_date || ''}">
                </div>
                <div class="form-group">
                    <label>시간</label>
                    <input type="time" class="edit-next-meeting-time" value="${group.next_meeting_time || ''}">
                </div>
                <div class="form-group">
                    <label>장소</label>
                    <input type="text" class="edit-next-meeting-location" value="${escapeHtml(group.next_meeting_location || '')}" placeholder="장소를 입력하세요">
                </div>

                <div class="group-info-edit-actions">
                    <button type="button" class="save-group-info-btn">저장</button>
                    <button type="button" class="cancel-group-info-btn">취소</button>
                </div>
            </div>
        </div>
    `;
}

// 사번 입력 모달 표시 (모임 정보 수정용)
function showEmployeeIdModal(groupId) {
    const modal = document.getElementById('employeeIdModal');
    const employeeIdInput = document.getElementById('employeeIdInput');
    const employeeIdForm = document.getElementById('employeeIdForm');
    
    // 기존 이벤트 리스너 제거
    const newForm = employeeIdForm.cloneNode(true);
    employeeIdForm.parentNode.replaceChild(newForm, employeeIdForm);
    
    // 모달에 그룹 ID 저장
    modal.dataset.groupId = groupId;
    
    // 입력 필드 초기화
    document.getElementById('employeeIdInput').value = '';
    
    // 모달 표시
    modal.style.display = 'flex';
    document.getElementById('employeeIdInput').focus();
    
    // 폼 제출 이벤트
    document.getElementById('employeeIdForm').addEventListener('submit', handleEmployeeIdSubmit);
    
    // 취소 버튼 이벤트
    document.getElementById('cancelEmployeeIdBtn').addEventListener('click', () => {
        hideEmployeeIdModal();
    });
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideEmployeeIdModal();
        }
    });
}

// 사번 입력 모달 숨기기
function hideEmployeeIdModal() {
    const modal = document.getElementById('employeeIdModal');
    modal.style.display = 'none';
}

// 사번 검증 및 수정 모드 진입
async function handleEmployeeIdSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('employeeIdModal');
    const groupId = modal.dataset.groupId;
    const inputEmployeeId = document.getElementById('employeeIdInput').value.trim();
    
    if (!inputEmployeeId) {
        alert('사번을 입력해주세요.');
        return;
    }
    
    // 사번 검증 (김구의 사번: 22331)
    if (inputEmployeeId !== '22331') {
        alert('사번이 일치하지 않습니다. 다시 입력해주세요.');
        document.getElementById('employeeIdInput').value = '';
        document.getElementById('employeeIdInput').focus();
        return;
    }
    
    // 검증 통과 - 모달 닫고 수정 모드로 진입
    hideEmployeeIdModal();
    toggleGroupInfoEdit(groupId);
}

// 모임 정보 수정 모드 토글
function toggleGroupInfoEdit(groupId) {
    const card = document.querySelector(`.group-card[data-group-id="${groupId}"]`);
    const display = card.querySelector('.group-info-display');
    const edit = card.querySelector('.group-info-edit');

    if (edit.style.display === 'none') {
        display.style.display = 'none';
        edit.style.display = 'block';
    } else {
        display.style.display = 'block';
        edit.style.display = 'none';
    }
}

// 모임 정보 저장
async function saveGroupInfo(groupId) {
    const card = document.querySelector(`.group-card[data-group-id="${groupId}"]`);
    const editForm = card.querySelector('.group-info-edit');

    const updateData = {
        leader_name: editForm.querySelector('.edit-leader-name').value.trim() || null,
        current_meeting_date: editForm.querySelector('.edit-current-meeting-date').value || null,
        current_meeting_time: editForm.querySelector('.edit-current-meeting-time').value || null,
        current_meeting_location: editForm.querySelector('.edit-current-meeting-location').value.trim() || null,
        next_meeting_date: editForm.querySelector('.edit-next-meeting-date').value || null,
        next_meeting_time: editForm.querySelector('.edit-next-meeting-time').value || null,
        next_meeting_location: editForm.querySelector('.edit-next-meeting-location').value.trim() || null
    };

    try {
        const { error } = await supabase
            .from('cat_groups')
            .update(updateData)
            .eq('id', groupId);

        if (error) {
            throw error;
        }

        alert('모임 정보가 저장되었습니다!');
        await loadGroups();
    } catch (error) {
        console.error('Error:', error);
        alert('모임 정보 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 모임 선택
async function selectGroup(groupId, groupName) {
    // 모임의 리더 정보 확인
    const { data: groupData, error } = await supabase
        .from('cat_groups')
        .select('leader_name')
        .eq('id', groupId)
        .single();

    if (error) {
        console.error('Error:', error);
        alert('모임 정보를 불러오는 중 오류가 발생했습니다.');
        return;
    }

    // 리더가 설정되어 있으면 리더 이름 입력 모달 표시
    if (groupData.leader_name) {
        showLeaderModal(groupId, groupName, groupData.leader_name);
    } else {
        // 리더가 없으면 바로 입장
        enterGroup(groupId, groupName);
    }
}

// 리더 이름 입력 모달 표시
function showLeaderModal(groupId, groupName, correctLeaderName) {
    const modal = document.getElementById('leaderModal');
    const leaderInput = document.getElementById('leaderNameInput');
    const leaderForm = document.getElementById('leaderForm');
    
    // 기존 이벤트 리스너 제거
    const newForm = leaderForm.cloneNode(true);
    leaderForm.parentNode.replaceChild(newForm, leaderForm);
    
    // 모달에 그룹 정보 저장
    modal.dataset.groupId = groupId;
    modal.dataset.groupName = groupName;
    modal.dataset.correctLeaderName = correctLeaderName;
    
    // 입력 필드 초기화
    document.getElementById('leaderNameInput').value = '';
    
    // 모달 표시
    modal.style.display = 'flex';
    document.getElementById('leaderNameInput').focus();
    
    // 폼 제출 이벤트
    document.getElementById('leaderForm').addEventListener('submit', handleLeaderSubmit);
    
    // 취소 버튼 이벤트
    document.getElementById('cancelLeaderBtn').addEventListener('click', () => {
        hideLeaderModal();
    });
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideLeaderModal();
        }
    });
}

// 리더 이름 입력 모달 숨기기
function hideLeaderModal() {
    const modal = document.getElementById('leaderModal');
    modal.style.display = 'none';
}

// 리더 이름 검증 및 입장 처리
async function handleLeaderSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('leaderModal');
    const groupId = modal.dataset.groupId;
    const groupName = modal.dataset.groupName;
    const correctLeaderName = modal.dataset.correctLeaderName;
    const inputLeaderName = document.getElementById('leaderNameInput').value.trim();
    
    if (!inputLeaderName) {
        alert('리더 이름을 입력해주세요.');
        return;
    }
    
    // 리더 이름 검증
    if (inputLeaderName !== correctLeaderName) {
        alert('리더 이름이 일치하지 않습니다. 다시 입력해주세요.');
        document.getElementById('leaderNameInput').value = '';
        document.getElementById('leaderNameInput').focus();
        return;
    }
    
    // 검증 통과 - 모달 닫고 입장
    hideLeaderModal();
    enterGroup(groupId, groupName);
}

// 모임 입장
function enterGroup(groupId, groupName) {
    currentGroupId = groupId;
    currentGroupName = groupName;
    
    // 로컬 스토리지에 저장
    localStorage.setItem('selectedGroupId', groupId);
    localStorage.setItem('selectedGroupName', groupName);
    
    showMainPage();
    initializeMainPage();
}

// 모임 추가 처리
async function handleAddGroup(e) {
    e.preventDefault();
    
    const groupName = document.getElementById('newGroupName').value.trim();
    
    if (!groupName) {
        alert('모임 이름을 입력해주세요.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('cat_groups')
            .insert([{ name: groupName }])
            .select();

        if (error) {
            throw error;
        }

        alert('모임이 생성되었습니다!');
        document.getElementById('newGroupName').value = '';
        
        // 모임 목록 새로고침
        await loadGroups();
    } catch (error) {
        console.error('Error:', error);
        if (error.code === '23505') { // UNIQUE constraint violation
            alert('이미 존재하는 모임 이름입니다.');
        } else {
            alert('모임 생성 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

// 메인 페이지 초기화
async function initializeMainPage() {
    // 오늘 날짜를 기본값으로 설정
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today;
    }

    // 모임 멤버 목록 불러오기 및 드롭다운 업데이트
    await loadGroupMembers();

    // 근황 목록 불러오기
    await loadUpdates();

    // 폼 제출 이벤트
    const updateForm = document.getElementById('updateForm');
    if (updateForm) {
        updateForm.removeEventListener('submit', handleSubmit);
        updateForm.addEventListener('submit', handleSubmit);
    }

    // 멤버 관리 토글 버튼
    const toggleMembersBtn = document.getElementById('toggleMembersBtn');
    if (toggleMembersBtn) {
        toggleMembersBtn.addEventListener('click', () => {
            const membersManagement = document.getElementById('membersManagement');
            if (membersManagement.style.display === 'none') {
                membersManagement.style.display = 'block';
                toggleMembersBtn.textContent = '닫기';
            } else {
                membersManagement.style.display = 'none';
                toggleMembersBtn.textContent = '멤버 관리';
            }
        });
    }

    // 멤버 추가 폼 이벤트
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', handleAddMember);
    }

    // 이미지 미리보기 기능
    const imagesInput = document.getElementById('images');
    if (imagesInput) {
        imagesInput.addEventListener('change', handleImagePreview);
    }
}

// 모임 멤버 목록 불러오기
async function loadGroupMembers() {
    if (!currentGroupId) return;

    const membersList = document.getElementById('membersList');
    if (!membersList) return;

    try {
        const { data, error } = await supabase
            .from('cat_group_members')
            .select('*')
            .eq('group_id', currentGroupId)
            .order('name', { ascending: true });

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            membersList.innerHTML = '<p class="empty-state">아직 추가된 멤버가 없습니다. 멤버를 추가해보세요!</p>';
            updateMemberDropdowns([]);
            return;
        }

        // 멤버 목록 표시
        membersList.innerHTML = data.map(member => `
            <div class="member-item" data-member-id="${member.id}">
                <div class="member-info">
                    <span class="member-name">${escapeHtml(member.name)}</span>
                    <div class="member-email-display">
                        ${member.email ? `<span class="member-email">${escapeHtml(member.email)}</span>` : '<span class="member-email no-email">이메일 없음</span>'}
                    </div>
                </div>
                <div class="member-email-edit" style="display: none;">
                    <input type="email" class="edit-member-email-input" value="${member.email || ''}" placeholder="이메일 주소를 입력하세요">
                    <div class="member-edit-actions">
                        <button class="save-member-email-btn" data-member-id="${member.id}" title="저장">✓</button>
                        <button class="cancel-member-email-btn" data-member-id="${member.id}" title="취소">✕</button>
                    </div>
                </div>
                <div class="member-actions">
                    <button class="edit-member-email-btn" data-member-id="${member.id}" title="이메일 수정">✏️</button>
                    <button class="delete-member-btn" data-member-id="${member.id}" title="삭제">🗑️</button>
                </div>
            </div>
        `).join('');

        // 멤버 삭제 버튼 이벤트 리스너
        document.querySelectorAll('.delete-member-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const memberId = e.target.closest('.delete-member-btn').dataset.memberId;
                if (confirm('이 멤버를 삭제하시겠습니까?')) {
                    await deleteMember(memberId);
                }
            });
        });

        // 이메일 수정 버튼 이벤트 리스너
        document.querySelectorAll('.edit-member-email-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.closest('.edit-member-email-btn').dataset.memberId;
                toggleMemberEmailEdit(memberId);
            });
        });

        // 이메일 저장 버튼 이벤트 리스너
        document.querySelectorAll('.save-member-email-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const memberId = e.target.closest('.save-member-email-btn').dataset.memberId;
                await saveMemberEmail(memberId);
            });
        });

        // 이메일 수정 취소 버튼 이벤트 리스너
        document.querySelectorAll('.cancel-member-email-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.closest('.cancel-member-email-btn').dataset.memberId;
                toggleMemberEmailEdit(memberId);
            });
        });

        // 드롭다운 업데이트
        updateMemberDropdowns(data);
    } catch (error) {
        console.error('Error:', error);
        membersList.innerHTML = '<p class="empty-state">멤버를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 멤버 드롭다운 업데이트
function updateMemberDropdowns(members) {
    const memberNames = members.map(m => m.name);

    // 근황 작성 폼의 이름 드롭다운
    const nameSelect = document.getElementById('name');
    if (nameSelect) {
        nameSelect.innerHTML = '<option value="">이름을 선택하세요</option>' +
            memberNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    }

    // 모든 댓글 폼의 이름 드롭다운 업데이트
    document.querySelectorAll('.commenter-name').forEach(select => {
        select.innerHTML = '<option value="">이름 선택</option>' +
            memberNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    });

    // 수정 폼의 이름 드롭다운도 업데이트
    document.querySelectorAll('.edit-name').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = memberNames.map(name => 
            `<option value="${escapeHtml(name)}" ${name === currentValue ? 'selected' : ''}>${escapeHtml(name)}</option>`
        ).join('');
    });

    // 댓글 수정 폼의 이름 드롭다운도 업데이트
    document.querySelectorAll('.edit-commenter-name').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = memberNames.map(name => 
            `<option value="${escapeHtml(name)}" ${name === currentValue ? 'selected' : ''}>${escapeHtml(name)}</option>`
        ).join('');
    });
}

// 댓글 폼의 드롭다운 업데이트 (모임 멤버로)
async function updateCommentDropdowns() {
    if (!currentGroupId) return;

    try {
        const { data, error } = await supabase
            .from('cat_group_members')
            .select('name')
            .eq('group_id', currentGroupId)
            .order('name', { ascending: true });

        if (error) {
            throw error;
        }

        const memberNames = data.map(m => m.name);

        // 모든 댓글 폼의 이름 드롭다운 업데이트
        document.querySelectorAll('.commenter-name').forEach(select => {
            select.innerHTML = '<option value="">이름 선택</option>' +
                memberNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
        });

        // 댓글 수정 폼의 이름 드롭다운도 업데이트
        document.querySelectorAll('.edit-commenter-name').forEach(select => {
            const currentValue = select.dataset.currentValue || select.value;
            select.innerHTML = '<option value="">이름 선택</option>' +
                memberNames.map(name => 
                    `<option value="${escapeHtml(name)}" ${name === currentValue ? 'selected' : ''}>${escapeHtml(name)}</option>`
                ).join('');
        });

        // 근황 수정 폼의 이름 드롭다운도 업데이트
        document.querySelectorAll('.edit-name').forEach(select => {
            const currentValue = select.dataset.currentValue || select.value;
            select.innerHTML = '<option value="">이름 선택</option>' +
                memberNames.map(name => 
                    `<option value="${escapeHtml(name)}" ${name === currentValue ? 'selected' : ''}>${escapeHtml(name)}</option>`
                ).join('');
        });
    } catch (error) {
        console.error('Error updating comment dropdowns:', error);
    }
}

// 멤버 추가 처리
async function handleAddMember(e) {
    e.preventDefault();

    if (!currentGroupId) {
        alert('모임을 선택해주세요.');
        return;
    }

    const memberName = document.getElementById('newMemberName').value.trim();
    const memberEmail = document.getElementById('newMemberEmail').value.trim();

    if (!memberName) {
        alert('멤버 이름을 입력해주세요.');
        return;
    }

    // 이메일 형식 검증 (입력된 경우)
    if (memberEmail && !isValidEmail(memberEmail)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('cat_group_members')
            .insert([{
                group_id: currentGroupId,
                name: memberName,
                email: memberEmail || null
            }])
            .select();

        if (error) {
            throw error;
        }

        alert('멤버가 추가되었습니다!');
        document.getElementById('newMemberName').value = '';
        document.getElementById('newMemberEmail').value = '';

        // 멤버 목록 새로고침
        await loadGroupMembers();
    } catch (error) {
        console.error('Error:', error);
        if (error.code === '23505') { // UNIQUE constraint violation
            alert('이미 존재하는 멤버 이름입니다.');
        } else {
            alert('멤버 추가 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

// 멤버 삭제
async function deleteMember(memberId) {
    try {
        const { error } = await supabase
            .from('cat_group_members')
            .delete()
            .eq('id', memberId);

        if (error) {
            throw error;
        }

        await loadGroupMembers();
    } catch (error) {
        console.error('Error:', error);
        alert('멤버 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 멤버 이메일 수정 모드 토글
function toggleMemberEmailEdit(memberId) {
    const memberItem = document.querySelector(`.member-item[data-member-id="${memberId}"]`);
    if (!memberItem) return;

    const emailDisplay = memberItem.querySelector('.member-email-display');
    const emailEdit = memberItem.querySelector('.member-email-edit');
    const memberActions = memberItem.querySelector('.member-actions');

    if (emailEdit.style.display === 'none') {
        // 수정 모드로 전환
        emailDisplay.style.display = 'none';
        emailEdit.style.display = 'flex';
        memberActions.style.display = 'none';
        
        // 입력 필드에 포커스
        const input = emailEdit.querySelector('.edit-member-email-input');
        if (input) {
            input.focus();
            input.select();
        }
    } else {
        // 표시 모드로 전환
        emailDisplay.style.display = 'block';
        emailEdit.style.display = 'none';
        memberActions.style.display = 'flex';
    }
}

// 멤버 이메일 저장
async function saveMemberEmail(memberId) {
    const memberItem = document.querySelector(`.member-item[data-member-id="${memberId}"]`);
    if (!memberItem) return;

    const input = memberItem.querySelector('.edit-member-email-input');
    const email = input.value.trim();

    // 이메일 형식 검증 (입력된 경우)
    if (email && !isValidEmail(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        input.focus();
        return;
    }

    try {
        const { error } = await supabase
            .from('cat_group_members')
            .update({ email: email || null })
            .eq('id', memberId);

        if (error) {
            throw error;
        }

        // 성공 메시지 (선택사항)
        // alert('이메일이 수정되었습니다!');

        // 멤버 목록 새로고침
        await loadGroupMembers();
    } catch (error) {
        console.error('Error:', error);
        alert('이메일 수정 중 오류가 발생했습니다: ' + error.message);
    }
}

// 이미지 미리보기 처리
function handleImagePreview(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    const files = e.target.files;
    if (files.length === 0) return;

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'preview-image-item';
            imgContainer.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-image';
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-image-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => removeImagePreview(index);
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            preview.appendChild(imgContainer);
        };
        reader.readAsDataURL(file);
    });
}

// 이미지 미리보기 제거
function removeImagePreview(index) {
    const input = document.getElementById('images');
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    input.files = dt.files;
    
    // 미리보기 다시 생성
    const event = new Event('change');
    input.dispatchEvent(event);
}

// 이미지 업로드
async function uploadImages(files) {
    if (!files || files.length === 0) return [];

    const imageUrls = [];
    const uploadPromises = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentGroupId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const uploadPromise = supabase.storage
            .from('catchup-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            })
            .then(async ({ data, error }) => {
                if (error) {
                    console.error('Upload error:', error);
                    // 버킷이 없는 경우 더 명확한 에러 메시지
                    if (error.message && error.message.includes('Bucket not found')) {
                        throw new Error('Storage 버킷이 생성되지 않았습니다. Supabase 대시보드에서 "catchup-images" 버킷을 생성해주세요.');
                    }
                    throw error;
                }
                
                // 공개 URL 가져오기
                const { data: urlData } = supabase.storage
                    .from('catchup-images')
                    .getPublicUrl(data.path);
                
                return urlData.publicUrl;
            });

        uploadPromises.push(uploadPromise);
    }

    try {
        const urls = await Promise.all(uploadPromises);
        return urls;
    } catch (error) {
        console.error('Error uploading images:', error);
        throw error;
    }
}

// 폼 제출 처리
async function handleSubmit(e) {
    e.preventDefault();

    if (!currentGroupId) {
        alert('모임을 선택해주세요.');
        return;
    }

    // 이미지 업로드
    const imagesInput = document.getElementById('images');
    let imageUrls = [];
    
    if (imagesInput && imagesInput.files.length > 0) {
        try {
            imageUrls = await uploadImages(imagesInput.files);
        } catch (error) {
            let errorMessage = '이미지 업로드 중 오류가 발생했습니다: ' + error.message;
            
            // 버킷이 없는 경우 상세 안내
            if (error.message && error.message.includes('버킷이 생성되지 않았습니다')) {
                errorMessage += '\n\nSupabase 대시보드에서 다음 단계를 따라주세요:\n';
                errorMessage += '1. Storage 메뉴로 이동\n';
                errorMessage += '2. "New bucket" 클릭\n';
                errorMessage += '3. 버킷 이름: catchup-images\n';
                errorMessage += '4. Public bucket 옵션 활성화\n';
                errorMessage += '5. Create bucket 클릭';
            }
            
            alert(errorMessage);
            return;
        }
    }

    const formData = {
        group_id: currentGroupId,
        name: document.getElementById('name').value.trim(),
        date: document.getElementById('date').value,
        work_life: document.getElementById('work_life').value.trim() || null,
        hobby_life: document.getElementById('hobby_life').value.trim() || null,
        health_care: document.getElementById('health_care').value.trim() || null,
        family_news: document.getElementById('family_news').value.trim() || null,
        recent_interests: document.getElementById('recent_interests').value.trim() || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null
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
        
        // 이메일 알림 전송 (비동기, 오류가 발생해도 계속 진행)
        if (data && data.length > 0) {
            sendUpdateNotification(data[0].id, formData.name).catch(err => {
                console.error('이메일 알림 전송 실패:', err);
                // 사용자에게 알리지 않음 (백그라운드 작업)
            });
            
            // OpenAI를 사용한 자동 댓글 생성 (비동기, 오류가 발생해도 계속 진행)
            generateAutoComment(formData)
                .then(commentContent => {
                    if (commentContent) {
                        return saveAutoComment(data[0].id, commentContent);
                    }
                    return null;
                })
                .then(savedComment => {
                    if (savedComment) {
                        // 자동 댓글이 저장되었으면 목록 새로고침
                        loadUpdates();
                    }
                })
                .catch(err => {
                    console.error('자동 댓글 생성 실패:', err);
                    // 사용자에게 알리지 않음 (백그라운드 작업)
                });
        }
        
        // 폼 초기화
        document.getElementById('updateForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('imagePreview').innerHTML = '';

        // 목록 새로고침
        await loadUpdates();
    } catch (error) {
        console.error('Error:', error);
        alert('근황 공유 중 오류가 발생했습니다: ' + error.message);
    }
}

// 근황 목록 불러오기
async function loadUpdates() {
    if (!currentGroupId) {
        return;
    }

    const updatesList = document.getElementById('updatesList');
    if (!updatesList) return;
    
    updatesList.innerHTML = '<p class="loading">로딩 중...</p>';

    try {
        const { data, error } = await supabase
            .from('cat_updates')
            .select('*')
            .eq('group_id', currentGroupId)
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
        
        // 댓글 폼의 드롭다운 업데이트 (모임 멤버로)
        await updateCommentDropdowns();
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

    // 이미지 표시 HTML
    let imagesHtml = '';
    if (update.image_urls && update.image_urls.length > 0) {
        imagesHtml = `
            <div class="update-images">
                ${update.image_urls.map(url => `
                    <div class="update-image-item">
                        <img src="${escapeHtml(url)}" alt="첨부 이미지" class="update-image" onclick="openImageModal('${escapeHtml(url)}')">
                    </div>
                `).join('')}
            </div>
        `;
    } else if (update.image_url) {
        // 이전 버전 호환성 (단일 이미지)
        imagesHtml = `
            <div class="update-images">
                <div class="update-image-item">
                    <img src="${escapeHtml(update.image_url)}" alt="첨부 이미지" class="update-image" onclick="openImageModal('${escapeHtml(update.image_url)}')">
                </div>
            </div>
        `;
    }

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
                            <select class="edit-commenter-name" required data-current-value="${escapeHtml(comment.commenter_name)}">
                                <option value="">이름 선택</option>
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
                ${imagesHtml}
            </div>
            <div class="update-edit-form" data-update-id="${update.id}" style="display: none;">
                <form class="edit-update-form">
                    <div class="form-group">
                        <label>이름 *</label>
                        <select class="edit-name" required data-current-value="${escapeHtml(update.name)}">
                            <option value="">이름 선택</option>
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
                    <div class="form-group">
                        <label>사진 수정</label>
                        <div class="edit-images-section">
                            <div class="edit-existing-images" data-update-id="${update.id}">
                                ${(update.image_urls && update.image_urls.length > 0) || update.image_url ? `
                                    <div class="existing-images-label">기존 사진</div>
                                    <div class="existing-images-list">
                                        ${(update.image_urls || (update.image_url ? [update.image_url] : [])).map((url, idx) => `
                                            <div class="existing-image-item" data-image-url="${escapeHtml(url)}" data-image-index="${idx}">
                                                <img src="${escapeHtml(url)}" alt="기존 이미지" class="existing-image-preview">
                                                <button type="button" class="remove-existing-image-btn" data-image-url="${escapeHtml(url)}" title="삭제">×</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<p class="no-images-message">등록된 사진이 없습니다.</p>'}
                            </div>
                            <div class="edit-new-images">
                                <label for="edit-images-${update.id}" class="add-images-label">새 사진 추가</label>
                                <input type="file" class="edit-images-input" id="edit-images-${update.id}" accept="image/*" multiple>
                                <div class="edit-image-preview" data-update-id="${update.id}"></div>
                            </div>
                        </div>
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
                        </select>
                        <textarea class="comment-content-input" rows="2" placeholder="댓글을 입력하세요..." required></textarea>
                        <button type="submit" class="comment-submit-btn">댓글 작성</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// 이미지 모달 열기
function openImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="image-modal-close">&times;</span>
            <img src="${escapeHtml(imageUrl)}" alt="확대 이미지" class="image-modal-image">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.image-modal-close');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// XSS 방지를 위한 HTML 이스케이프
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 이메일 형식 검증
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 근황 내용을 텍스트로 포맷팅
function formatUpdateContent(updateData) {
    const parts = [];
    
    if (updateData.work_life) {
        parts.push(`회사생활: ${updateData.work_life}`);
    }
    if (updateData.hobby_life) {
        parts.push(`취미생활: ${updateData.hobby_life}`);
    }
    if (updateData.health_care) {
        parts.push(`건강관리: ${updateData.health_care}`);
    }
    if (updateData.family_news) {
        parts.push(`가족들 소식: ${updateData.family_news}`);
    }
    if (updateData.recent_interests) {
        parts.push(`최근 관심사: ${updateData.recent_interests}`);
    }
    
    return parts.join('\n');
}

// OpenAI를 사용한 자동 댓글 생성 (Supabase Edge Function 사용)
async function generateAutoComment(updateData) {
    try {
        // 근황 내용 포맷팅
        const updateContent = formatUpdateContent(updateData);
        
        // 내용이 없으면 댓글 생성하지 않음
        if (!updateContent || updateContent.trim() === '') {
            console.log('근황 내용이 없어 자동 댓글을 생성하지 않습니다.');
            return null;
        }

        // Supabase Edge Function 호출
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-auto-comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                updateContent: updateContent
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const commentContent = data.comment;
        
        if (!commentContent || commentContent.trim() === '') {
            console.log('생성된 댓글 내용이 비어있습니다.');
            return null;
        }

        return commentContent;
    } catch (error) {
        console.error('OpenAI 자동 댓글 생성 오류:', error);
        // 오류가 발생해도 사용자에게 알리지 않음 (백그라운드 작업)
        return null;
    }
}

// 자동 댓글 저장
async function saveAutoComment(updateId, commentContent) {
    try {
        // 자동 댓글 작성자 이름 (시스템 또는 AI)
        const autoCommenterName = 'AI';
        
        const { data, error } = await supabase
            .from('cat_comments')
            .insert([{
                update_id: updateId,
                commenter_name: autoCommenterName,
                content: commentContent
            }])
            .select();

        if (error) {
            throw error;
        }

        console.log('자동 댓글이 생성되었습니다.');
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('자동 댓글 저장 오류:', error);
        return null;
    }
}

// 근황 작성 시 이메일 알림 전송
async function sendUpdateNotification(updateId, authorName) {
    if (!currentGroupId) return;
    
    try {
        const response = await fetch(`https://nqwjvrznwzmfytjlpfsk.supabase.co/functions/v1/send-catchup-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2p2cnpud3ptZnl0amxwZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzA4NTEsImV4cCI6MjA3Mzk0Njg1MX0.R3Y2Xb9PmLr3sCLSdJov4Mgk1eAmhaCIPXEKq6u8NQI`
            },
            body: JSON.stringify({
                type: 'update',
                groupId: currentGroupId,
                updateId: updateId,
                authorName: authorName
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log(`이메일 알림 전송 완료: ${result.sent}명에게 발송`);
        } else {
            console.error('이메일 알림 전송 실패:', result.error);
        }
    } catch (error) {
        console.error('이메일 알림 전송 오류:', error);
    }
}

// 댓글 작성 시 이메일 알림 전송
async function sendCommentNotification(groupId, updateId, commentId, authorName) {
    try {
        const response = await fetch(`https://nqwjvrznwzmfytjlpfsk.supabase.co/functions/v1/send-catchup-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2p2cnpud3ptZnl0amxwZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzA4NTEsImV4cCI6MjA3Mzk0Njg1MX0.R3Y2Xb9PmLr3sCLSdJov4Mgk1eAmhaCIPXEKq6u8NQI`
            },
            body: JSON.stringify({
                type: 'comment',
                groupId: groupId,
                updateId: updateId,
                commentId: commentId,
                authorName: authorName
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log(`이메일 알림 전송 완료: ${result.sent}명에게 발송`);
        } else {
            console.error('이메일 알림 전송 실패:', result.error);
        }
    } catch (error) {
        console.error('이메일 알림 전송 오류:', error);
    }
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
        form.removeEventListener('submit', handleCommentSubmit);
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

        // 이메일 알림 전송 (비동기, 오류가 발생해도 계속 진행)
        if (data && data.length > 0) {
            // 근황의 그룹 ID 가져오기
            const { data: updateData } = await supabase
                .from('cat_updates')
                .select('group_id')
                .eq('id', updateId)
                .single();
            
            if (updateData) {
                sendCommentNotification(
                    updateData.group_id,
                    updateId,
                    data[0].id,
                    commenterName
                ).catch(err => {
                    console.error('이메일 알림 전송 실패:', err);
                    // 사용자에게 알리지 않음 (백그라운드 작업)
                });
            }
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
        btn.removeEventListener('click', handleEditUpdate);
        btn.addEventListener('click', handleEditUpdate);
    });

    // 삭제 버튼
    document.querySelectorAll('.delete-update-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteUpdate);
        btn.addEventListener('click', handleDeleteUpdate);
    });

    // 수정 폼 제출
    document.querySelectorAll('.edit-update-form').forEach(form => {
        form.removeEventListener('submit', handleSaveUpdate);
        form.addEventListener('submit', handleSaveUpdate);
    });

    // 수정 취소 버튼
    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleCancelEdit);
        btn.addEventListener('click', handleCancelEdit);
    });

    // 댓글 수정 버튼
    document.querySelectorAll('.edit-comment-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditComment);
        btn.addEventListener('click', handleEditComment);
    });

    // 댓글 삭제 버튼
    document.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteComment);
        btn.addEventListener('click', handleDeleteComment);
    });

    // 댓글 수정 폼 제출
    document.querySelectorAll('.edit-comment-form').forEach(form => {
        form.removeEventListener('submit', handleSaveComment);
        form.addEventListener('submit', handleSaveComment);
    });

    // 댓글 수정 취소 버튼
    document.querySelectorAll('.cancel-comment-edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleCancelCommentEdit);
        btn.addEventListener('click', handleCancelCommentEdit);
    });
}

function handleEditUpdate(e) {
    const updateId = e.target.closest('.edit-update-btn').dataset.updateId;
    toggleUpdateEditMode(updateId);
}

function handleDeleteUpdate(e) {
    const updateId = e.target.closest('.delete-update-btn').dataset.updateId;
    if (confirm('이 근황을 삭제하시겠습니까?')) {
        deleteUpdate(updateId);
    }
}

function handleSaveUpdate(e) {
    e.preventDefault();
    const updateId = e.target.closest('.update-edit-form').dataset.updateId;
    saveUpdate(updateId);
}

function handleCancelEdit(e) {
    const updateId = e.target.closest('.update-edit-form').dataset.updateId;
    toggleUpdateEditMode(updateId);
}

function handleEditComment(e) {
    const commentId = e.target.closest('.edit-comment-btn').dataset.commentId;
    toggleCommentEditMode(commentId);
}

function handleDeleteComment(e) {
    const commentId = e.target.closest('.delete-comment-btn').dataset.commentId;
    if (confirm('이 댓글을 삭제하시겠습니까?')) {
        deleteComment(commentId);
    }
}

function handleSaveComment(e) {
    e.preventDefault();
    const commentId = e.target.closest('.comment-edit-form').closest('.comment-edit-form').dataset.commentId;
    saveComment(commentId);
}

function handleCancelCommentEdit(e) {
    const commentId = e.target.closest('.comment-edit-form').dataset.commentId;
    toggleCommentEditMode(commentId);
}

// 근황 수정 모드 토글
function toggleUpdateEditMode(updateId) {
    const card = document.querySelector(`.update-card[data-update-id="${updateId}"]`);
    const display = card.querySelector('.update-content-display');
    const editForm = card.querySelector('.update-edit-form');

    if (editForm.style.display === 'none') {
        display.style.display = 'none';
        editForm.style.display = 'block';
        
        // 이미지 수정 관련 이벤트 리스너 추가
        setupEditImageHandlers(updateId);
    } else {
        display.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// 이미지 수정 핸들러 설정
function setupEditImageHandlers(updateId) {
    const editForm = document.querySelector(`.update-edit-form[data-update-id="${updateId}"]`);
    if (!editForm) return;
    
    // 기존 이미지 삭제 버튼
    const removeButtons = editForm.querySelectorAll('.remove-existing-image-btn');
    removeButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const imageItem = btn.closest('.existing-image-item');
            if (imageItem) {
                imageItem.remove();
                
                // 이미지가 모두 삭제된 경우 메시지 표시
                const existingImagesList = editForm.querySelector('.existing-images-list');
                if (existingImagesList && existingImagesList.children.length === 0) {
                    const existingImagesContainer = editForm.querySelector('.edit-existing-images');
                    if (existingImagesContainer) {
                        existingImagesContainer.innerHTML = '<p class="no-images-message">등록된 사진이 없습니다.</p>';
                    }
                }
            }
        };
    });
    
    // 새 이미지 미리보기
    const newImagesInput = editForm.querySelector('.edit-images-input');
    const previewContainer = editForm.querySelector('.edit-image-preview');
    
    if (newImagesInput && previewContainer) {
        newImagesInput.onchange = (e) => {
            handleEditImagePreview(e, previewContainer);
        };
    }
}

// 수정 폼의 이미지 미리보기 처리
function handleEditImagePreview(e, previewContainer) {
    previewContainer.innerHTML = '';
    
    const input = e.target;
    const files = input.files;
    if (files.length === 0) return;

    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'preview-image-item';
            imgContainer.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = readerEvent.target.result;
            img.className = 'preview-image';
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-image-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => removeEditImagePreview(index, previewContainer, input);
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(removeBtn);
            previewContainer.appendChild(imgContainer);
        };
        reader.readAsDataURL(file);
    });
}

// 수정 폼의 이미지 미리보기 제거
function removeEditImagePreview(index, previewContainer, input) {
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    input.files = dt.files;
    
    // 미리보기 다시 생성
    const event = new Event('change');
    input.dispatchEvent(event);
}

// 근황 저장
async function saveUpdate(updateId) {
    const editForm = document.querySelector(`.update-edit-form[data-update-id="${updateId}"]`);
    
    // 기존 이미지 URL 목록 가져오기 (삭제되지 않은 것만)
    const existingImagesContainer = editForm.querySelector('.edit-existing-images');
    const remainingImages = [];
    if (existingImagesContainer) {
        const existingImageItems = existingImagesContainer.querySelectorAll('.existing-image-item');
        existingImageItems.forEach(item => {
            const imageUrl = item.dataset.imageUrl;
            if (imageUrl) {
                remainingImages.push(imageUrl);
            }
        });
    }
    
    // 새로 추가할 이미지 업로드
    const newImagesInput = editForm.querySelector('.edit-images-input');
    let newImageUrls = [];
    
    if (newImagesInput && newImagesInput.files.length > 0) {
        try {
            newImageUrls = await uploadImages(newImagesInput.files);
        } catch (error) {
            let errorMessage = '이미지 업로드 중 오류가 발생했습니다: ' + error.message;
            
            // 버킷이 없는 경우 상세 안내
            if (error.message && error.message.includes('버킷이 생성되지 않았습니다')) {
                errorMessage += '\n\nSupabase 대시보드에서 다음 단계를 따라주세요:\n';
                errorMessage += '1. Storage 메뉴로 이동\n';
                errorMessage += '2. "New bucket" 클릭\n';
                errorMessage += '3. 버킷 이름: catchup-images\n';
                errorMessage += '4. Public bucket 옵션 활성화\n';
                errorMessage += '5. Create bucket 클릭';
            }
            
            alert(errorMessage);
            return;
        }
    }
    
    // 기존 이미지와 새 이미지 합치기
    const allImageUrls = [...remainingImages, ...newImageUrls];
    
    const formData = {
        name: editForm.querySelector('.edit-name').value.trim(),
        date: editForm.querySelector('.edit-date').value,
        work_life: editForm.querySelector('.edit-work_life').value.trim() || null,
        hobby_life: editForm.querySelector('.edit-hobby_life').value.trim() || null,
        health_care: editForm.querySelector('.edit-health_care').value.trim() || null,
        family_news: editForm.querySelector('.edit-family_news').value.trim() || null,
        recent_interests: editForm.querySelector('.edit-recent_interests').value.trim() || null,
        image_urls: allImageUrls.length > 0 ? allImageUrls : null
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