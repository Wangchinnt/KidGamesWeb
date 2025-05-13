// Dữ liệu mẫu cho thành tích
const achievements = [
    {
        id: 1,
        icon: 'fas fa-star',
        title: 'Học Sinh Xuất Sắc',
        description: 'Hoàn thành 10 bài học',
        date: '15/03/2024'
    },
    {
        id: 2,
        icon: 'fas fa-trophy',
        title: 'Nhà Toán Học',
        description: 'Giải đúng 50 bài toán',
        date: '10/03/2024'
    },
    {
        id: 3,
        icon: 'fas fa-medal',
        title: 'Siêu Đọc Giả',
        description: 'Đọc xong 20 truyện',
        date: '05/03/2024'
    },
    {
        id: 4,
        icon: 'fas fa-award',
        title: 'Chăm Chỉ',
        description: 'Học liên tục 7 ngày',
        date: '01/03/2024'
    }
];

// Dữ liệu mẫu cho tiến độ học tập
const progressData = [
    {
        subject: 'Phép cộng',
        completed: 15,
        total: 20,
        averageScore: 9.5
    },
    {
        subject: 'Phép trừ',
        completed: 10,
        total: 20,
        averageScore: 8.5
    },
    {
        subject: 'Hình học',
        completed: 5,
        total: 20,
        averageScore: 8.0
    }
];

const progressTree = [
    {
        chapter: "Chương 1: Phép cộng",
        percent: 80,
        lessons: [
            { name: "Bài 1: Cộng trong phạm vi 10", percent: 100 },
            { name: "Bài 2: Cộng trong phạm vi 20", percent: 80 },
            { name: "Bài 3: Cộng có nhớ", percent: 60 }
        ]
    },
    {
        chapter: "Chương 2: Phép trừ",
        percent: 60,
        lessons: [
            { name: "Bài 1: Trừ trong phạm vi 10", percent: 100 },
            { name: "Bài 2: Trừ trong phạm vi 20", percent: 50 }
        ]
    }
];

// Thêm vào phần đầu file
const notifications = [
    {
        id: 1,
        title: 'Báo cáo học tập tuần mới',
        content: 'Báo cáo học tập tuần của bạn đã sẵn sàng',
        time: '10 phút trước',
        read: false
    },
    {
        id: 2,
        title: 'Nhắc nhở bài tập',
        content: 'Bạn có bài tập mới cần hoàn thành',
        time: '1 giờ trước',
        read: false
    },
    {
        id: 3,
        title: 'Thông báo lớp học',
        content: 'Lớp học sẽ có buổi học đặc biệt vào ngày mai',
        time: '2 giờ trước',
        read: false
    }
];

// Hàm cập nhật thành tích
function updateAchievements() {
    const achievementsGrid = document.querySelector('.achievements-grid');
    if (!achievementsGrid) return;

    achievementsGrid.innerHTML = achievements.map(achievement => `
        <div class="achievement-card" data-id="${achievement.id}">
            <i class="${achievement.icon}"></i>
            <h3>${achievement.title}</h3>
            <p>${achievement.description}</p>
            <span class="achievement-date">Đạt được: ${achievement.date}</span>
        </div>
    `).join('');
}

// Hàm cập nhật tiến độ học tập
function updateProgress() {
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

            switch(idx) {
                case 0: // Tổng quan
                    // Hiển thị tất cả các section
                    overviewSection.style.display = '';
                    welcomeBanner.style.display = '';
                    quickActions.style.display = '';
                    achievementsSection.style.display = '';
                    dashboardTabs.style.display = '';
                    document.querySelector('.tab-progress').style.display = '';
                    if (leaderboardSection) leaderboardSection.style.display = '';
                    break;
                case 1: // Thành tích
                    achievementsSection.style.display = '';
                    break;
                case 2: // Tiến độ
                    dashboardTabs.style.display = '';
                    document.querySelector('.tab-progress').style.display = '';
                    document.querySelector('.tab-activity').style.display = 'none';
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('.tab-btn[data-tab="progress"]').classList.add('active');
                    break;
                case 3: // Bảng xếp hạng
                    if (leaderboardSection) leaderboardSection.style.display = '';
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
    updateAchievements();
    updateProgress();
    renderProgressTree();
    handleMenuClick();

    // Thêm sự kiện cho các thẻ thành tích
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => {
        card.addEventListener('click', () => {
            const achievementId = card.dataset.id;
            // TODO: Thêm logic hiển thị chi tiết thành tích
            console.log(`Clicked achievement: ${achievementId}`);
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            this.classList.add('active');
            document.querySelector('.tab-' + this.dataset.tab).classList.add('active');
        });
    });

    // Khi load trang, chỉ hiện tổng quan
    document.querySelector('.overview-section').style.display = '';
    document.querySelector('.achievements-section').style.display = 'none';
    document.querySelector('.dashboard-tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');

    // Khởi tạo thông báo
    initNotifications();
    
    // Khởi tạo modal
    initModals();

    initSettings();
}

// Chạy khởi tạo khi trang đã load xong
document.addEventListener('DOMContentLoaded', init);

function renderProgressTree() {
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

    // Thêm sự kiện ẩn/hiện cho từng chương
    document.querySelectorAll('.progress-chapter .chapter-header').forEach((header, idx) => {
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

// Thêm xử lý đăng xuất
document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Xóa thông tin người dùng khỏi localStorage
    localStorage.removeItem('currentUser');
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = 'login.html';
});

// Xử lý thông báo
function initNotifications() {
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

function renderNotifications() {
    const notificationList = document.querySelector('.notification-list');
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-content">${notification.content}</div>
            <div class="notification-time">${notification.time}</div>
        </div>
    `).join('');

    // Thêm sự kiện click cho từng thông báo
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const notificationId = parseInt(item.dataset.id);
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationBadge();
                renderNotifications();
            }
        });
    });
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

// Xử lý modal
function initModals() {
    // Modal tham gia lớp học
    const joinClassBtn = document.getElementById('join-class-btn');
    const joinClassModal = document.getElementById('join-class-modal');
    const joinClassForm = document.getElementById('join-class-form');

    joinClassBtn.addEventListener('click', () => {
        joinClassModal.style.display = 'block';
    });

    joinClassForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const classCode = document.getElementById('class-code').value;
        // TODO: Xử lý tham gia lớp học
        alert('Đã gửi yêu cầu tham gia lớp học!');
        joinClassModal.style.display = 'none';
    });

    // Modal quản lý phụ huynh
    const manageParentsBtn = document.getElementById('manage-parents-btn');
    const manageParentsModal = document.getElementById('manage-parents-modal');
    const addParentForm = document.getElementById('add-parent-form');

    manageParentsBtn.addEventListener('click', () => {
        manageParentsModal.style.display = 'block';
        renderParentsList();
    });

    addParentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const parentEmail = document.getElementById('parent-email').value;
        // TODO: Xử lý thêm phụ huynh
        alert('Đã gửi lời mời đến phụ huynh!');
        addParentForm.reset();
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
function renderParentsList() {
    const parentsList = document.querySelector('.parents-table tbody');
    // TODO: Lấy danh sách phụ huynh từ server
    const parents = [
        { email: 'parent1@example.com', status: 'Đã xác nhận' },
        { email: 'parent2@example.com', status: 'Chờ xác nhận' }
    ];

    parentsList.innerHTML = parents.map(parent => `
        <tr>
            <td>${parent.email}</td>
            <td>${parent.status}</td>
            <td>
                <button class="btn-remove" data-email="${parent.email}">
                    <i class="fas fa-times"></i> Gỡ
                </button>
            </td>
        </tr>
    `).join('');

    // Thêm sự kiện cho nút gỡ phụ huynh
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn gỡ phụ huynh này?')) {
                // TODO: Xử lý gỡ phụ huynh
                alert('Đã gỡ phụ huynh thành công!');
                renderParentsList();
            }
        });
    });
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