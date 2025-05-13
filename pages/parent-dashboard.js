// Thêm xử lý đăng xuất
document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    
    // Xóa thông tin người dùng khỏi localStorage
    localStorage.removeItem('currentUser');
    
    // Chuyển hướng về trang đăng nhập
    window.location.href = 'login.html';
});

function initParentSettings() {
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

function handleMenuClick() {
    const menuItems = document.querySelectorAll('.sidebar-nav a');
    const overviewSection = document.querySelector('.welcome-banner');
    const quickActions = document.querySelector('.quick-actions');
    const childrenSection = document.querySelector('.children-section');
    const recentActivity = document.querySelector('.recent-activity');
    const settingsSection = document.querySelector('.settings-section'); // Đảm bảo đã thêm section này vào HTML

    menuItems.forEach((item, idx) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Ẩn tất cả các section
            if (overviewSection) overviewSection.style.display = 'none';
            if (quickActions) quickActions.style.display = 'none';
            if (childrenSection) childrenSection.style.display = 'none';
            if (recentActivity) recentActivity.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';

            switch(idx) {
                case 0: // Tổng quan
                    if (overviewSection) overviewSection.style.display = '';
                    if (quickActions) quickActions.style.display = '';
                    if (childrenSection) childrenSection.style.display = '';
                    if (recentActivity) recentActivity.style.display = '';
                    break;
                case 1: // Quản lý con cái
                    if (childrenSection) childrenSection.style.display = '';
                    break;
                case 2: // Báo cáo tiến độ
                    if (recentActivity) recentActivity.style.display = '';
                    break;
                case 3: // Cài đặt
                    if (settingsSection) settingsSection.style.display = '';
                    break;
            }
        });
    });
}

// Dữ liệu mẫu
let linkedChildren = [];
let notifications = [];

// Khởi tạo dashboard
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initModals();
    initSettings();
    initNotifications();
    loadMockData();
    renderDashboard();
});

// Xử lý navigation
function initNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.dataset.section;

            // Update active states
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Xử lý modals
function initModals() {
    // Link child modal
    const linkChildBtn = document.getElementById('link-child-btn');
    const linkChildModal = document.getElementById('link-child-modal');
    const linkChildForm = document.getElementById('link-child-form');
    const linkChildError = document.getElementById('link-child-error');
    const linkedChildInfo = document.getElementById('linked-child-info');
    const confirmLinkBtn = document.getElementById('confirm-link-btn');

    // Enroll child modal
    const enrollChildBtn = document.getElementById('enroll-child-btn');
    const enrollChildModal = document.getElementById('enroll-child-modal');
    const enrollChildForm = document.getElementById('enroll-child-form');

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Open link child modal
    linkChildBtn.addEventListener('click', () => {
        linkChildModal.style.display = 'block';
        linkChildForm.reset();
        linkChildError.style.display = 'none';
        linkedChildInfo.style.display = 'none';
    });

    // Handle link child form
    linkChildForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('child-email').value.trim();
        
        if (!validateEmail(email)) {
            showError(linkChildError, 'Email không hợp lệ!');
            return;
        }

        // Simulate finding student
        const studentId = 'HS' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        document.getElementById('linked-child-id').textContent = studentId;
        linkChildError.style.display = 'none';
        linkedChildInfo.style.display = 'block';
        
        // Store pending data
        linkChildForm.dataset.pendingEmail = email;
        linkChildForm.dataset.pendingId = studentId;
    });

    // Confirm link
    confirmLinkBtn.addEventListener('click', () => {
        const email = linkChildForm.dataset.pendingEmail;
        const id = linkChildForm.dataset.pendingId;
        
        linkedChildren.push({
            id,
            email,
            name: 'Học sinh ' + id,
            classCode: null,
            enrolledAt: null
        });

        addNotification('Liên kết thành công với học sinh ' + id);
        linkChildModal.style.display = 'none';
        renderDashboard();
    });

    // Open enroll modal
    enrollChildBtn.addEventListener('click', () => {
        if (linkedChildren.length === 0) {
            alert('Vui lòng liên kết với tài khoản học sinh trước!');
            return;
        }

        const select = document.getElementById('enroll-child-select');
        select.innerHTML = `
            <option value="">-- Chọn học sinh --</option>
            ${linkedChildren.map(child => `
                <option value="${child.id}">${child.name} (${child.email})</option>
            `).join('')}
        `;

        enrollChildModal.style.display = 'block';
    });

    // Handle enroll form
    enrollChildForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const childId = document.getElementById('enroll-child-select').value;
        const classCode = document.getElementById('class-code').value.trim();

        if (!childId || !classCode) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // Update child's enrollment
        const child = linkedChildren.find(c => c.id === childId);
        if (child) {
            child.classCode = classCode;
            child.enrolledAt = new Date().toLocaleDateString();
            addNotification(`Đã ghi danh ${child.name} vào lớp ${classCode}`);
        }

        enrollChildModal.style.display = 'none';
        renderDashboard();
    });
}

// Cài đặt
function initSettings() {
    const settings = {
        notifications: true,
        progress_updates: true,
        achievements: true
    };

    // Load saved settings
    const savedSettings = localStorage.getItem('parentSettings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
    }

    // Apply settings
    Object.keys(settings).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = settings[key];
        }
    });

    // Save settings on change
    document.querySelectorAll('.setting-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            settings[checkbox.id] = checkbox.checked;
            localStorage.setItem('parentSettings', JSON.stringify(settings));
        });
    });
}

// Load mock data
function loadMockData() {
    // Add some mock children
    linkedChildren = [
        {
            id: 'HS001',
            email: 'student1@example.com',
            name: 'Nguyễn Văn A',
            classCode: 'L1A',
            enrolledAt: '2024-03-15'
        },
        {
            id: 'HS002',
            email: 'student2@example.com',
            name: 'Trần Thị B',
            classCode: null,
            enrolledAt: null
        }
    ];

    // Add some mock notifications
    notifications = [
        {
            id: 1,
            message: 'Con bạn đã hoàn thành bài học mới',
            time: '1 giờ trước',
            read: false
        },
        {
            id: 2,
            message: 'Có bài tập mới cần hoàn thành',
            time: '2 giờ trước',
            read: false
        }
    ];
}

// Render dashboard
function renderDashboard() {
    renderChildren();
    renderNotifications();
    updateStats();
}

// Render children list
function renderChildren() {
    const childrenGrid = document.querySelector('.children-grid');
    if (!childrenGrid) return;

    childrenGrid.innerHTML = linkedChildren.map(child => `
        <div class="child-card">
            <div class="child-info">
                <h3>${child.name}</h3>
                <p>${child.email}</p>
                ${child.classCode ? `
                    <p class="class-info">Lớp: ${child.classCode}</p>
                    <p class="enrolled-date">Ghi danh: ${child.enrolledAt}</p>
                ` : ''}
            </div>
            <div class="child-actions">
                <button class="btn-primary" onclick="viewProgress('${child.id}')">
                    Xem tiến độ
                </button>
                <button class="btn-primary" onclick="removeChild('${child.id}')">
                    Xóa liên kết
                </button>
            </div>
        </div>
    `).join('');
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

// Update statistics
function updateStats() {
    const stats = {
        linkedChildren: linkedChildren.length,
        enrolledClasses: linkedChildren.filter(c => c.classCode).length,
        achievements: 15 // Mock data
    };

    // Update stat cards
    document.querySelectorAll('.stat-value').forEach(stat => {
        const key = stat.dataset.stat;
        if (stats[key] !== undefined) {
            stat.textContent = stats[key];
        }
    });
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
window.viewProgress = function(childId) {
    // Chuyển hướng đến trang chi tiết tiến độ của học sinh
    window.location.href = `student-progress.html?id=${childId}`;
};

window.removeChild = function(childId) {
    if (confirm('Bạn có chắc muốn xóa liên kết với học sinh này?')) {
        linkedChildren = linkedChildren.filter(child => child.id !== childId);
        addNotification('Đã xóa liên kết với học sinh ' + childId);
        renderDashboard();
    }
};

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

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}
