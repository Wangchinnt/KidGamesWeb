// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
// Kiểm tra đăng nhập
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        // Chỉ chuyển về trang signin nếu đang ở trang dashboard
        if (window.location.pathname.includes('student-dashboard')) {
            window.location.href = '../index.html';
        }
        return;
    }
    
    // Lấy classId từ URL trước khi gọi loadClassData
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (!userId) {
        alert('Không tìm thấy ID người dùng!');
        window.location.href = '../auth/signin.html';
        return;
    }

    await loadUserData(userId);
    await updateAchievements(userId);
    await updateProgress(userId);
    await updateActivityLogs(userId);
});
// Hàm load dữ liệu người dùng
async function loadUserData(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.error('Không tìm thấy thông tin người dùng');
            return;
        }

        const userData = userDoc.data();
        const studentRole = userData.student_role || {};

        // Hiển thị tên học sinh
        document.getElementById('user-name').textContent = userData.full_name || 'Chưa có tên';
        
        // Hiển thị tên lớp và lấy thông tin lớp
        if (studentRole.class_id) {
            console.log('Class ID:', studentRole.class_id);
            const classInfo = await getClassFromId(studentRole.class_id);
            console.log('Class Info:', classInfo);
            if (classInfo) {
                const className = classInfo.name;
                
                // Hiển thị tên lớp
                if (className) {
                    document.getElementById('user-class').textContent = 
                        className.includes('Lớp') ? className : "Lớp " + className;
                } else {
                    document.getElementById('user-class').textContent = "Chưa có lớp";
                }

                // Render thông tin lớp học của tôi
                const myClassInfoDiv = document.getElementById('my-class-info');
                if (myClassInfoDiv) {
                    // Lấy tên giáo viên
                    let teacherName = '';
                    if (classInfo.teacher_id) {
                        const teacherDoc = await firebase.firestore().collection('users').doc(classInfo.teacher_id).get();
                        teacherName = teacherDoc.exists ? (teacherDoc.data().full_name || '') : '';
                    }
                    myClassInfoDiv.innerHTML = `
                        <div><strong>Tên lớp:</strong> ${className}</div>
                        <div><strong>Giáo viên:</strong> ${teacherName}</div>
                        <div><strong>Số học sinh:</strong> ${classInfo.students?.length || 0}</div>
                        <div><strong>Mã lớp:</strong> ${studentRole.class_id}</div>
                        <button id="leave-class-btn" class="btn-danger" style="margin-top: 10px;">
                            <i class="fas fa-times"></i> Thoát lớp
                        </button>
                    `;

                    // Thêm sự kiện cho nút thoát lớp
                    document.getElementById('leave-class-btn').addEventListener('click', async () => {
                        if (confirm('Bạn có chắc muốn thoát khỏi lớp học này?')) {
                            try {
                                await firebase.firestore().collection('users').doc(userId).update({
                                    'student_role.class_id': null
                                });
                                
                                // Thêm thông báo khi thoát lớp
                                await addNotification(userId,
                                    'Thoát lớp học thành công',
                                    `Bạn đã thoát khỏi lớp ${classInfo.name}`
                                );
                                
                                myClassInfoDiv.innerHTML = `<div>Chưa có lớp học nào.</div>`;
                                document.getElementById('user-class').textContent = "Chưa có lớp";
                            } catch (error) {
                                console.error('Error leaving class:', error);
                                alert('Có lỗi xảy ra khi thoát lớp học!');
                            }
                        }
                    });
                }
            } else {
                console.log('Không tìm thấy thông tin lớp học cho ID:', studentRole.class_id);
                const myClassInfoDiv = document.getElementById('my-class-info');
                if (myClassInfoDiv) {
                    myClassInfoDiv.innerHTML = `<div>Không tìm thấy thông tin lớp học.</div>`;
                }
                document.getElementById('user-class').textContent = "Chưa có lớp";
            }
        } else {
            const myClassInfoDiv = document.getElementById('my-class-info');
            if (myClassInfoDiv) {
                myClassInfoDiv.innerHTML = `<div>Chưa có lớp học nào.</div>`;
            }
            document.getElementById('user-class').textContent = "Chưa có lớp";
        }

        // Hiển thị các thông tin khác
        document.getElementById('user-level').textContent = studentRole.level || 1;
        document.getElementById('user-streak').textContent = studentRole.streak || 0;
        document.getElementById('user-rank').textContent = "Chưa có xếp hạng";
        document.getElementById('user-diamond').textContent = studentRole.diamonds || 0;
        document.getElementById('user-progress').textContent = 
            ((studentRole.learning_progress?.length || 0) / 20 * 100).toFixed(2) + "%";
        document.getElementById('user-achievements').textContent = studentRole.badges?.length || 0;
        document.getElementById('user-totalLearningTime').textContent = studentRole.total_learning_time || 0;
    
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Hàm cập nhật thành tích
async function updateAchievements(userId) {
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !userData.student_role) {
        // Không có dữ liệu hoặc không phải học sinh
        const achievementsGrid = document.querySelector('.achievements-grid');
        if (achievementsGrid) achievementsGrid.innerHTML = `<div>Chưa có thành tích nào</div>`;
        return;
    }
    const badges = userData.student_role.badges || [];
    const achievementsGrid = document.querySelector('.achievements-grid');
    if (!achievementsGrid) return;

    if (!badges || badges.length === 0) {
        achievementsGrid.innerHTML = `<div>Chưa có thành tích nào</div>`;
        return;
    }

    achievementsGrid.innerHTML = badges.map(badge => {
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
                    <img src="../images/badges/${badge.BadgeID || badge.id}.png" alt="${badge.name}" style="width:48px;height:48px;object-fit:contain;">
                </div>
                <h5>${badge.name}</h5>
                <p>${badge.Description || badge.description || ''}</p>
                <div class="achievement-date">${dateStr ? `Đạt được: ${dateStr}` : ''}</div>
        </div>
        `;
    }).join('');
}

// Hàm cập nhật tiến độ học tập
async function updateProgress(userId) {
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData || !userData.student_role) {
        // Không có dữ liệu hoặc không phải học sinh
        const progressGrid = document.querySelector('.progress-grid');
        if (progressGrid) progressGrid.innerHTML = `<div>Chưa có dữ liệu tiến độ</div>`;
        return;
    }
    const progressData = userData.student_role.learning_progress || [];
    const progressGrid = document.querySelector('.progress-grid');
    if (!progressGrid) return;

    progressGrid.innerHTML = progressData.map(progress => {
        const percentage = (progress.completed / progress.total) * 100;
        return `
            <div class="progress-card">
                <h3>${progress.subject}</h3>
                <div class="progress-bar">
                    <div class="progress" style="width: ${percentage}%"></div>
                </div>
                <p>${percentage}% hoàn thành</p>
                <div class="progress-details">
                    <span>Đã hoàn thành: ${progress.completed}/${progress.total} bài</span>
                    <span>Điểm trung bình: ${progress.averageScore}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function updateActivityLogs(userId) {
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const activityLogs = userData.student_role?.activity_logs || [];
    const learningProgress = userData.student_role?.learning_progress || [];

    // Lấy filter
    const timeSelect = document.querySelector('.activity-filters select:nth-child(1)');
    const typeSelect = document.querySelector('.activity-filters select:nth-child(2)');
    let filteredLogs = activityLogs;

    // Thêm sự kiện onchange cho filter thời gian
    if (timeSelect) {
        timeSelect.addEventListener('change', () => {
            updateActivityLogs(userId); // Gọi lại hàm để cập nhật bảng
        });
    }

    // Thêm sự kiện onchange cho filter loại hoạt động
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            updateActivityLogs(userId); // Gọi lại hàm để cập nhật bảng
        });
    }

    // Lọc theo thời gian
    if (timeSelect) {
        const timeValue = timeSelect.value;
        if (timeValue === "7 ngày qua") {
            const now = new Date();
            filteredLogs = filteredLogs.filter(log => {
                let d = null;
                if (typeof log.date?.toDate === 'function') d = log.date.toDate();
                else if (typeof log.date === 'string') d = new Date(log.date);
                if (!d || isNaN(d.getTime())) return false;
                return (now - d) / (1000 * 60 * 60 * 24) <= 7;
            });
        } else if (timeValue === "30 ngày qua") {
            const now = new Date();
            filteredLogs = filteredLogs.filter(log => {
                let d = null;
                if (typeof log.date?.toDate === 'function') d = log.date.toDate();
                else if (typeof log.date === 'string') d = new Date(log.date);
                if (!d || isNaN(d.getTime())) return false;
                return (now - d) / (1000 * 60 * 60 * 24) <= 30;
            });
        }
    }

    // Lọc theo loại hoạt động
    if (typeSelect) {
        const typeValue = typeSelect.value;
        if (typeValue !== "Tất cả hoạt động") {
            filteredLogs = filteredLogs.filter(log => log.activity_type === typeValue);
        }
    }

    // Tính tổng số phút bài tập và tổng số phút học
    let totalPracticeMinutes = 0;
    let totalLearningMinutes = 0;
    filteredLogs.forEach(log => {
        if (log.activity_type === "Luyện tập") {
            totalPracticeMinutes += log.time_taken || 0;
        }
        if (log.activity_type === "Học tập") {
            totalLearningMinutes += log.time_taken || 0;
        }
    });

    // Render activity summary
    const summaryDiv = document.querySelector('.activity-summary');
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <span><strong>${totalPracticeMinutes}</strong> phút bài tập</span>
            <span style="margin: 0 10px;">|</span>
            <span><strong>${totalLearningMinutes}</strong> tổng số phút học</span>
        `;
    }

    // Render bảng hoạt động
    const tbody = document.querySelector('.activity-table tbody');
    if (!tbody) return;

    if (!filteredLogs.length) {
        tbody.innerHTML = `<tr><td colspan="5">Chưa có hoạt động nào</td></tr>`;
        return;
    }

    // Sử dụng Promise.all để lấy errorDetail cho từng log (nếu cần)
    const rows = await Promise.all(filteredLogs.map(async (log, idx) => {
        // Format ngày
        let dateStr = '';
        if (log.date) {
            let d = null;
            if (typeof log.date?.toDate === 'function') d = log.date.toDate();
            else if (typeof log.date === 'string') d = new Date(log.date);
            if (d && !isNaN(d.getTime())) {
                dateStr = `Thg ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} vào lúc ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
        }

        // Xử lý lỗi sai
        let errorCell = '-';
        if (log.activity_type === "Học tập") {
            // Số lỗi sai
            let errorCount = (log.total_problems || 0) - (log.correct_problems || 0);

            // Lấy errorDetail từ learningProgress (không cần gọi Firestore)
            let errorDetails = '';
            const progress = learningProgress.find(progress => log.activity_name && progress.lesson && log.activity_name.includes(progress.lesson));
            if (progress && progress.errorDetails) {
                errorDetails = `<li>${progress.errorDetails}</li>`;
            }

            // Nếu có lỗi, tạo link
            if (errorCount > 0 || errorDetails) {
                errorCell = `<a href="#" class="show-error-detail" data-idx="${idx}">${errorCount || 'Xem'}</a>
                    <div class="error-detail-popup" style="display:none;position:absolute;z-index:1000;background:#fff;border:1px solid #ccc;padding:10px;border-radius:6px;min-width:200px;">
                        <ul style="margin:0;padding-left:18px;">${errorDetails || 'Không có chi tiết lỗi.'}</ul>
                        <button class="close-error-popup" style="margin-top:8px;">Đóng</button>
                    </div>`;
            } else {
                errorCell = '0';
            }
        } else if (log.activity_type === "Luyện tập") {
            errorCell = 'Không có';
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
    }));

    tbody.innerHTML = rows.join('');

    // Thêm sự kiện cho link lỗi sai
    setTimeout(() => {
        document.querySelectorAll('.show-error-detail').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // Ẩn popup khác
                document.querySelectorAll('.error-detail-popup').forEach(p => p.style.display = 'none');
                // Hiện popup của dòng này
                const popup = this.nextElementSibling;
                if (popup) popup.style.display = 'block';
            });
        });
        document.querySelectorAll('.close-error-popup').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.error-detail-popup').style.display = 'none';
            });
        });
        // Ẩn popup khi click ra ngoài
        document.addEventListener('click', function hidePopup(e) {
            if (!e.target.classList.contains('show-error-detail') && !e.target.classList.contains('close-error-popup')) {
                document.querySelectorAll('.error-detail-popup').forEach(p => p.style.display = 'none');
            }
        });
    }, 0);
}

// Hàm xử lý sự kiện click vào menu
function handleMenuClick() {
    const menuItems = document.querySelectorAll('.sidebar-nav a');
    const overviewSection = document.querySelector('.overview-section');
    const achievementsSection = document.querySelector('.achievements-section');
    const dashboardTabs = document.querySelector('.dashboard-tabs');
    const tabContents = document.querySelectorAll('.tab-content');
    const leaderboardSection = document.querySelector('.leaderboard-section');
    const welcomeBanner = document.querySelector('.welcome-banner');
    const quickActions = document.querySelector('.quick-actions');
    const myClassSection = document.querySelector('.my-class-section');
    const settingsSection = document.querySelector('.settings-section');

    menuItems.forEach((item, idx) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Ẩn tất cả các section
            overviewSection.style.display = 'none';
            achievementsSection.style.display = 'none';
            dashboardTabs.style.display = 'none';
            tabContents.forEach(tc => tc.style.display = 'none');
            if (leaderboardSection) leaderboardSection.style.display = 'none';
            welcomeBanner.style.display = 'none';
            quickActions.style.display = 'none';
            settingsSection.style.display = 'none';
            myClassSection.style.display = 'none';

            switch(idx) {
                case 0: // Tổng quan
                    // Hiển thị tất cả các section
                    overviewSection.style.display = '';
                    welcomeBanner.style.display = '';
                    quickActions.style.display = '';
                    myClassSection.style.display = '';
                    achievementsSection.style.display = 'none';
                    dashboardTabs.style.display = 'none';
                    document.querySelector('.tab-progress').style.display = 'none';
                    if (leaderboardSection) leaderboardSection.style.display = 'none';
                    break;
                case 1: // Thành tích
                    achievementsSection.style.display = '';
                    myClassSection.style.display = 'none';
                    break;
                case 2: // Tiến độ
                    dashboardTabs.style.display = '';
                    // Ẩn tất cả tab-content
                    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                    // Hiện tab-progress mặc định
                    document.querySelector('.tab-content.tab-progress').classList.add('active');
                    document.querySelector('.tab-content.tab-progress').style.display = 'block';
                    break;
                case 3: // Bảng xếp hạng
                    if (leaderboardSection) {
                        leaderboardSection.style.display = 'block';
                        updateLeaderboard();
                    }
                    break;
                case 4: // Cài đặt
                    settingsSection.style.display = 'block';
                    break;
            }
        });
    });
}

// Hàm khởi tạo
function init() {
    renderProgressTree();
    handleMenuClick();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Bỏ active ở tất cả nút/tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');

            // Thêm active cho nút/tab được chọn
            this.classList.add('active');
            const tabName = this.dataset.tab;
            document.querySelector('.tab-content.tab-' + tabName).classList.add('active');
            document.querySelector('.tab-content.tab-' + tabName).style.display = 'block';
        });
    });

    // Khi load trang, chỉ hiện tổng quan
    document.querySelector('.overview-section').style.display = '';
    document.querySelector('.achievements-section').style.display = 'none';
    document.querySelector('.dashboard-tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');

    // Khởi tạo modal
    initModals();

    initSettings();

    initProfileDropdown();
}
  // Thêm dòng này để khởi tạo notifications
  const userId = new URLSearchParams(window.location.search).get('userId');
  if (userId) {
      initNotifications();
  }
// Chạy khởi tạo khi trang đã load xong
document.addEventListener('DOMContentLoaded', () => {
    init();
    updateLeaderboard();
});

async function getStudentProgressTree(userId) {
    // Lấy dữ liệu học sinh
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const activityLogs = userData.student_role?.activity_logs || [];

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

// Thêm xử lý đăng xuất
document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    firebase.auth().signOut();
    window.location.href = '/index.html';
});

// Cập nhật hàm initNotifications để load thông báo từ Firebase
async function initNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationContent = document.querySelector('.notification-content');
    const notificationList = document.querySelector('.notification-list');
    const markAllReadBtn = document.querySelector('.mark-all-read');
    const userId = new URLSearchParams(window.location.search).get('userId');

    // Load thông báo từ Firebase
    await loadNotifications(userId);

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
    markAllReadBtn.addEventListener('click', async () => {
        try {
            await firebase.firestore().collection('users').doc(userId).update({
                'notifications': firebase.firestore.FieldValue.arrayUnion({
                    read: true,
                    timestamp: new Date()
                })
            });
            await loadNotifications(userId);
            updateNotificationBadge();
            renderNotifications();
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    });
}

// Hàm load thông báo từ Firebase
async function loadNotifications(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        notifications = userData.student_role?.notifications || [];
    } catch (error) {
        console.error('Error loading notifications:', error);
        notifications = [];
    }
}

// Hàm cập nhật badge thông báo
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Hàm render danh sách thông báo
function renderNotifications() {
    const notificationList = document.querySelector('.notification-list');
    if (!notificationList) return;

    if (!notifications || notifications.length === 0) {
        notificationList.innerHTML = '<div class="no-notifications">Không có thông báo nào</div>';
        return;
    }

    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-content">${notification.content}</div>
            <div class="notification-time">${notification.time}</div>
        </div>
    `).join('');
}

// Hàm thêm thông báo mới
async function addNotification(userId, title, content) {
    try {
        const newNotification = {
            id: Date.now(),
            title,
            content,
            time: 'Vừa xong',
            read: false,
            timestamp: new Date()
        };

        await firebase.firestore().collection('users').doc(userId).update({
            'notifications': firebase.firestore.FieldValue.arrayUnion(newNotification)
        });

        // Cập nhật lại danh sách thông báo
        await loadNotifications(userId);
        updateNotificationBadge();
        renderNotifications();
    } catch (error) {
        console.error('Error adding notification:', error);
    }
}

// Thêm biến global để lưu trữ notifications
let notifications = [];

// Xử lý modal
function initModals() {
    // Modal tham gia lớp học
    const joinClassBtn = document.getElementById('join-class-btn');
    const joinClassModal = document.getElementById('join-class-modal');
    const joinClassForm = document.getElementById('join-class-form');

    joinClassBtn.addEventListener('click', () => {
        joinClassModal.style.display = 'block';
    });

    joinClassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const classCode = document.getElementById('class-code').value;
        const classInfo = await getClassFromId(classCode);
        let teacherName = '';
        if (classInfo && classInfo.teacher_id) {
            const teacherDoc = await firebase.firestore().collection('users').doc(classInfo.teacher_id).get();
            teacherName = teacherDoc.exists ? (teacherDoc.data().full_name || '') : '';
        }
        if (!classInfo) {
            alert('Sai mã lớp hoặc lớp không tồn tại!');
            return;
        }
        const userId = firebase.auth().currentUser.uid;
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData.student_role?.class_id) {
            alert('Bạn đã tham gia lớp học rồi hoặc bạn đã tham gia lớp học này rồi');
            return;
        }

        if (confirm(`Bạn có chắc muốn tham gia lớp ${classInfo.name} dạy bởi ${teacherName}?`)) {
            try {
                // Thêm thông báo tham gia lớp học
                await addNotification(userId, 
                    'Tham gia lớp học thành công', 
                    `Bạn đã tham gia lớp ${classInfo.name} dạy bởi ${teacherName}`
                );

                // update student_role.class_id
                await firebase.firestore().collection('users').doc(userId).update({
                    'student_role.class_id': classCode
                });

                // find  teacher id by class id
                const teacherId = classInfo.teacher_id;
                // Lấy document của giáo viên
                const teacherDoc = await firebase.firestore().collection('users').doc(teacherId).get();
                if (teacherDoc.exists) {
                    const teacherData = teacherDoc.data();
                    const listOfClasses = teacherData.teacher_role?.listOfClasses || [];
                    // Tìm đúng lớp
                    const updatedClasses = listOfClasses.map(cls => {
                        if (cls.class_id === classCode) {
                            // Kiểm tra nếu học sinh đã có trong lớp chưa
                            const alreadyInClass = cls.students.some(student => student.student_id === userId);
                            if (!alreadyInClass) {
                                cls.students.push({
                                    student_id: userId,
                                    displayName: userData.full_name,
                                    joined_at: new Date()
                                });
                            }
                        }
                        return cls;
                    });
                    // Cập nhật lại listOfClasses cho giáo viên
                    await firebase.firestore().collection('users').doc(teacherId).update({
                        'teacher_role.listOfClasses': updatedClasses
                    });
                }
                // reload page
                window.location.reload();
            } catch (error) {
                console.error('Error joining class:', error);
                alert('Có lỗi xảy ra khi tham gia lớp học!');
            }
        }
    });

    // Modal quản lý phụ huynh
    const manageParentsBtn = document.getElementById('manage-parents-btn');
    const manageParentsModal = document.getElementById('manage-parents-modal');
    const addParentForm = document.getElementById('add-parent-form');

    manageParentsBtn.addEventListener('click', () => {
        manageParentsModal.style.display = 'block';
        renderParentsList();
    });

    addParentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const parentEmail = document.getElementById('parent-email').value;
        const userId = new URLSearchParams(window.location.search).get('userId');
        
        try {
            // Tìm phụ huynh theo email (bỏ điều kiện parent_role)
            const usersSnapshot = await firebase.firestore()
                .collection('users')
                .where('email', '==', parentEmail)
                .get();

            if (usersSnapshot.empty) {
                alert('Không tìm thấy tài khoản với email này!');
                return;
            }

            const parentDoc = usersSnapshot.docs[0];
            const parentData = parentDoc.data();
            
            // Kiểm tra xem user có phải là phụ huynh không
            if (!parentData.parent_role) {
                alert('Tài khoản này không phải là tài khoản phụ huynh!');
                return;
            }

            const parentId = parentDoc.id;

            // Kiểm tra xem phụ huynh đã được liên kết chưa
            const studentDoc = await firebase.firestore().collection('users').doc(userId).get();
            const studentData = studentDoc.data();
            const existingParent = studentData.student_role?.parent_id;

            if (existingParent) {
                alert('Mỗi học sinh chỉ có thể có một phụ huynh!');
                return;
            }
           
            // Thêm phụ huynh vào danh sách của học sinh
            await firebase.firestore().collection('users').doc(userId).update({
                'student_role.parent_id': parentId
            });

            // Thêm học sinh vào danh sách con của phụ huynh
            const oldList = parentData.parent_role?.listOfChildren || [];
            const newList = oldList.concat({
                child_id: userId,
                linked_at: new Date()
            });

            await firebase.firestore().collection('users').doc(parentId).update({
                'parent_role.listOfChildren': newList
            });

            // Thêm thông báo khi liên kết phụ huynh thành công
            await addNotification(userId,
                'Liên kết phụ huynh thành công',
                `Bạn đã liên kết với phụ huynh ${parentData.full_name || parentEmail}`
            );

            alert('Đã thêm phụ huynh thành công!');
            addParentForm.reset();
            renderParentsList();
        } catch (error) {
            console.error('Error adding parent:', error);
            alert('Có lỗi xảy ra khi thêm phụ huynh!');
        }
    });

    // Đóng modal khi click nút close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Đóng modal khi click ra ngoài
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Render danh sách phụ huynh
async function renderParentsList() {
    const parentsList = document.querySelector('.parents-table tbody');
    const userId = new URLSearchParams(window.location.search).get('userId');
    
    try {
        // Lấy thông tin học sinh
        const studentDoc = await firebase.firestore().collection('users').doc(userId).get();
        const studentData = studentDoc.data();
        
        // Lấy danh sách phụ huynh từ student_role
        const parentId = studentData.student_role?.parent_id;
        if (!parentId) {
            parentsList.innerHTML = '<tr><td colspan="3">Chưa có phụ huynh nào được liên kết</td></tr>';
            return;
        }

        // Lấy thông tin chi tiết của từng phụ huynh
        const parentDoc = await firebase.firestore().collection('users').doc(parentId).get();
        const parentData = parentDoc.data();
    

        parentsList.innerHTML = `
            <tr>
                <td>${parentData.full_name || parentData.email}</td>
                <td>${parentData.email}</td>
                <td>
                    <button class="btn-remove" data-parent-id="${parentId}">
                        <i class="fas fa-times"></i> Gỡ
                    </button>
                </td>
            </tr>
        `;

        // Thêm sự kiện cho nút gỡ phụ huynh
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Bạn có chắc muốn gỡ phụ huynh này?')) {
                    const parentId = btn.dataset.parentId;
                    try {
                        // 1. Xóa phụ huynh khỏi danh sách của học sinh
                        await firebase.firestore().collection('users').doc(userId).update({
                            'student_role.parent_id': null
                        });

                        // 2. Xóa học sinh khỏi danh sách con của phụ huynh
                        const oldList = parentData.parent_role?.listOfChildren || [];
                        const newList = oldList.filter(child => child.child_id !== userId);

                        await firebase.firestore().collection('users').doc(parentId).update({
                            'parent_role.listOfChildren': newList
                        });

                        // Thêm thông báo khi gỡ phụ huynh
                        await addNotification(userId,
                            'Gỡ liên kết phụ huynh thành công',
                            `Bạn đã gỡ liên kết với phụ huynh ${parentData.full_name || parentData.email}`
                        );

                        alert('Đã gỡ phụ huynh thành công!');
                        renderParentsList();
                    } catch (error) {
                        console.error('Error removing parent:', error);
                        alert('Có lỗi xảy ra khi gỡ phụ huynh!');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading parents:', error);
        parentsList.innerHTML = '<tr><td colspan="3">Có lỗi xảy ra khi tải danh sách phụ huynh</td></tr>';
    }
}

// Thêm hàm xử lý cài đặt
function initSettings() {
    const settings = {
        notifications: true,
        progress_updates: true,
        achievements: true,
        class_announcements: true
    };

    // Load settings từ localStorage nếu có
    const savedSettings = localStorage.getItem('studentSettings');
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
            localStorage.setItem('studentSettings', JSON.stringify(settings));
        });
    });
} 
async function getErrorDetail(log) {
    // get error detail from firebase
    const userDoc = await firebase.firestore().collection('users').doc(log.student_id).get();
    const userData = userDoc.data();
    const errorDetail = userData.student_role?.learning_progress.find(progress => log.activity_name.includes(progress.lesson)).error_detail || '';
    return { errorDetail};
}
async function getClassFromId(classId) {
    try {
        console.log('Bắt đầu tìm lớp với ID:', classId);
        
        // Tìm tất cả user có teacher_role
        const usersSnapshot = await firebase.firestore()
            .collection('users')
            .where('teacher_role', '!=', null)
            .get();

        console.log('Số lượng giáo viên tìm thấy:', usersSnapshot.docs.length);

        // Duyệt qua từng user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            console.log('Kiểm tra giáo viên:', userDoc.id);
            console.log('Teacher role data:', userData.teacher_role);
            
            const listOfClasses = userData.teacher_role?.listOfClasses || [];
            console.log('Danh sách lớp của giáo viên:', listOfClasses);
            
            // Tìm lớp trong danh sách lớp của user này
            const classInfo = listOfClasses.find(cls => {
                console.log('So sánh:', cls.class_id, 'với', classId);
                return cls.class_id === classId;
            });

            if (classInfo) {
                console.log('Tìm thấy lớp:', classInfo);
                return {
                    ...classInfo,
                    teacher_id: userDoc.id,
                    students: classInfo.students || [],
                    name: classInfo.name || 'Chưa có tên lớp'
                };
            }
        }

        console.log('Không tìm thấy lớp với ID:', classId);
        return null;
    } catch (error) {
        console.error('Error getting class:', error);
        return null;
    }
} 

async function renderProgressTree() {
    const userId = new URLSearchParams(window.location.search).get('userId');
    if (!userId) return;
    const progressTree = await getStudentProgressTree(userId);

    const treeContainer = document.querySelector('.progress-tree');
    if (!treeContainer) return;

    treeContainer.innerHTML = progressTree.map((chapter, idx) => `
        <div class="progress-chapter" data-idx="${idx}">
            <div class="chapter-header" style="cursor:pointer;">
                <span class="chapter-toggle"><i class="fas fa-chevron-down"></i></span>
                <span class="chapter-title">${chapter.chapter}</span>
                <span class="chapter-percent">${chapter.percent}% hoàn thành</span>
                <div class="chapter-bar">
                    <div class="chapter-bar-inner" style="width:${chapter.percent}%"></div>
                </div>
            </div>
            <ul class="lesson-list">
                ${chapter.lessons.map(lesson => `
                    <li class="lesson-item">
                        <span class="lesson-name">${lesson.name}</span>
                        <span class="lesson-percent">${lesson.percent}%</span>
                        <div class="lesson-bar">
                            <div class="lesson-bar-inner" style="width:${lesson.percent}%"></div>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    // Accordion event
    document.querySelectorAll('.progress-chapter .chapter-header').forEach((header) => {
        header.addEventListener('click', function() {
            const chapter = header.parentElement;
            const lessonList = chapter.querySelector('.lesson-list');
            const icon = header.querySelector('.chapter-toggle i');
            lessonList.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-right');
        });
    });
}

async function getTeacherFromClassId(classId) {
    const classInfo = await getClassFromId(classId);
    if (!classInfo) return null;
    const teacherId = classInfo.classData.teacher_id;
    const teacherDoc = await firebase.firestore().collection('users').doc(teacherId).get();
    if (!teacherDoc.exists) return null;
    const teacherData = teacherDoc.data();
    return teacherData;
}

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

async function updateLeaderboard() {
    const leaderboardTable = document.querySelector('.leaderboard-table tbody');
    const filterSelect = document.querySelector('.leaderboard-filters select');
    const userId = new URLSearchParams(window.location.search).get('userId');
    
    try {
        // Lấy thông tin học sinh hiện tại
        const currentStudentDoc = await firebase.firestore().collection('users').doc(userId).get();
        const currentStudentData = currentStudentDoc.data();
        const classId = currentStudentData.student_role?.class_id;

        if (!classId) {
            leaderboardTable.innerHTML = '<tr><td colspan="6">Bạn chưa tham gia lớp học nào</td></tr>';
            return;
        }

        // Lấy thông tin lớp học
        const classInfo = await getClassFromId(classId);
        if (!classInfo) {
            leaderboardTable.innerHTML = '<tr><td colspan="6">Không tìm thấy thông tin lớp học</td></tr>';
            return;
        }

        // Lấy danh sách học sinh trong lớp
        const students = classInfo.students || [];
        
        // Lấy thông tin chi tiết của từng học sinh
        const studentDetails = await Promise.all(students.map(async (student) => {
            const studentDoc = await firebase.firestore().collection('users').doc(student.student_id).get();
            const studentData = studentDoc.data();
            return {
                student_id: student.student_id,
                full_name: studentData.full_name || 'Chưa có tên',
                class_name: classInfo.name,
                level: studentData.student_role?.level || 1,
                total_learning_time: studentData.student_role?.total_learning_time || 0,
                diamonds: studentData.student_role?.diamonds || 0
            };
        }));

        // Sắp xếp học sinh theo filter
        const sortBy = filterSelect.value;
        studentDetails.sort((a, b) => {
            if (sortBy === 'Sắp xếp theo thời gian học') {
                return b.total_learning_time - a.total_learning_time;
            } else {
                return b.diamonds - a.diamonds;
            }
        });

        // Render bảng xếp hạng
        leaderboardTable.innerHTML = studentDetails.map((student, index) => {
            const isCurrentUser = student.student_id === userId;
            const rankClass = index < 3 ? `rank-${index + 1}` : '';
            const timeInHours = (student.total_learning_time / 60).toFixed(1);
            
            return `
                <tr class="${rankClass} ${isCurrentUser ? 'current-user' : ''}">
                    <td>${index + 1}</td>
                    <td>${student.full_name} ${isCurrentUser ? '(Bạn)' : ''}</td>
                    <td>${student.class_name}</td>
                    <td>Cấp ${student.level}</td>
                    <td>${timeInHours} giờ</td>
                    <td>${student.diamonds}</td>
                </tr>
            `;
        }).join('');

        // Thêm sự kiện cho filter
        filterSelect.addEventListener('change', updateLeaderboard);

    } catch (error) {
        console.error('Error updating leaderboard:', error);
        leaderboardTable.innerHTML = '<tr><td colspan="6">Có lỗi xảy ra khi tải bảng xếp hạng</td></tr>';
    }
}

// Thêm vào phần init() hoặc tạo một hàm mới để xử lý dropdown
function initProfileDropdown() {
    const profileBtn = document.querySelector('.profile-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Mở/đóng dropdown khi click vào nút profile
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Ngăn chặn sự kiện click trong dropdown lan ra ngoài
    dropdownContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', () => {
        dropdownContent.style.display = 'none';
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

async function getRank(userId, sortBy = 'time') {
    try {
        // Lấy thông tin học sinh hiện tại
        const currentStudentDoc = await firebase.firestore().collection('users').doc(userId).get();
        const currentStudentData = currentStudentDoc.data();
        const classId = currentStudentData.student_role?.class_id;

        if (!classId) {
            return "Chưa có xếp hạng";
        }

        // Lấy thông tin lớp học
        const classInfo = await getClassFromId(classId);
        if (!classInfo) {
            return "Chưa có xếp hạng";
        }

        // Lấy danh sách học sinh trong lớp
        const students = classInfo.students || [];
        
        // Lấy thông tin chi tiết của từng học sinh
        const studentDetails = await Promise.all(students.map(async (student) => {
            const studentDoc = await firebase.firestore().collection('users').doc(student.student_id).get();
            const studentData = studentDoc.data();
            return {
                student_id: student.student_id,
                total_learning_time: studentData.student_role?.total_learning_time || 0,
                diamonds: studentData.student_role?.diamonds || 0
            };
        }));

        // Sắp xếp học sinh theo tiêu chí
        studentDetails.sort((a, b) => {
            return (b.total_learning_time + b.diamonds) - (a.total_learning_time + a.diamonds);
        });

        // Tìm vị trí của học sinh hiện tại
        const rank = studentDetails.findIndex(student => student.student_id === userId) + 1;

        // Trả về xếp hạng dạng "Top X"
        if (rank === 1) return "Top 1";
        if (rank === 2) return "Top 2";
        if (rank === 3) return "Top 3";
        return `Top ${rank}`;

    } catch (error) {
        console.error('Error getting rank:', error);
        return "Chưa có xếp hạng";
    }
}