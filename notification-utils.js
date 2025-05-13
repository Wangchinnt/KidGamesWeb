export function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Vừa xong';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} tuần trước`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} tháng trước`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} năm trước`;
}

export function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

export function renderNotificationList(notifications, notificationListSelector, badgeSelector) {
    const notificationList = document.querySelector(notificationListSelector);
    if (!notificationList) return;
    notificationList.innerHTML = '';
    let unreadCount = 0;
    notifications.forEach(noti => {
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
    if (badgeSelector) {
        const badge = document.querySelector(badgeSelector);
        if (badge) badge.textContent = unreadCount;
    }
}

export function updateRecentActivitiesFromNotifications(notifications, activityTimelineSelector) {
    const activityTimeline = document.querySelector(activityTimelineSelector);
    if (!activityTimeline) return;
    activityTimeline.innerHTML = '';
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

// Bạn có thể copy hàm convertNotificationToActivity từ teacher-dashboard.js vào đây
export function convertNotificationToActivity(notification) {
    let icon, title, content, time;
    switch(notification.type) {
        case 'class_created':
            icon = 'fa-plus-circle';
            title = 'Tạo lớp mới';
            content = notification.message;
            time = notification.time;
            break;
        // ... các case khác ...
        default:
            icon = 'fa-info-circle';
            title = 'Hoạt động mới';
            content = notification.message;
            time = notification.time;
    }
    return { icon, title, content, time };
}
