// Thêm hàm formatTimeAgo
function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    // Nếu chưa đến 1 phút
    if (diffInSeconds < 60) {
        return 'Vừa xong';
    }
    
    // Nếu chưa đến 1 giờ
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} phút trước`;
    }
    
    // Nếu chưa đến 1 ngày
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} giờ trước`;
    }
    
    // Nếu chưa đến 1 tuần
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} ngày trước`;
    }
    
    // Nếu chưa đến 1 tháng
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks} tuần trước`;
    }
    
    // Nếu chưa đến 1 năm
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} tháng trước`;
    }
    
    // Nếu hơn 1 năm
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} năm trước`;
}

// Thêm hàm formatNotificationTime
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

// Khởi tạo dashboard
document.addEventListener('DOMContentLoaded', async () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../auth/signin.html';
            return;
        }
        const userData = await loadTeacherData(user.uid);
        initNavigation();
        initNotifications(userData);
        initSettings(userData);

        // Bắt sự kiện cho notification button
        const notificationBtn = document.querySelector('.notification-btn');
        const notificationContent = document.querySelector('.notification-content');
        const markAllReadBtn = document.querySelector('.mark-all-read');
        const notificationList = document.querySelector('.notification-list');
        const badge = document.querySelector('.notification-badge');

        if (notificationBtn && notificationContent) {
            notificationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                notificationContent.classList.toggle('active');
            });

            // Đóng dropdown khi click ra ngoài
            document.addEventListener('click', (e) => {
                if (!notificationContent.contains(e.target) && !notificationBtn.contains(e.target)) {
                    notificationContent.classList.remove('active');
                }
            });
        }

        // Xử lý đánh dấu đã đọc
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async () => {
                try {
                    const user = firebase.auth().currentUser;
                    if (!user) return;

                    // Lấy dữ liệu user hiện tại
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (!userDoc.exists) return;

                    const userData = userDoc.data();
                    const currentNotifications = userData.notifications || [];

                    // Cập nhật tất cả notifications thành đã đọc
                    const updatedNotifications = currentNotifications.map(noti => ({
                        ...noti,
                        read: true
                    }));

                    // Cập nhật lên Firestore
                    await firebase.firestore().collection('users').doc(user.uid).update({
                        notifications: updatedNotifications
                    });

                    // Cập nhật UI
                    if (notificationList) {
                        const items = notificationList.querySelectorAll('.notification-item');
                        items.forEach(item => item.classList.remove('unread'));
                    }

                    // Cập nhật badge
                    if (badge) {
                        badge.textContent = '0';
                    }

                    // Cập nhật Recent Activities
                    updateRecentActivitiesFromNotifications(updatedNotifications);

                } catch (err) {
                    console.error("Lỗi khi đánh dấu đã đọc:", err);
                }
            });
        }
    });
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

// Hàm chuyển đổi notification thành activity
function convertNotificationToActivity(notification) {
    let icon, title, content, time;
    
    switch(notification.type) {
        case 'class_created':
            icon = 'fa-plus-circle';
            title = 'Tạo lớp mới';
            content = notification.message;
            time = notification.time;
            break;
        case 'class_removed':
            icon = 'fa-minus-circle';
            title = 'Xóa lớp';
            content = notification.message;
            time = notification.time;
            break;
        case 'student_added':
            icon = 'fa-user-plus';
            title = 'Thêm học sinh mới';
            content = notification.message;
            time = notification.time;
            break;
        case 'student_removed':
            icon = 'fa-user-minus';
            title = 'Xóa học sinh';
            content = notification.message;
            time = notification.time;
            break;
        case 'report_exported':
            icon = 'fa-file-export';
            title = 'Xuất báo cáo';
            content = notification.message;
            time = notification.time;
            break;
        default:
            icon = 'fa-info-circle';
            title = 'Hoạt động mới';
            content = notification.message;
            time = notification.time;
    }

    return {
        icon,
        title,
        content,
        time: notification.time
    };
}

// Hàm cập nhật Recent Activities từ notifications
function updateRecentActivitiesFromNotifications(notifications) {
    const activityTimeline = document.querySelector('.activity-timeline');
    if (!activityTimeline) return;

    activityTimeline.innerHTML = ''; // Xóa các hoạt động cũ

    // Lấy 5 thông báo gần nhất
    const recentNotifications = notifications.slice(0, 5);

    recentNotifications.forEach(notification => {
        const activity = convertNotificationToActivity(notification);
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.content}</p>
                <span class="activity-time">${formatTimeAgo(activity.time)}</span>
            </div>
        `;
        activityTimeline.appendChild(activityItem);
    });
}

// Cập nhật hàm initNotifications để đồng thời cập nhật Recent Activities
function initNotifications(userData) {
    const notificationList = document.querySelector('.notification-list');
    if (notificationList && userData && userData.notifications) {
        notificationList.innerHTML = '';
        let unreadCount = 0;
        userData.notifications.forEach(noti => {
            const item = document.createElement('div');
            item.className = 'notification-item' + (noti.read ? '' : ' unread');
            item.innerHTML = `
                <div class="notification-title">${noti.message}</div>
                <div class="notification-time">${formatNotificationTime(noti.time)}</div>
            `;
            notificationList.appendChild(item);
            if (!noti.read) unreadCount++;
        });
        
        // Cập nhật badge
        const badge = document.querySelector('.notification-badge');
        if (badge) badge.textContent = unreadCount;

        // Cập nhật Recent Activities từ notifications
        updateRecentActivitiesFromNotifications(userData.notifications);
    }
}

// Xử lý cài đặt
function initSettings(userData) {
    const settings = userData.notification_preferences || {
        notifications: true,
        progress_updates: true,
        achievements: true,
        class_announcements: true
    };

    Object.keys(settings).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
            checkbox.checked = settings[key];
            checkbox.addEventListener('change', async () => {
                try {
                    const user = firebase.auth().currentUser;
                    if (!user) return;

                    settings[key] = checkbox.checked;
                    await firebase.firestore().collection('users').doc(user.uid).update({
                        notification_preferences: settings
                    });

                    // Hiển thị thông báo cập nhật thành công
                    const message = checkbox.checked ? 
                        `Đã bật thông báo ${key}` : 
                        `Đã tắt thông báo ${key}`;
                    
                    await createNotification(user.uid, {
                        type: 'settings_updated',
                        message: message
                    });
                } catch (err) {
                    console.error("Lỗi khi cập nhật cài đặt:", err);
                }
            });
        }
    });
}

// Xử lý đăng xuất
document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    firebase.auth().signOut().then(() => {
        window.location.href = '../auth/signin.html';
    });
});

// Load dữ liệu giáo viên từ Firestore
async function loadTeacherData(userId) {
    // Lấy dữ liệu user từ Firestore
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) return {};

    const userData = userDoc.data();

    // Hiển thị tên giáo viên
    const userInfo = document.querySelector('.user-info h2');
    if (userInfo) userInfo.textContent = userData.full_name || "Giáo viên";

    // Hiển thị lớp học trong tab riêng
    const classesGridTab = document.getElementById('classes-grid-tab');
    if (classesGridTab) {
        classesGridTab.innerHTML = ""; // Xóa cũ
        if (userData.teacher_role && Array.isArray(userData.teacher_role.listOfClasses)) {
            renderClassesGrid('classes-grid-overview', userData.teacher_role.listOfClasses);
            renderClassesGrid('classes-grid-tab', userData.teacher_role.listOfClasses);
        } else {
            classesGridTab.innerHTML = "<p>Chưa có lớp học nào.</p>";
        }
    }

    // Hiển thị settings (nếu có)
    if (userData.notification_preferences) {
        Object.keys(userData.notification_preferences).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = userData.notification_preferences[key];
            }
        });
    }

    // Hiển thị thông báo (nếu có)
    if (userData.notifications) {
        const notificationList = document.querySelector('.notification-list');
        if (notificationList) {
            notificationList.innerHTML = '';
            userData.notifications.forEach(noti => {
                const item = document.createElement('div');
                item.className = 'notification-item' + (noti.read ? '' : ' unread');
                item.innerHTML = `
                    <div class="notification-title">${noti.message}</div>
                    <div class="notification-time">${formatNotificationTime(noti.time)}</div>
                `;
                notificationList.appendChild(item);
            });
        }
    }

    // Tính tổng số lớp và tổng học sinh
    let totalClasses = 0;
    let totalStudents = 0;
    if (userData.teacher_role && Array.isArray(userData.teacher_role.listOfClasses)) {
        totalClasses = userData.teacher_role.listOfClasses.length;
        totalStudents = userData.teacher_role.listOfClasses.reduce((sum, cls) => {
            return sum + (cls.students?.length || 0);
        }, 0);
    }

    // Hiển thị lên dashboard
    const totalClassesEl = document.getElementById('total-classes');
    const totalStudentsEl = document.getElementById('total-students');
    if (totalClassesEl) totalClassesEl.textContent = totalClasses;
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;

    // ... Bạn có thể cập nhật thêm các phần khác như thống kê, hoạt động gần đây, v.v. dựa trên userData ...
    return userData;
}
// Load thông tin học sinh
async function getCompletedPercentageProgress(studentId) {
    const userDoc = await firebase.firestore().collection('users').doc(studentId).get();
    const userData = userDoc.data();
    const progress = userData.student_role?.learning_progress    || [];
    console.log(progress);
    // Đếm số lesson đã hoàn thành
    const completedLesson = progress.filter(p => p.status === 1).length;
    console.log(completedLesson);
    // Tổng số lesson (giả sử có 20 lesson)
    const totalLesson = 20;
    
    // Tính phần trăm hoàn thành
    return (completedLesson / totalLesson) * 100;
}
function renderClassesGrid(gridId, listOfClasses) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = "";
    if (Array.isArray(listOfClasses) && listOfClasses.length > 0) {
        listOfClasses.forEach(async (cls) => {
            const classCard = document.createElement('div');
            classCard.className = "class-card";
            const hasStudents = Array.isArray(cls.students) && cls.students.length > 0;
            let progress = 0;
            if (hasStudents) {
                progress = await getCompletedPercentageProgress(cls.students[0].student_id) || 0;
            }
            classCard.innerHTML = `
                <i class="fas fa-chalkboard-teacher"></i>
                <h3>${cls.name || "Lớp học"}</h3>
                <p>${cls.students?.length || 0} học sinh</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
                <p>${Math.round(progress)}% hoàn thành chương trình</p>
                <div class="class-actions">
                    <button class="btn secondary view-details" data-class-id="${cls.class_id}">Xem Chi Tiết</button>
                </div>
            `;
            grid.appendChild(classCard);

            // Thêm event listener cho nút Xem Chi Tiết
            const viewDetailsBtn = classCard.querySelector('.view-details');
            if (viewDetailsBtn) {
                viewDetailsBtn.addEventListener('click', () => {
                    window.location.href = `class-detail.html?classId=${cls.class_id}`;
                });
            }
        });
    } else {
        grid.innerHTML = "<p>Chưa có lớp học nào.</p>";
    }
}

// Thêm kiểm tra element tồn tại trước khi thêm event listener
const createClassBtn = document.getElementById('create-class-btn');
const closeCreateClassBtn = document.getElementById('close-create-class');
const createClassForm = document.getElementById('create-class-form');

if (createClassBtn) {
    createClassBtn.addEventListener('click', () => {
        const modal = document.getElementById('create-class-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    });
}

if (closeCreateClassBtn) {
    closeCreateClassBtn.addEventListener('click', () => {
        const modal = document.getElementById('create-class-modal');
        const errorDiv = document.getElementById('create-class-error');
        if (modal) {
            modal.style.display = 'none';
        }
        if (errorDiv) {
            errorDiv.textContent = '';
        }
    });
}

if (createClassForm) {
    createClassForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('class-name')?.value.trim();
        const desc = document.getElementById('class-desc')?.value.trim();
        const errorDiv = document.getElementById('create-class-error');
        
        if (errorDiv) {
            errorDiv.textContent = '';
        }

        if (!name) {
            if (errorDiv) {
                errorDiv.textContent = "Vui lòng nhập tên lớp học.";
            }
            return;
        }

        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                if (errorDiv) {
                    errorDiv.textContent = "Bạn chưa đăng nhập.";
                }
                return;
            }

            // Lấy dữ liệu user
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                if (errorDiv) {
                    errorDiv.textContent = "Không tìm thấy thông tin giáo viên.";
                }
                return;
            }

            const userData = userDoc.data();
            // Tạo lớp mới
            const newClass = {
                class_id: generateId(),
                name: name,
                description: desc,
                created_at: new Date().toISOString(),
                students: []
            };

            // Thêm vào mảng listOfClasses
            const listOfClasses = userData.teacher_role?.listOfClasses || [];
            listOfClasses.push(newClass);

            // Tạo thông báo mới
            await createNotification(user.uid, {
                type: 'class_created',
                message: `Đã tạo lớp ${name} thành công`,
                class_id: newClass.class_id
            });

            // Cập nhật cả listOfClasses, notifications và activities
            await firebase.firestore().collection('users').doc(user.uid).update({
                "teacher_role.listOfClasses": listOfClasses,
                "notifications": userData.notifications || [],
                "activities": userData.activities || []
            });

            // Cập nhật UI
            updateRecentActivities(userData.activities || []);

            // Đóng modal và reload lại dashboard
            const modal = document.getElementById('create-class-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            location.reload();
        } catch (err) {
            if (errorDiv) {
                errorDiv.textContent = "Lỗi khi tạo lớp: " + err.message;
            }
        }
    });
}

// Thêm hàm generateId nếu chưa có
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Mở modal khi bấm nút
document.getElementById('create-class-btn').addEventListener('click', () => {
    document.getElementById('create-class-modal').style.display = 'flex';
});

// Đóng modal
document.getElementById('close-create-class').addEventListener('click', () => {
    document.getElementById('create-class-modal').style.display = 'none';
    document.getElementById('create-class-error').textContent = '';
});

// Thêm hàm cập nhật hoạt động gần đây
function updateRecentActivities(activities) {
    const activityTimeline = document.querySelector('.activity-timeline');
    if (!activityTimeline) return;

    activityTimeline.innerHTML = ''; // Xóa các hoạt động cũ

    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';

        // Xác định icon và nội dung dựa trên loại hoạt động
        let icon, title, content;
        switch(activity.type) {
            case 'class_created':
                icon = 'fa-plus-circle';
                title = 'Tạo lớp mới';
                content = `Đã tạo lớp ${activity.className}`;
                break;
            case 'student_added':
                icon = 'fa-user-plus';
                title = 'Thêm học sinh mới';
                content = `${activity.studentName} đã được thêm vào lớp ${activity.className}`;
                break;
            case 'test_completed':
                icon = 'fa-check-circle';
                title = 'Hoàn thành bài kiểm tra';
                content = `Lớp ${activity.className} đã hoàn thành bài kiểm tra ${activity.testName}`;
                break;
            case 'report_exported':
                icon = 'fa-file-export';
                title = 'Xuất báo cáo';
                content = `Đã xuất báo cáo ${activity.reportType} cho lớp ${activity.className}`;
                break;
            default:
                icon = 'fa-info-circle';
                title = 'Hoạt động mới';
                content = activity.message;
        }

        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${title}</h4>
                <p>${content}</p>
                <span class="activity-time">${formatTimeAgo(activity.time)}</span>
            </div>
        `;
        activityTimeline.appendChild(activityItem);
    });
}

// Thêm hàm xử lý xuất báo cáo
async function handleExportReport(classId, reportType) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const currentTime = new Date().toISOString();
        
        // Tạo hoạt động mới
        const newActivity = {
            type: 'report_exported',
            classId: classId,
            reportType: reportType,
            time: currentTime,
            message: `Đã xuất báo cáo ${reportType}`
        };

        // Lấy dữ liệu user
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const currentActivities = userData.activities || [];
        const updatedActivities = [newActivity, ...currentActivities].slice(0, 10);

        // Cập nhật Firestore
        await firebase.firestore().collection('users').doc(user.uid).update({
            "activities": updatedActivities
        });

        // Cập nhật UI
        updateRecentActivities(updatedActivities);

    } catch (err) {
        console.error("Lỗi khi xuất báo cáo:", err);
    }
}

// Thêm event listener cho nút xuất báo cáo
const exportReportBtn = document.getElementById('exportReportBtn');
if (exportReportBtn) {
    exportReportBtn.addEventListener('click', () => {
        // Giả sử classId và reportType được lấy từ UI
        const classId = "current-class-id"; // Thay bằng ID thực tế
        const reportType = "Báo cáo tiến độ"; // Thay bằng loại báo cáo thực tế
        handleExportReport(classId, reportType);
    });
}

// Thêm hàm kiểm tra điều kiện thông báo
function shouldSendNotification(notificationType, userData) {
    const preferences = userData.notification_preferences || {
        notifications: true,
        progress_updates: true,
        achievements: true,
        class_announcements: true
    };

    switch(notificationType) {
        case 'class_created':
        case 'class_updated':
        case 'class_deleted':
            return preferences.class_announcements;
        case 'student_added':
        case 'student_removed':
            return preferences.notifications;
        case 'test_completed':
        case 'progress_updated':
            return preferences.progress_updates;
        case 'achievement_earned':
            return preferences.achievements;
        default:
            return preferences.notifications;
    }
}

// Cập nhật hàm tạo thông báo
async function createNotification(userId, notification) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        
        // Kiểm tra điều kiện thông báo
        if (!shouldSendNotification(notification.type, userData)) {
            return; // Không tạo thông báo nếu user đã tắt loại thông báo này
        }

        const currentNotifications = userData.notifications || [];
        const newNotification = {
            id: generateId(),
            ...notification,
            time: new Date().toISOString(),
            read: false
        };

        const updatedNotifications = [newNotification, ...currentNotifications];

        // Cập nhật Firestore
        await firebase.firestore().collection('users').doc(userId).update({
            notifications: updatedNotifications
        });

        // Cập nhật UI
        initNotifications({ ...userData, notifications: updatedNotifications });
    } catch (err) {
        console.error("Lỗi khi tạo thông báo:", err);
    }
}
