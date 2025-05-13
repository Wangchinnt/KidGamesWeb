// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
// Kiểm tra đăng nhập
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth/signin.html';
        return;
    }
    
    // Lấy classId từ URL trước khi gọi loadClassData
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    
    if (!classId) {
        alert('Không tìm thấy ID lớp học!');
        window.location.href = 'teacher-dashboard.html';
        return;
    }

    const userId = user.uid;
    await loadClassData(userId, classId);
    await loadNotification(userId);
    // Khởi tạo các event listeners cho chỉnh sửa lớp
    initializeEditClassHandlers(classId);
});

// Load dữ liệu lớp học
async function loadClassData(userId, classId) {
    try {
// Lấy document user (giáo viên)
const userDoc = await firebase.firestore().collection('users').doc(userId).get();
const userData = userDoc.data();
const listOfClasses = userData.teacher_role?.listOfClasses || [];

// Tìm lớp cần hiển thị 
const classInfo = listOfClasses.find(cls => cls.class_id === classId);
    if (!classInfo) {
        alert('Không tìm thấy thông tin lớp học!');
        window.location.href = 'teacher-dashboard.html';
        return;
    }
    // Hiển thị thông tin giáo viên
    document.querySelector('.user-info h2').textContent = userData.full_name;
    document.querySelector('.user-info p').textContent = "Giáo viên " + classInfo.name.toLowerCase();
    // Hiển thị thông tin lớp
    document.querySelector('.class-info h1').textContent = classInfo.name;
    document.querySelector('.class-info p').textContent = `${classInfo.students?.length || 0} học sinh`;

    // Load danh sách học sinh
    await loadStudentsList(classInfo.students || []);

    // Load thống kê
    await loadClassStatistics(classInfo);

    // Tính toán và hiển thị đồ thị
    await calculateAndDisplayCharts(classInfo);
    await loadLessonStatistics(classInfo);
    } catch (error) {
        console.error('Error loading class data:', error);
        alert('Có lỗi xảy ra khi tải dữ liệu lớp học!');
    }
    
}

// Load notification
async function loadNotification(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) return;
        const userData = userDoc.data();
        const notifications = userData.notifications || [];

        // Hiển thị danh sách thông báo
        const notificationList = document.querySelector('.notification-list');
        if (notificationList) {
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
            const badge = document.querySelector('.notification-badge');
            if (badge) badge.textContent = unreadCount;
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Hàm format thời gian (nếu chưa có)
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

// Load thống kê lớp
async function loadClassStatistics(classInfo) {
    const totalStudents = classInfo.students?.length || 0;
    
    // Tính progress trung bình
    let totalProgress = 0;
    for (const student of classInfo.students) {
        totalProgress += await getCompletedPercentageProgress(student.student_id) || 0;
    }
    const averageProgress = totalProgress / totalStudents;

    // Tương tự cho các chỉ số khác
    let totalScore = 0;
    for (const student of classInfo.students) {
        totalScore += await getAverageScore(student.student_id) || 0;
    }
    const averageScore = totalScore / totalStudents;

    // Tổng thời gian học
    let totalTime = 0;
    for (const student of classInfo.students) {
        totalTime += await getTotalLearningTime(student.student_id) || 0;
    }
    const averageLearningTime = totalTime / totalStudents;

    // Tổng thành tích
    let totalAchievements = 0;
    for (const student of classInfo.students) {
        totalAchievements += await getTotalAchievements(student.student_id) || 0;
    }

    // Cập nhật UI
    document.querySelector('.stat-card:nth-child(1) .progress').style.width = `${averageProgress}%`;
    document.querySelector('.stat-card:nth-child(1) p').textContent = `${Math.round(averageProgress)}% hoàn thành`;
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = averageScore.toFixed(1);
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = `${Math.round(averageLearningTime)} giờ`;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = Math.round(totalAchievements);
}

// Định nghĩa cấu trúc bài học
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

// Load danh sách học sinh
async function loadStudentsList(students) {
    const tbody = document.getElementById('studentsList');
    tbody.innerHTML = '';
  
    for (const student of students) {
        const progress = await getCompletedPercentageProgress(student.student_id);
        const averageScore = await getAverageScore(student.student_id);
        const totalAchievements = await getTotalAchievements(student.student_id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.displayName}</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progress)}% hoàn thành</span>
                </div>
            </td>
            <td>${averageScore.toFixed(1)}</td>
            <td>
                <div class="achievement-count">
                    <i class="fas fa-trophy"></i>
                    <span>${totalAchievements}</span>
                </div>
            </td>
            <td>
                <button class="btn small" onclick="showStudentDetail('${student.student_id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn small" onclick="showStudentDetail('${student.student_id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn small" onclick="showStudentDetail('${student.student_id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
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

async function getAverageScore(studentId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(studentId).get();
        const userData = userDoc.data();
        const activityLogs = userData.student_role?.activity_logs|| [];
        console.log(activityLogs);
        // Kiểm tra nếu không có activity logs
        if (!activityLogs.length) {
            return 0;
        }

        // Lọc các hoạt động học tập
        const learningActivities = activityLogs.filter(p => p.activity_type === "Learning");
        
        // Kiểm tra nếu không có hoạt động học tập
        if (!learningActivities.length) {
            return 0;
        }

        // Tính tổng số bài làm đúng
        const totalCorrectProblems = learningActivities.reduce((acc, p) => {
            return acc + (p.correct_problems || 0);
        }, 0);

        // Tính tổng số bài tập
        const totalProblems = learningActivities.length * 7;

        // Tính điểm trung bình (thang điểm 10)
        return (totalCorrectProblems / totalProblems) * 7 * (10/7);
    } catch (error) {
        console.error('Error calculating average score:', error);
        return 0;
    }
}

async function getTotalAchievements(studentId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(studentId).get();
        const userData = userDoc.data();
        const badges = userData.student_role?.badges || [];
        return badges.length;
    } catch (error) {
        console.error('Error getting achievements:', error);
        return 0;
    }
}

async function getTotalLearningTime(studentId) {
    const userDoc = await firebase.firestore().collection('users').doc(studentId).get();
    const userData = userDoc.data();
    const learningTime = userData.student_role?.total_learning_time || 0;
    return learningTime;
}

    // Nút Chỉnh sửa lớp
    const editClassBtn = document.getElementById('editClassBtn');
    if (editClassBtn) {
        editClassBtn.addEventListener('click', () => {
            document.getElementById('editClassModal').style.display = 'block';
        });
    }

    // Nút Xóa lớp
    const deleteClassBtn = document.getElementById('deleteClassBtn');
    if (deleteClassBtn) {
        deleteClassBtn.addEventListener('click', async () => {
            if (confirm('Bạn có chắc chắn muốn xóa lớp này không?')) {
                await deleteCurrentClass();
            }
        });
    }

    // Nút đóng modal (cho tất cả modal)
    document.querySelectorAll('.close-modal, .btn.secondary').forEach(btn => {
        btn.addEventListener('click', function() {
            // Tìm modal cha gần nhất và ẩn nó
            let modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Xử lý form thêm học sinh
    const addStudentForm = document.getElementById('addStudentForm');
    // Lấy classId từ URL trước khi gọi loadClassData
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    // Hiển thị classId trong input
    const classCodeInput = document.getElementById('classCode');
    if (classCodeInput) {
        classCodeInput.value = classId;
    }
    // void getcurrent class
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mail = document.getElementById('email').value;
            const studentId = await getStudentIdByMail(mail);
            if (!studentId) {
                alert('Không tìm thấy học sinh với email đã nhập!');
                return;
            }
            const role = await getRoleOfUser(studentId);
            if (role !== 0) {
                alert('Tài khoản này không phải là học sinh!');
                return;
            }
            // check if student is already in the class
            // if (classInfo.students.some(student => student.student_id === studentId)) {
            //     alert('Học sinh đã tham gia lớp!');
            //     return;
            // }
            await addStudentToClass(studentId);
            document.getElementById('addStudentModal').style.display = 'none';
        });
    }
    async function getStudentIdByMail(mail) {
        const userDoc = await firebase.firestore().collection('users').where('email', '==', mail).get();
        if (userDoc.empty) return null;
        return userDoc.docs[0].id;
    }
    async function addStudentToClass(studentId) {
        try {
            // Lấy userId và classId từ context
            const user = firebase.auth().currentUser;
            if (!user) return;
            // check if student is already in the class or that id is not a student
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) return;
            const userData = userDoc.data();
            userData.teacher_role.listOfClasses.forEach(cls => {
                if (cls.class_id === classId) {
                    // add student to class
                    cls.students.push({
                        student_id: studentId,
                        displayName: userData.full_name,
                        joined_at: new Date()
                    });
                    // update students
                    firebase.firestore().collection('users').doc(user.uid).update({
                        teacher_role: userData.teacher_role
                    });  
                }
            });

            alert('Đã thêm học sinh vào lớp thành công!');
            document.getElementById('addStudentModal').style.display = 'none';
            } catch (error) {
                console.error('Error adding student to class:', error);
                alert('Có lỗi khi thêm học sinh vào lớp!');
            }
         }
     // get role of user by id
     async function getRoleOfUser(userId) {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) return null;
        const userData = userDoc.data();
        return userData.role;
    }
    (async () => {
        // get classId from url
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('classId');
        const classInfo = await getCurrentClass(classId);
        console.log(classInfo);
        if (classInfo) {
            const classNameInput = document.getElementById('className');
            if (classNameInput) {
                classNameInput.value = classInfo.name;
            }
            const classDescriptionInput = document.getElementById('classDescription');
            if (classDescriptionInput) {
                classDescriptionInput.value = classInfo.description;
            }
            const editClassForm = document.getElementById('editClassForm');
            if (editClassForm) {
                editClassForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const className = classNameInput.value;
                    const classDescription = classDescriptionInput.value;
                    await updateClassInfo(classId, className, classDescription);
                    alert('Đã gửi yêu cầu chỉnh sửa lớp (bạn cần bổ sung logic thực tế)');
                    document.getElementById('editClassModal').style.display = 'none';
                });
            }
        }
    })();
    async function getCurrentClass(classId) {
        const user = firebase.auth().currentUser;
        if (!user) return null;
        
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) return null;
        
        const userData = userDoc.data();
        if (!userData.teacher_role?.listOfClasses) return null;
        
        return userData.teacher_role.listOfClasses.find(cls => cls.class_id === classId) || null;
    }
    async function updateClassInfo(classId, className, classDescription) {
        try {
            const user = firebase.auth().currentUser;
            if (!user) return;

        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const listOfClasses = userData.teacher_role?.listOfClasses || [];
        
        // Tìm và cập nhật thông tin lớp
        const updatedClasses = listOfClasses.map(cls => {
            if (cls.class_id === classId) {
                return {
                    ...cls,
                    name: className,
                    description: classDescription
                };
            }
            return cls;
        });

        // Cập nhật vào Firestore
        await firebase.firestore().collection('users').doc(user.uid).update({
            'teacher_role.listOfClasses': updatedClasses
        });

        alert('Cập nhật thông tin lớp thành công!');
        return true;
    } catch (error) {
        console.error('Error updating class info:', error);
        alert('Có lỗi xảy ra khi cập nhật thông tin lớp!');
        return false;
    }
}

// Trong DOMContentLoaded, chỉ giữ lại phần xử lý sự kiện
document.addEventListener('DOMContentLoaded', () => {
    // Nút Thêm học sinh
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            document.getElementById('addStudentModal').style.display = 'block';
        });
    }

    // Nút Chỉnh sửa lớp
    const editClassBtn = document.getElementById('editClassBtn');
    if (editClassBtn) {
        editClassBtn.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const classId = urlParams.get('classId');
            const classInfo = await getCurrentClass(classId);
            
            if (classInfo) {
                const classNameInput = document.getElementById('className');
                const classDescriptionInput = document.getElementById('classDescription');
                if (classNameInput) classNameInput.value = classInfo.name;
                if (classDescriptionInput) classDescriptionInput.value = classInfo.description;
                document.getElementById('editClassModal').style.display = 'block';
            }
        });
    }

    // Xử lý form chỉnh sửa lớp
    const editClassForm = document.getElementById('editClassForm');
    if (editClassForm) {
        editClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const classId = urlParams.get('classId');
            const className = document.getElementById('className').value;
            const classDescription = document.getElementById('classDescription').value;
            
            const success = await updateClassInfo(classId, className, classDescription);
            if (success) {
                document.getElementById('editClassModal').style.display = 'none';
                // Reload lại dữ liệu lớp học
                const user = firebase.auth().currentUser;
                if (user) {
                    await loadClassData(user.uid, classId);
                }
            }
        });
    }

    // Nút đóng modal
    document.querySelectorAll('.close-modal, .btn.secondary').forEach(btn => {
        btn.addEventListener('click', function() {
            let modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
});

// Tính toán và hiển thị đồ thị
async function calculateAndDisplayCharts(classInfo) {
    try {
const students = classInfo.students || [];
        if (students.length === 0) return;

        // 1. Tính phân bố điểm số
        const scoreData = await calculateScoreDistribution(students);
        displayScoreDistributionChart(scoreData);

        // 2. Tính hoạt động học tập theo thời gian
        const timeRanges = [
            { label: '7 ngày', days: 7 },
            { label: '10 ngày', days: 10 },
            { label: '30 ngày', days: 30 }
        ];

        // Tạo container cho biểu đồ hoạt động
        const activityChartContainer = document.querySelector('.chart-card:first-child');
        activityChartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Hoạt động học tập</h3>
                <select id="timeRangeSelect" class="time-range-select">
                    ${timeRanges.map((range, index) => `
                        <option value="${range.days}" ${index === 0 ? 'selected' : ''}>${range.label}</option>
                    `).join('')}
                </select>
            </div>
            <canvas id="activityChart"></canvas>
        `;

        // Xử lý sự kiện click tab
        const timeRangeSelect = activityChartContainer.querySelector('#timeRangeSelect');
        timeRangeSelect.addEventListener('change', async (e) => {
            const days = parseInt(e.target.value);
            const activityData = await calculateActivityData(students, days);
            displayActivityChart(activityData);
        });

        // Hiển thị dữ liệu mặc định cho 7 ngày
        const initialData = await calculateActivityData(students, 7);
        displayActivityChart(initialData);

    } catch (error) {
        console.error('Error calculating charts:', error);
    }
}

// Tính toán dữ liệu hoạt động
async function calculateActivityData(students, days) {
    // Tạo mảng các ngày với cả hai định dạng
    const dateObjs = Array.from({length: days}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return {
            label: `${day}/${month}`,
            compare: `${year}-${month}-${day}`
        };
    });

    const activities = new Array(days).fill(0);
    const completionRates = new Array(days).fill(0);

    for (let i = 0; i < days; i++) {
        const { label, compare } = dateObjs[i];
        let totalActivities = 0;
        let totalCorrectProblems = 0;
        let totalProblems = 0;

        for (const student of students) {
            const userDoc = await firebase.firestore().collection('users').doc(student.student_id).get();
            const userData = userDoc.data();
            const activityLogs = userData.student_role?.activity_logs || [];

            const dayActivities = activityLogs.filter(log => {
                const logDateObj = log.date.toDate();
                const logYear = logDateObj.getFullYear();
                const logMonth = String(logDateObj.getMonth() + 1).padStart(2, '0');
                const logDay = String(logDateObj.getDate()).padStart(2, '0');
                const logDateStr = `${logYear}-${logMonth}-${logDay}`;
                return logDateStr === compare && log.activity_type === "Learning";
            });

            totalActivities += dayActivities.length;
            dayActivities.forEach(activity => {
                totalCorrectProblems += activity.correct_problems || 0;
                totalProblems += activity.total_problems || 0;
            });
        }

        activities[i] = totalActivities;
        completionRates[i] = totalProblems > 0
            ? (totalCorrectProblems / totalProblems) * 100
            : 0;
    }

    return {
        labels: dateObjs.map(d => d.label),
        datasets: [{
            label: 'Số hoạt động',
            data: activities,
            backgroundColor: '#4a90e2',
            borderColor: '#4a90e2',
            borderWidth: 1,
            yAxisID: 'y'
        }, {
            label: 'Tỷ lệ hoàn thành (%)',
            data: completionRates,
            type: 'line',
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            fill: true,
            yAxisID: 'y1'
        }]
    };
}

// Hiển thị biểu đồ hoạt động
function displayActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Kiểm tra và hủy biểu đồ cũ nếu tồn tại
    if (window.activityChart instanceof Chart) {
        window.activityChart.destroy();
    }
    
    // Tạo biểu đồ mới
    window.activityChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Số hoạt động'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    max: 100,
                    title: {
                        display: true,
                        text: 'Tỷ lệ hoàn thành (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.raw;
                            return `${datasetLabel}: ${value.toFixed(1)}`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Tính phân bố điểm số
async function calculateScoreDistribution(students) {
    const scoreRanges = [
        { min: 0, max: 2, label: '0-2' },
        { min: 2, max: 4, label: '2-4' },
        { min: 4, max: 6, label: '4-6' },
        { min: 6, max: 8, label: '6-8' },
        { min: 8, max: 10, label: '8-10' }
    ];

    const distribution = scoreRanges.map(range => ({
        range: range.label,
        count: 0
    }));

    // Đếm số học sinh trong mỗi khoảng điểm
    for (const student of students) {
        const score = await getAverageScore(student.student_id);
        const range = scoreRanges.find(r => score >= r.min && score < r.max);
        if (range) {
            const index = scoreRanges.indexOf(range);
            distribution[index].count++;
        }
    }

    return {
        labels: distribution.map(d => d.range),
        datasets: [{
            label: 'Số học sinh',
            data: distribution.map(d => d.count),
            backgroundColor: '#4a90e2'
        }]
    };
}

// Hiển thị biểu đồ phân bố điểm
function displayScoreDistributionChart(data) {
    const ctx = document.getElementById('scoreDistributionChart').getContext('2d');
    if (window.scoreChart instanceof Chart) {
        window.scoreChart.destroy();
    }
    window.scoreChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    // Giới hạn tối đa trục Y cho đẹp (ví dụ: max = 5 hoặc tự động dựa vào data)
                    max: Math.max(5, Math.ceil(Math.max(...data.datasets[0].data) * 1.2)),
                    title: {
                        display: true,
                        text: 'Số học sinh'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Hiển thị chi tiết học sinh

// Xử lý sự kiện click các sidebar-nav
document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    const contentSections = document.querySelectorAll('.content-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Xóa class active của tất cả các link
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Ẩn tất cả các section
            contentSections.forEach(section => section.classList.remove('active'));

            // Hiển thị section được chọn
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Xử lý sự kiện click chuông thông báo
    const notificationBtn = document.querySelector('.notification-btn');
    const notificationContent = document.querySelector('.notification-content');

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
});

async function deleteCurrentClass() {
    try {
        // Lấy userId và classId từ context
        const user = firebase.auth().currentUser;
        if (!user) return;
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('classId');
        if (!classId) return;

        // Lấy dữ liệu user
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) return;
        const userData = userDoc.data();
        let listOfClasses = userData.teacher_role?.listOfClasses || [];

        // Xóa lớp khỏi danh sách
        listOfClasses = listOfClasses.filter(cls => cls.class_id !== classId);

        // Cập nhật Firestore
        await firebase.firestore().collection('users').doc(user.uid).update({
            "teacher_role.listOfClasses": listOfClasses
        });

        alert('Đã xóa lớp thành công!');
        window.location.href = 'teacher-dashboard.html';
    } catch (error) {
        alert('Có lỗi khi xóa lớp!');
        console.error(error);
    }
}
async function showStudentDetail(studentId) {
    try {
    const studentDoc = await firebase.firestore().collection('users').doc(studentId).get();
    if (!studentDoc.exists) {
        alert("Không tìm thấy thông tin học sinh!");
        return;
    }

    const studentData = studentDoc.data();

        // Cập nhật thông tin trong modal
        document.getElementById('detailStudentName').textContent = studentData.full_name;
        
        // Hiển thị modal
        document.getElementById('studentDetailModal').style.display = 'block';
        
        // TODO: Load thêm thông tin chi tiết của học sinh
        
    } catch (error) {
        console.error('Error loading student details:', error);
        alert('Có lỗi xảy ra khi tải thông tin học sinh!');
    }
}

// Thêm hàm mới để xử lý các event liên quan đến chỉnh sửa lớp
async function initializeEditClassHandlers(classId) {
    // Nút Chỉnh sửa lớp
    const editClassBtn = document.getElementById('editClassBtn');
    if (editClassBtn) {
        editClassBtn.addEventListener('click', async () => {
            const classInfo = await getCurrentClass(classId);
            if (classInfo) {
                const classNameInput = document.getElementById('className');
                const classDescriptionInput = document.getElementById('classDescription');
                if (classNameInput) classNameInput.value = classInfo.name;
                if (classDescriptionInput) classDescriptionInput.value = classInfo.description;
                document.getElementById('editClassModal').style.display = 'block';
            }
        });
    }

    // Xử lý form chỉnh sửa lớp
    const editClassForm = document.getElementById('editClassForm');
    if (editClassForm) {
        editClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const className = document.getElementById('className').value;
            const classDescription = document.getElementById('classDescription').value;
            await updateClassInfo(classId, className, classDescription);
            document.getElementById('editClassModal').style.display = 'none';
            // Reload lại dữ liệu lớp học
            await loadClassData(firebase.auth().currentUser.uid, classId);
        });
    }
}

// Định nghĩa cấu trúc bài học

async function loadLessonStatistics(classInfo) {
    try {
        const students = classInfo.students || [];
        if (students.length === 0) return;

        // Tạo HTML cho các chapter
        const chapterList = document.querySelector('.chapter-list');
        if (!chapterList) return;

        // Xóa nội dung cũ
        chapterList.innerHTML = '';

        // Tạo HTML cho từng chapter
        LESSON_STRUCTURE.chapters.forEach(chapter => {
            const chapterHTML = `
                <div class="chapter-card">
                    <div class="chapter-header">
                        <h3>${chapter.title}</h3>
                        <div class="chapter-progress">
                            <div class="progress-bar">
                                <div class="progress" style="width: 0%"></div>
                            </div>
                            <span>0% hoàn thành</span>
                        </div>
                    </div>
                    <div class="lessons-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Bài học</th>
                                    <th>Trạng thái</th>
                                    <th>Số học sinh đã học</th>
                                    <th>Điểm trung bình</th>
                                    <th>Mini-games</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${chapter.lessons.map(lesson => `
                                    <tr>
                                        <td>${lesson.title}</td>
                                        <td><span class="status not-started">Chưa bắt đầu</span></td>
                                        <td>0/${students.length}</td>
                                        <td>-</td>
                                        <td>
                                            ${lesson.activities.map(activity => 
                                                `<span class="mini-game">${activity}</span>`
                                            ).join('')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            chapterList.innerHTML += chapterHTML;
        });

        // Lấy thông tin học tập của tất cả học sinh
        const studentsData = await Promise.all(students.map(async student => {
            const studentDoc = await firebase.firestore().collection('users').doc(student.student_id).get();
            return studentDoc.data();
        }));

        let totalProgress = 0;
        let totalScore = 0;
        let totalCompletedLessons = 0;

        // Cập nhật từng chapter
        LESSON_STRUCTURE.chapters.forEach((chapter, chapterIndex) => {
            const chapterCard = document.querySelector(`.chapter-card:nth-child(${chapterIndex + 1})`);
            if (!chapterCard) return;

            let chapterCompletedLessons = 0;
            let chapterTotalScore = 0;

            // Cập nhật từng lesson trong chapter
            const lessonRows = chapterCard.querySelectorAll('tbody tr');
            lessonRows.forEach((row, lessonIndex) => {
                const lesson = chapter.lessons[lessonIndex];
                if (!lesson) return;

                // Tính số học sinh đã học bài này
                const studentsLearned = studentsData.filter(studentData => {
                    const learningProgress = studentData.student_role?.learning_progress || [];
                    return learningProgress.some(p => p.lesson_id === lesson.title && p.status === 1);
                });

                // Tính điểm trung bình của bài học
                const lessonScores = studentsLearned.map(studentData => {
                    const activityLogs = studentData.student_role?.activity_logs || [];
                    const lessonActivities = activityLogs.filter(log => 
                        log.lesson_id === lesson.title && 
                        log.activity_type === "Learning"
                    );
                    
                    if (lessonActivities.length === 0) return 0;
                    
                    const totalCorrectProblems = lessonActivities.reduce((acc, p) => 
                        acc + (p.correct_problems || 0), 0);
                    const totalProblems = lessonActivities.length * 7;
                    return (totalCorrectProblems / totalProblems) * 7 * (10/7);
                });

                const averageScore = lessonScores.length > 0 
                    ? lessonScores.reduce((a, b) => a + b, 0) / lessonScores.length 
                    : 0;

                // Cập nhật trạng thái
                let status = 'not-started';
                let statusText = 'Chưa bắt đầu';
                
                if (studentsLearned.length === students.length) {
                    status = 'completed';
                    statusText = 'Đã hoàn thành';
                    chapterCompletedLessons++;
                } else if (studentsLearned.length > 0) {
                    status = 'in-progress';
                    statusText = 'Đang học';
                }

                // Cập nhật UI
                const statusCell = row.querySelector('td:nth-child(2)');
                const studentsCell = row.querySelector('td:nth-child(3)');
                const scoreCell = row.querySelector('td:nth-child(4)');

                if (statusCell) {
                    statusCell.innerHTML = `<span class="status ${status}">${statusText}</span>`;
                }
                if (studentsCell) {
                    studentsCell.textContent = `${studentsLearned.length}/${students.length}`;
                }
                if (scoreCell) {
                    scoreCell.textContent = averageScore > 0 ? averageScore.toFixed(1) : '-';
                }

                // Cập nhật tổng điểm của chapter
                chapterTotalScore += averageScore;
            });

            // Cập nhật tiến độ chapter
            const chapterProgress = (chapterCompletedLessons / chapter.lessons.length) * 100;
            const progressBar = chapterCard.querySelector('.progress');
            const progressText = chapterCard.querySelector('.chapter-progress span');
            
            if (progressBar) {
                progressBar.style.width = `${chapterProgress}%`;
            }
            if (progressText) {
                progressText.textContent = `${Math.round(chapterProgress)}% hoàn thành`;
            }

            // Cập nhật tổng tiến độ
            totalCompletedLessons += chapterCompletedLessons;
            totalScore += chapterTotalScore;
        });

        // Cập nhật thống kê chung
        const averageProgress = (totalCompletedLessons / (LESSON_STRUCTURE.chapters.reduce((acc, chapter) => 
            acc + chapter.lessons.length, 0))) * 100;
        const averageScore = totalScore / LESSON_STRUCTURE.chapters.length;

        // Cập nhật UI thống kê chung
        document.querySelector('.stat-item:nth-child(1) .progress').style.width = `${averageProgress}%`;
        document.querySelector('.stat-item:nth-child(1) .stat-value').textContent = `${Math.round(averageProgress)}%`;
        document.querySelector('.stat-item:nth-child(2) .stat-value').textContent = averageScore.toFixed(1);
        document.querySelector('.stat-item:nth-child(3) .stat-value').textContent = `${totalCompletedLessons}/20`;

    } catch (error) {
        console.error('Error loading class statistics:', error);
    }
}
