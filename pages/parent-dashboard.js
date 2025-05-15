document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Xóa thông tin người dùng khỏi localStorage
    localStorage.removeItem('currentUser');
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = '../auth/signin.html';
});

function initSettings() {
    const settings = {
        notifications: true,
        progress_updates: true,
        achievements: true,
        class_announcements: true
    };

    // Load settings từ localStorage nếu có
    const savedSettings = localStorage.getItem('parentSettings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
    }

    // Áp dụng settings vào các checkbox
    Object.keys(settings).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = settings[key];
        }
    });

    // Lưu settings khi thay đổi
    document.querySelectorAll('.setting-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            settings[checkbox.id] = checkbox.checked;
            localStorage.setItem('parentSettings', JSON.stringify(settings));
        });
    });
}

// Thêm hàm initNavigation
function initNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-section');

    // Ẩn tất cả sections trừ section đầu tiên
    sections.forEach((section, index) => {
        if (index === 0) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Xử lý click cho từng menu item
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Xóa active class từ tất cả menu items
            menuItems.forEach(i => i.classList.remove('active'));
            // Thêm active class cho item được click
            item.classList.add('active');

            // Lấy section cần hiển thị từ data-section
            const targetSection = item.getAttribute('data-section');
            
            // Ẩn tất cả sections
            sections.forEach(section => {
                section.classList.remove('active');
            });

            // Hiển thị section được chọn
            const selectedSection = document.getElementById(targetSection);
            if (selectedSection) {
                selectedSection.classList.add('active');
            }
        });
    });
}

// Dữ liệu mẫu
let linkedChildren = [];
let notifications = [];

// Khởi tạo dashboard
document.addEventListener('DOMContentLoaded', async () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }
        
        // Load dữ liệu phụ huynh
        const userData = await loadParentData(user.uid);
        initNavigation(); // Gọi initNavigation trước
        initNotifications(userData);
        initSettings(userData);
        initProfileDropdown();
        initLinkChild();
        initEnrollChild();
        renderDashboard(userData);
    });
});

// Load dữ liệu phụ huynh từ Firestore
async function loadParentData(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) return {};

        const userData = userDoc.data();

        // Hiển thị thông tin phụ huynh
        const userInfo = document.querySelector('.user-info h2');
        if (userInfo) userInfo.textContent = userData.full_name || "Phụ huynh";
        const userRole = document.querySelector('.user-info p');
        if (userRole) userRole.textContent = "Phụ huynh";

        // Load danh sách con
        if (userData.parent_role?.listOfChildren) {
            // Chuyển đổi mảng các object thành mảng các child_id
            const childIds = userData.parent_role.listOfChildren.map(child => child.child_id);
            
            // Lấy thông tin chi tiết của từng học sinh
            linkedChildren = await Promise.all(childIds.map(async (childId) => {
                try {
                    const childDoc = await firebase.firestore()
                        .collection('users')
                        .doc(childId)
                        .get();
                    
                    if (!childDoc.exists) {
                        console.error(`Không tìm thấy học sinh với ID: ${childId}`);
                        return null;
                    }
                    
                    const childData = childDoc.data();
                    if (!childData) return null;

                    // Lấy thông tin joined_at từ class nếu học sinh đã tham gia lớp
                    let joinedAt = null;
                    let className = null;
                    if (childData.student_role?.class_id) {
                        // find user has teacher_role.listOfClasses has class_id dùng where  
                       const classInfo = await getClassFromId(childData.student_role.class_id)
                        if (classInfo) {
                            className = classInfo.name;
                            const studentInfo = classInfo.students?.find(s => s.student_id === childId);
                            if (studentInfo) {
                                joinedAt = studentInfo.joined_at;
                            }
                        }
                    }

                    return {
                        id: childId,
                        email: childData.email || '',
                        name: childData.full_name || 'Chưa có tên',
                        classCode: childData.student_role?.class_id || null,
                        className: className,
                        joinedAt: joinedAt,
                        totalLearningTime: childData.student_role?.total_learning_time || 0,
                        diamonds: childData.student_role?.diamonds || 0,
                        achievements: childData.student_role?.badges || []
                    };
                } catch (error) {
                    console.error(`Error loading child data for ID ${childId}:`, error);
                    return null;
                }
            }));

            // Lọc bỏ các giá trị null
            linkedChildren = linkedChildren.filter(child => child !== null);
        }

        return userData;
    } catch (error) {
        console.error('Error loading parent data:', error);
        return {};
    }
}

// Render dashboard
function renderDashboard(userData) {
    //Render ở cả hai nơi
    renderChildrenList('overview');
    renderChildrenList('children');
    renderNotifications();
    updateStats();
}

// Thêm hàm formatTimeAgo
function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

// Thêm hàm renderChildrenList
function renderChildrenList(sectionId) {
    const childrenGrid = document.querySelector(`#${sectionId} .children-grid`);
    if (!childrenGrid) {
        console.error(`Không tìm thấy children-grid trong section ${sectionId}`);
        return;
    }

    if (!linkedChildren || linkedChildren.length === 0) {
        childrenGrid.innerHTML = `
            <div class="no-children-message">
                <p>Bạn chưa liên kết với học sinh nào.</p>
                <button class="btn-primary" onclick="document.getElementById('link-child-btn').click()">
                    Liên kết với con
                </button>
            </div>
        `;
        return;
    }

    childrenGrid.innerHTML = linkedChildren.map(child => `
        <div class="child-card">
            <div class="child-info">
                <h3>${child.name}</h3>
                <p>${child.email}</p>
                <p>Thời gian học tập: ${child.totalLearningTime || 0}</p>
                <p>Kim cương: ${child.diamonds || 0}</p>
                <p>Thành tích: ${child.achievements.length || 0}</p>
                ${child.classCode ? `
                    <p class="class-info">Tên lớp: ${child.className || 'Chưa ghi danh lớp học'}</p>
                    <p class="class-info">Mã lớp: ${child.classCode || 'Chưa ghi danh lớp học'}</p>
                    <p class="enrolled-date">Ghi danh: ${child.joinedAt ? formatDate(child.joinedAt) : 'Chưa ghi danh lớp học'}</p>    
                ` : '<p class="not-enrolled">Chưa ghi danh lớp học</p>'}
            </div>
            <div class="child-actions">
                <button class="btn-primary" onclick="toggleProgressDetails('${child.id}', '${sectionId}')">
                    Xem tiến độ
                </button>
                <button class="btn-danger" data-child-id="${child.id}">
                    Xóa liên kết
                </button>
            </div>
      
        </div>
    `).join('');

    // Thêm event listener cho các nút xóa liên kết
    childrenGrid.querySelectorAll('.btn-danger').forEach(button => {
        button.addEventListener('click', async () => {
            const childId = button.dataset.childId;
            if (confirm('Bạn có chắc muốn xóa liên kết với học sinh này?')) {
                try {
                    const user = firebase.auth().currentUser;
                    if (!user) return;

                    // Cập nhật trong Firestore
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    const userData = userDoc.data();
                    
                    // Cập nhật danh sách con của phụ huynh
                    const updatedChildren = userData.parent_role.listOfChildren.filter(
                        child => child.child_id !== childId
                    );

                    await firebase.firestore().collection('users').doc(user.uid).update({
                        'parent_role.listOfChildren': updatedChildren
                    });

                    // Cập nhật danh sách con trong bộ nhớ
                    linkedChildren = linkedChildren.filter(child => child.id !== childId);

                    // Cập nhật UI ở cả hai section
                    renderChildrenList('overview');
                    renderChildrenList('children');
                    updateStats();
                    // cập nhật bên student_role
                    await firebase.firestore()
                        .collection('users')
                        .doc(childId)
                        .update({
                            'student_role.parent_id': null
                        });
                    // Thêm thông báo
                    addNotification('Đã xóa liên kết với học sinh thành công');
                } catch (error) {
                    console.error('Error removing child:', error);
                    alert('Có lỗi xảy ra khi xóa liên kết');
                }
            }
        });
    });
}

// Thêm hàm getErrorDetail
async function getErrorDetail(log) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(log.student_id).get();
        const userData = userDoc.data();
        const errorDetail = userData.student_role?.learning_progress.find(progress => 
            log.activity_name.includes(progress.lesson)
        )?.error_detail || '';
        return { errorDetail };
    } catch (error) {
        console.error('Error getting error detail:', error);
        return { errorDetail: '' };
    }
}

// Cập nhật lại hàm renderActivityTable
function renderActivityTable(activityLogs) {
    if (!activityLogs || !activityLogs.length) return '<div>Chưa có hoạt động nào</div>';
    
    return `
        <div class="activity-section">
            <div class="activity-header">
                <div class="activity-filters">
                    <select class="time-filter">
                        <option value="Tất cả thời gian">Tất cả thời gian</option>
                        <option value="7 ngày qua">7 ngày qua</option>
                        <option value="30 ngày qua">30 ngày qua</option>
                    </select>
                    <select class="type-filter">
                        <option value="Tất cả hoạt động">Tất cả hoạt động</option>
                        <option value="Học tập">Học tập</option>
                        <option value="Luyện tập">Luyện tập</option>
                    </select>
                </div>
                <div class="activity-summary">
                    <span><strong>0</strong> phút bài tập</span>
                    <span style="margin: 0 10px;">|</span>
                    <span><strong>0</strong> phút học</span>
                </div>
            </div>
            <div class="activity-table-wrapper">
                <table class="activity-table">
                    <thead>
                        <tr>
                            <th>HOẠT ĐỘNG</th>
                            <th>NGÀY</th>
                            <th>SỐ CÂU ĐÚNG/TỔNG SỐ CÂU</th>
                            <th>LỖI SAI</th>
                            <th>THỜI GIAN (PHÚT)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activityLogs.map((log, idx) => {
                            // Format ngày
                            let dateStr = '';
                            if (log.date) {
                                let d = null;
                                if (typeof log.date.toDate === 'function') {
                                    d = log.date.toDate();
                                } else if (typeof log.date === 'string') {
                                    d = new Date(log.date);
                                }
                                if (d && !isNaN(d.getTime())) {
                                    dateStr = `Thg ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} vào lúc ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                }
                            }
                            
                            // Xử lý lỗi sai
                            let errorCell = '-';
                            if (log.activity_type === "Học tập") {
                                const errorCount = (log.total_problems || 0) - (log.correct_problems || 0);
                                if (errorCount > 0) {
                                    errorCell = `<a href="#" class="show-error-detail" data-log='${JSON.stringify(log)}'>${errorCount}</a>
                                        <div class="error-detail-popup" style="display:none;">
                                            <div class="error-detail-content">Đang tải chi tiết lỗi...</div>
                                            <button class="close-error-popup">Đóng</button>
                                        </div>`;
                                } else {
                                    errorCell = '0';
                                }
                            }

                            return `
                                <tr>
                                    <td>
                                        <strong>${log.activity_name || ''}</strong><br>
                                        <span class="activity-desc">${log.description || ''}</span>
                                    </td>
                                    <td>${dateStr}</td>
                                    <td>${log.correct_problems || 0}/${log.total_problems || 0}</td>
                                    <td style="position:relative;">${errorCell}</td>
                                    <td>${log.time_taken || 0}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}



// Cập nhật hàm toggleProgressDetails để gọi initErrorDetailHandlers
async function toggleProgressDetails(childId, sectionId) {
    try {
        // Lấy dữ liệu chi tiết của học sinh
        const child = linkedChildren.find(c => c.id === childId);
        if (!child) return;

        // Lấy dữ liệu Firestore chi tiết
        const childDoc = await firebase.firestore().collection('users').doc(childId).get();
        const childData = childDoc.data();
        const studentRole = childData.student_role || {};

        // Tiến độ học tập
        const progressTree = await getStudentProgressTree(childId);
        // Nhật ký hoạt động
        const activityLogs = studentRole.activity_logs || [];
        // Thành tích
        const badges = studentRole.badges || [];

        // Render modal
        document.getElementById('progress-modal-title').textContent = `Tiến độ học tập của ${child.name}`;
        document.querySelector('.tab-content.tab-progress').innerHTML = renderProgressTree(progressTree);
        document.querySelector('.tab-content.tab-activity').innerHTML = renderActivityTable(activityLogs);
        document.querySelector('.tab-content.tab-achievements').innerHTML = renderBadges(badges);

        // Gọi các hàm khởi tạo
        enableChapterCollapse();
        initActivityFilters();
        initErrorDetailHandlers();

        // Hiện modal
        showModal();

        // Tab switching
        document.querySelectorAll('.progress-modal-tabs .tab-btn').forEach(btn => {
            btn.onclick = function() {
                document.querySelectorAll('.progress-modal-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const tab = this.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                document.querySelector('.tab-content.tab-' + tab).classList.add('active');
            };
        });
    } catch (error) {
        console.error('Error in toggleProgressDetails:', error);
    }
}

// Hàm chuyển tab
window.showTab = function(childId, tab) {
    document.getElementById(`tab-progress-${childId}`).style.display = tab === 'progress' ? 'block' : 'none';
    document.getElementById(`tab-activity-${childId}`).style.display = tab === 'activity' ? 'block' : 'none';
    document.getElementById(`tab-badges-${childId}`).style.display = tab === 'badges' ? 'block' : 'none';
    // Đổi active class cho nút tab nếu muốn
}

// Hàm lấy tiến độ học tập dạng cây (giống student-dashboard.js)
async function getStudentProgressTree(studentId) {
    // Lấy dữ liệu học sinh
    const studentDoc = await firebase.firestore().collection('users').doc(studentId).get();
    const studentData = studentDoc.data();
    const activityLogs = studentData.student_role?.activity_logs || [];

    // Định nghĩa cấu trúc chương/bài
    const LESSON_STRUCTURE = {
        chapters: [
            {
                title: "Chương 1: Làm quen với các số đến 10",
                lessons: [
                    { title: "Bài 1: Các số 1, 2, 3", activities: ["Đếm", "So sánh"] },
                    { title: "Bài 2: Các số 4, 5, 6", activities: ["Đếm", "So sánh"] },
                    { title: "Bài 3: Các số 7, 8, 9, 10", activities: ["Đếm", "So sánh"] },
                    { title: "Bài 4: Nhiều hơn - Ít hơn - Bằng nhau", activities: ["Đếm", "So sánh"] }
                ]
            },
            {
                title: "Chương 2: Phép cộng, phép trừ trong phạm vi 10",
                lessons: [
                    { title: "Bài 1: Làm quen với phép cộng", activities: ["Cộng vui", "Giải đố phép cộng", "Luyện tập phép cộng"] },
                    { title: "Bài 2: Phép cộng trong phạm vi 10", activities: ["Cộng vui", "Giải đố phép cộng", "Luyện tập phép cộng"] },
                    { title: "Bài 3: Làm quen với phép trừ", activities: ["Trừ vui", "Giải đố phép trừ", "Luyện tập phép trừ"] },
                    { title: "Bài 4: Phép trừ trong phạm vi 10", activities: ["Trừ vui", "Giải đố phép trừ", "Luyện tập phép trừ"] }
                ]
            },
            {
                title: "Chương 3: Phép cộng, phép trừ trong phạm vi 100",
                lessons: [
                    { title: "Bài 1: Phép cộng các số đến 20", activities: ["Cộng 2 chữ số", "Toán chéo"] },
                    { title: "Bài 2: Phép cộng các số đến 20", activities: ["Cộng 2 chữ số", "Toán chéo"] },
                    { title: "Bài 3: Phép cộng số từ 21 tới 40", activities: ["Cộng 2 chữ số", "Toán chéo"] },
                    { title: "Bài 4: Phép cộng số từ 21 tới 40", activities: ["Cộng 2 chữ số", "Toán chéo"] },
                    { title: "Bài 5: Phép trừ số từ 41 tới 70", activities: ["Trừ 2 chữ số", "Toán chéo"] },
                    { title: "Bài 6: Phép trừ số từ 41 tới 70", activities: ["Trừ 2 chữ số", "Toán chéo"] },
                    { title: "Bài 7: Phép cộng số từ 71 tới 100", activities: ["Cộng 2 chữ số", "Toán chéo"] },
                    { title: "Bài 8: Phép trừ số từ 71 tới 100", activities: ["Trừ 2 chữ số", "Toán chéo"] }
                ]
            },
            {
                title: "Chương 4: Hình học và đo lường",
                lessons: [
                    { title: "Bài 1: Hình học cơ bản", activities: ["Hình học"] },
                    { title: "Bài 2: Phương hướng", activities: ["Phương hướng"] },
                    { title: "Bài 3: Độ dài", activities: ["Độ dài"] },
                    { title: "Bài 4: Thời gian", activities: ["Thời gian"] }
                ]
            }
        ]
    };

    // Duyệt từng chương
    const progressTree = LESSON_STRUCTURE.chapters.map(chapter => {
        // Duyệt từng bài trong chương
        const lessons = chapter.lessons.map(lesson => {
            // Tìm các activity log liên quan đến bài này (dựa vào tên bài)
            const logs = activityLogs.filter(log =>
                log.activity_type === "Học tập" &&
                log.activity_name && log.activity_name.includes(lesson.title)
            );
            // Tính tổng số câu đúng và tổng số câu
            let totalCorrect = 0, total = 0;
            logs.forEach(log => {
                totalCorrect += log.correct_problems || 0;
                total += log.total_problems || 0;
            });
            // Tính phần trăm hoàn thành
            let percent = 0;
            if (total > 0) {
                percent = (totalCorrect / total) * 100;
                percent = Math.round(percent); // Làm tròn cho đẹp
            }
            return {
                name: lesson.title,
                percent: percent
            };
        });

        // Tính phần trăm hoàn thành của chương là trung bình các bài
        const chapterPercent = lessons.length
            ? Math.round(lessons.reduce((sum, l) => sum + l.percent, 0) / lessons.length)
            : 0;

        return {
            chapter: chapter.title,
            percent: chapterPercent,
            lessons: lessons
        };
    });
    return progressTree;
}

// Sau khi render xong, enable accordion:
function enableChapterAccordion() {
    document.querySelectorAll('.progress-chapter .chapter-header').forEach(header => {
        header.addEventListener('click', function() {
            const chapter = header.closest('.progress-chapter');
            const lessonList = chapter.querySelector('.lesson-list');
            const icon = header.querySelector('.chapter-toggle i');
            lessonList.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-right');
        });
    });
}

// Thêm hàm filter activities
function filterActivities() {
    const timeFilter = document.querySelector('.time-filter');
    const typeFilter = document.querySelector('.type-filter');
    const tbody = document.querySelector('.activity-table tbody');
    
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const now = new Date();
    
    // Lọc theo filter
    let filteredRows = rows;

    // Lọc theo thời gian
    if (timeFilter.value !== 'Tất cả thời gian') {
        const days = parseInt(timeFilter.value.split(' ')[0]);
        filteredRows = filteredRows.filter(row => {
            const dateCell = row.cells[1].textContent;
            if (!dateCell) return false;
            
            const dateMatch = dateCell.match(/Thg (\d{2}) (\d{2}), (\d{4})/);
            if (!dateMatch) return false;
            
            const [_, month, day, year] = dateMatch;
            const activityDate = new Date(year, month - 1, day);
            const diff = (now - activityDate) / (1000 * 60 * 60 * 24);
            return diff <= days;
        });
    }

    // Lọc theo loại hoạt động
    if (typeFilter.value !== 'Tất cả hoạt động') {
        filteredRows = filteredRows.filter(row => {
            const activityType = row.cells[0].querySelector('strong').textContent.trim();
            return activityType.startsWith(typeFilter.value);
        });
    }

    // Ẩn/hiện các dòng - Cách đơn giản hơn
    rows.forEach(row => {
        row.style.display = 'none'; // Ẩn tất cả trước
    });
    
    filteredRows.forEach(row => {
        row.style.display = ''; // Hiện những row được lọc
    });

    // Cập nhật tổng số phút
    updateActivitySummary(filteredRows);
}

// Thêm hàm cập nhật tổng số phút
function updateActivitySummary(visibleRows) {
    const totalPracticeTime = visibleRows
        .filter(row => row.cells[0].querySelector('strong').textContent === 'Luyện tập')
        .reduce((total, row) => total + parseInt(row.cells[4].textContent || 0), 0);
    
    const totalLearningTime = visibleRows
        .reduce((total, row) => total + parseInt(row.cells[4].textContent || 0), 0);

    const summaryElement = document.querySelector('.activity-summary');
    if (summaryElement) {
        summaryElement.innerHTML = `
            <span><strong>${totalPracticeTime}</strong> phút bài tập</span>
            <span style="margin: 0 10px;">|</span>
            <span><strong>${totalLearningTime}</strong> phút học</span>
        `;
    }
}

// Thêm hàm initActivityFilters
function initActivityFilters() {
    const timeFilter = document.querySelector('.time-filter');
    const typeFilter = document.querySelector('.type-filter');
    
    if (timeFilter) {
        timeFilter.addEventListener('change', () => {
            filterActivities();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            filterActivities();
        });
    }
}

// Thêm hàm render thành tích
function renderBadges(badges) {
    if (!badges || !badges.length) return '<div>Chưa có thành tích nào</div>';
    return `
        <div class="achievements-grid">
            ${badges.map(badge => {
                // Format ngày đạt được
                let dateStr = '';
                if (badge.obtained_at) {
                    if (typeof badge.obtained_at === 'string') {
                        dateStr = badge.obtained_at;
                    } else if (typeof badge.obtained_at.toDate === 'function') {
                        const d = badge.obtained_at.toDate();
                        dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    }
                }
                return `
                    <div class="achievement-card">
                        <div class="achievement-icon">
                            <img src="../images/badges/${badge.BadgeID || badge.id}.png" alt="${badge.name || badge.BadgeID}" style="width:48px;height:48px;object-fit:contain;">
                        </div>
                        <h5>${badge.name || badge.BadgeID}</h5>
                        <p>${badge.Description || badge.description || ''}</p>
                        <div class="achievement-date">${dateStr ? `Đạt được: ${dateStr}` : ''}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Thêm hàm format thời gian
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} giờ ${mins} phút`;
}

// Render notifications
function renderNotifications() {
    const notificationList = document.querySelector('.notification-list');
    if (!notificationList) return;

    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
            <div class="notification-title">${notification.message}</div>
            <div class="notification-time">${notification.time}</div>
        </div>
    `).join('');

    // Thêm sự kiện click cho từng thông báo
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const notificationId = item.dataset.id;
            const user = firebase.auth().currentUser;
            if (!user) return;

            try {
                // Cập nhật trạng thái đã đọc trong Firestore
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                const updatedNotifications = userData.notifications.map(n => 
                    n.id === notificationId ? {...n, read: true} : n
                );

                await firebase.firestore().collection('users').doc(user.uid).update({
                    notifications: updatedNotifications
                });

                // Cập nhật UI
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationBadge();
                renderNotifications();
                }
            } catch (error) {
                console.error('Error updating notification:', error);
            }
        });
    });
}

// Update statistics
function updateStats() {
    const stats = {
        linkedChildren: linkedChildren.length,
        enrolledClasses: linkedChildren.filter(c => c.classCode).length,
        achievements: linkedChildren.reduce((total, child) => {
            return total + (child.achievements?.length || 0);
        }, 0)
    };

    // Update stat cards
    document.querySelectorAll('.stat-value').forEach(stat => {
        const key = stat.dataset.stat;
        if (stats[key] !== undefined) {
            stat.textContent = stats[key];
        }
    });
}

// Helper function to format date
function formatDate(date) {
    // Xử lý timestamp từ Firestore
    if (!date) return 'Chưa có';
    
    // Nếu là Firestore Timestamp
    if (date.toDate) {
        return date.toDate().toLocaleDateString('vi-VN');
    }
    
    // Nếu là timestamp số
    if (typeof date === 'number') {
        return new Date(date).toLocaleDateString('vi-VN');
    }
    
    // Nếu là string date
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('vi-VN');
    }
    
    // Nếu là Date object
    if (date instanceof Date) {
        return date.toLocaleDateString('vi-VN');
    }
    
    return 'Chưa có';
}

// Helper functions
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function addNotification(message) {
    notifications.unshift({
        id: Date.now(),
        message,
        time: 'Vừa xong',
        read: false
    });
    renderNotifications();
}

// Global functions
window.viewProgress = function(child_id) {
    // Chuyển hướng đến trang chi tiết tiến độ của học sinh
    window.location.href = `student-progress.html?id=${child_id}`;
};

// Xử lý thông báo
function initNotifications(userData) {
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationContent = document.querySelector('.notification-content');
    const notificationList = document.querySelector('.notification-list');
    const markAllReadBtn = document.querySelector('.mark-all-read');

    // Hiển thị số thông báo chưa đọc
    updateNotificationBadge();

    // Hiển thị danh sách thông báo
    renderNotifications();

    // Xử lý click vào nút thông báo
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationContent.style.display = notificationContent.style.display === 'block' ? 'none' : 'block';
    });

    // Đóng thông báo khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!notificationContent.contains(e.target) && !notificationBtn.contains(e.target)) {
            notificationContent.style.display = 'none';
        }
    });

    // Đánh dấu tất cả đã đọc
    markAllReadBtn.addEventListener('click', () => {
        notifications.forEach(notification => notification.read = true);
        updateNotificationBadge();
        renderNotifications();
    });
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// Thêm hàm initProfileDropdown
function initProfileDropdown() {
    const profileBtn = document.querySelector('.profile-btn');
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const logoutBtn = document.getElementById('logout-btn');

    if (!profileBtn || !dropdownContent) return;

    // Xử lý click vào nút profile
    profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!dropdownContent.contains(e.target) && !profileBtn.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Ngăn chặn sự kiện click trong dropdown lan ra ngoài
    dropdownContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Xử lý view profile
    viewProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;
        window.location.href = 'profile.html' + '?userId=' + user.uid;
    });

    // Xử lý đăng xuất
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        firebase.auth().signOut();
        window.location.href = '../index.html';
    });
}
// Hiện modal
function showModal() {
    const modal = document.getElementById('child-progress-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

// Ẩn modal
function hideModal() {
    const modal = document.getElementById('child-progress-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

// Thêm event listeners cho modal
document.addEventListener('DOMContentLoaded', function() {
    // Đóng khi bấm nút X
    const closeBtn = document.getElementById('close-progress-modal');
    if (closeBtn) {
        closeBtn.onclick = hideModal;
    }

    // Đóng khi click ra ngoài
    const modal = document.getElementById('child-progress-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal();
            }
        });
    }
});

// Sau khi render xong các chapter, gắn sự kiện click cho header
function enableChapterCollapse() {
    document.querySelectorAll('.progress-chapter .chapter-header').forEach(header => {
        header.addEventListener('click', function() {
            const chapter = header.closest('.progress-chapter');
            const lessonList = chapter.querySelector('.lesson-list');
            const icon = header.querySelector('.chapter-toggle i');
            // Toggle collapsed cho lesson-list
            lessonList.classList.toggle('collapsed');
            // Đổi icon
            if (icon) {
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-right');
            }
        });
    });
}

// Thêm hàm renderProgressTree
function renderProgressTree(progressTree) {
    if (!progressTree || !progressTree.length) {
        return '<div class="no-progress">Chưa có dữ liệu tiến độ học tập</div>';
    }

    return `
        <div class="progress-tree">
            ${progressTree.map(chapter => `
                <div class="progress-chapter">
                    <div class="chapter-header">
                        <div class="chapter-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="chapter-title">${chapter.chapter}</div>
                        <div class="chapter-percent">${chapter.percent}%</div>
                        <div class="chapter-bar">
                            <div class="chapter-bar-inner" style="width: ${chapter.percent}%"></div>
                        </div>
                    </div>
                    <div class="lesson-list">
                        ${chapter.lessons.map(lesson => `
                            <div class="lesson-item">
                                <div class="lesson-name">${lesson.name}</div>
                                <div class="lesson-percent">${lesson.percent}%</div>
                                <div class="lesson-bar">
                                    <div class="lesson-bar-inner" style="width: ${lesson.percent}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Thêm hàm xử lý liên kết với con
function initLinkChild() {
    const linkChildBtn = document.getElementById('link-child-btn');
    const linkChildModal = document.getElementById('link-child-modal');
    const linkChildForm = document.getElementById('link-child-form');
    const closeBtn = linkChildModal.querySelector('.close-modal');

    linkChildBtn.addEventListener('click', () => {
        linkChildModal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        linkChildModal.style.display = 'none';
    });

    linkChildForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('child-email').value;
        
        try {
            // Kiểm tra email có tồn tại trong hệ thống không
            const userQuery = await firebase.firestore()
                .collection('users')
                .where('email', '==', email)
                .where('role', '==', 0)
                .get();

            if (userQuery.empty) {
                alert('Không tìm thấy học sinh với email này');
                return;
            }

            const studentDoc = userQuery.docs[0];
            const currentUser = firebase.auth().currentUser;

            // Kiểm tra xem học sinh đã được liên kết chưa
            const parentDoc = await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .get();

            const parentData = parentDoc.data();
            const existingLink = parentData.parent_role?.listOfChildren?.find(
                child => child.child_id === studentDoc.id
            );

            if (existingLink) {
                alert('Học sinh này đã được liên kết');
                return;
            }

            // Thêm liên kết mới
            await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .update({
                    'parent_role.listOfChildren': firebase.firestore.FieldValue.arrayUnion({
                        child_id: studentDoc.id,
                        linked_at: new Date()
                    })
                });
            // update bên student_role
            await firebase.firestore()
                .collection('users')
                .doc(studentDoc.id)
                .update({
                    'student_role.parent_id': currentUser.uid
                });
            alert('Liên kết thành công!');
            linkChildModal.style.display = 'none';
            linkChildForm.reset();
            
            // Reload lại dữ liệu
            const userData = await loadParentData(currentUser.uid);
            renderDashboard(userData);
        } catch (error) {
            console.error('Error linking child:', error);
            alert('Có lỗi xảy ra khi liên kết');
        }
    });
}

// Thêm hàm xử lý ghi danh cho con
function initEnrollChild() {
    const enrollChildBtn = document.getElementById('enroll-child-btn');
    const enrollChildModal = document.getElementById('enroll-child-modal');
    const enrollChildForm = document.getElementById('enroll-child-form');
    const closeBtn = enrollChildModal.querySelector('.close-modal');

    enrollChildBtn.addEventListener('click', () => {
        // Lọc ra những học sinh chưa ghi danh
        const unenrolledChildren = linkedChildren.filter(child => !child.classCode);
        
        if (unenrolledChildren.length === 0) {
            alert('Tất cả con của bạn đã được ghi danh vào lớp học');
            return;
        }
        
        // Điền danh sách con vào select box
        const select = document.getElementById('enroll-child-select');
        select.innerHTML = unenrolledChildren
            .map(child => `<option value="${child.id}">${child.name}</option>`)
            .join('');
        
        enrollChildModal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        enrollChildModal.style.display = 'none';
    });

    enrollChildForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const childId = document.getElementById('enroll-child-select').value;
        const classCode = document.getElementById('class-code').value;

        if (!classCode.trim()) {
            alert('Vui lòng nhập mã lớp học');
            return;
        }

        try {
            // Kiểm tra mã lớp có tồn tại không
            const classInfo = await getClassFromId(classCode);
            
            if (!classInfo) {
                alert('Mã lớp không tồn tại');
                return;
            }

            // Lấy thông tin giáo viên
            const teacherDoc = await firebase.firestore()
                .collection('users')
                .doc(classInfo.teacher_id)
                .get();
            
            const teacherData = teacherDoc.data();

            // Kiểm tra học sinh đã trong lớp chưa
            const studentDoc = await firebase.firestore()
                .collection('users')
                .doc(childId)
                .get();

            const studentData = studentDoc.data();
            if (studentData.student_role?.class_id) {
                alert('Học sinh đã được ghi danh vào một lớp khác');
                return;
            }

            // Thêm học sinh vào lớp
            await firebase.firestore()
                .collection('users')
                .doc(childId)
                .update({
                    'student_role.class_id': classCode,
                    'student_role.joined_at': new Date()
                });

            // Cập nhật danh sách học sinh của giáo viên
            if (teacherDoc.exists) {
                const teacherData = teacherDoc.data();
                const listOfClasses = teacherData.teacher_role?.listOfClasses || [];
                // Tìm đúng lớp
                const updatedClasses = listOfClasses.map(cls => {
                    if (cls.class_id === classCode) {
                        // Kiểm tra nếu học sinh đã có trong lớp chưa
                        const alreadyInClass = cls.students.some(student => student.student_id === childId);
                        if (!alreadyInClass) {
                            cls.students.push({
                                student_id: childId,
                                displayName: studentData.full_name,
                                joined_at: new Date()
                            });
                        }
                    }
                    return cls;
                });
                // Cập nhật lại listOfClasses cho giáo viên
                await firebase.firestore().collection('users').doc(classInfo.teacher_id).update({
                    'teacher_role.listOfClasses': updatedClasses
                });
            }

            alert('Ghi danh thành công!');
            enrollChildModal.style.display = 'none';
            enrollChildForm.reset();

            // Reload lại dữ liệu
            const userData = await loadParentData(firebase.auth().currentUser.uid);
            renderDashboard(userData);
        } catch (error) {
            console.error('Error enrolling child:', error);
            alert('Có lỗi xảy ra khi ghi danh');
        }
    });
}
async function getClassFromId(classId) {
    try {
        // Tìm tất cả user có teacher_role
        const usersSnapshot = await firebase.firestore()
            .collection('users')
            .where('teacher_role', '!=', null)
            .get();

        // Duyệt qua từng user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const listOfClasses = userData.teacher_role?.listOfClasses || [];
            
            // Tìm lớp trong danh sách lớp của user này
            const classInfo = listOfClasses.find(cls => cls.class_id === classId);
            if (classInfo) {
                return {
                    ...classInfo,
                    teacher_id: userDoc.id // Thêm teacher_id vào classInfo
                };
            }
        }
        return null; // Không tìm thấy lớp
    } catch (error) {
        console.error('Error getting class:', error);
        return null;
    }
}

function initErrorDetailHandlers() {
    document.querySelectorAll('.show-error-detail').forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            const popup = this.nextElementSibling;
            const errorContent = popup.querySelector('.error-detail-content');
            
            // Ẩn tất cả popup khác
            document.querySelectorAll('.error-detail-popup').forEach(p => p.style.display = 'none');
            
            // Hiện popup này
            popup.style.display = 'block';
            
            try {
                // Lấy log data từ data attribute và parse lại JSON
                const logData = JSON.parse(this.dataset.log);
                // Lấy error detail
                const { errorDetail } = await getErrorDetail(logData);
                
                // Hiển thị error detail
                errorContent.innerHTML = errorDetail ? 
                    `<ul>${errorDetail}</ul>` : 
                    'Không có chi tiết lỗi.';
            } catch (error) {
                console.error('Error loading error detail:', error);
                errorContent.innerHTML = 'Không thể tải chi tiết lỗi.';
            }
        });
    });

    // Xử lý đóng popup
    document.querySelectorAll('.close-error-popup').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.error-detail-popup').style.display = 'none';
        });
    });
} 