document.addEventListener('DOMContentLoaded', function() {
    initSignup();
    initShowHidePassword();
});

function initSignup() {
    // Role selector functionality
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(button => {
        button.addEventListener('click', function() {
            roleButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
    const googleSigninBtn = document.getElementById('google-signup-btn');
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', signupWithGoogle);
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = "";

    // Lấy dữ liệu từ form
    const username = document.getElementById('username')?.value.trim();
    const fullname = document.getElementById('fullname')?.value.trim();
    const birthdate = document.getElementById('birthdate')?.value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const role = document.querySelector('input[name="role"]:checked')?.value;
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    // Kiểm tra dữ liệu đầu vào
    const validationError = validateSignup({ username, fullname, birthdate, gender, role, email, password });
    if (validationError) {
        errorMessage.textContent = validationError;
        errorMessage.style.display = "block";
        return;
    }

    const roleChecked = document.querySelector('input[name="role"]:checked');
    const genderChecked = document.querySelector('input[name="gender"]:checked');
    if (!roleChecked) {
        showError("Vui lòng chọn vai trò.");
        return;
    }
    if (!genderChecked) {
        showError("Vui lòng chọn giới tính.");
        return;
    }

    // Kiểm tra username đã tồn tại chưa
    if (await isUsernameTaken(username)) {
        errorMessage.textContent = "Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.";
        errorMessage.style.display = "block";
        return;
    }

    try {
        // 1. Tạo tài khoản Firebase
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userId = user.uid;

        // 2. Lưu vào bảng users
        await createUserInFirestore({ userId, username, fullname, email, birthdate, gender, role });

        // Thành công
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.textContent = "Đăng ký thành công! Đang chuyển hướng...";
            successMessage.style.display = "block";
        }
        setTimeout(() => {
            if (role === "teacher") {
                window.location.href = '../teacher-dashboard.html?userId=' + userId;
            } else if (role === "parent") {
                window.location.href = '../parent-dashboard.html?userId=' + userId;
            } else {
                window.location.href = '../student-dashboard.html?userId=' + userId;
            }
        }, 1500);
    } catch (error) {
        errorMessage.textContent = getErrorMessage(error.code);
    }
}

// Hàm kiểm tra dữ liệu đầu vào
function validateSignup({ username, fullname, birthdate, gender, role, email, password }) {
    if (!username) return "Vui lòng nhập tên đăng nhập.";
    if (!fullname) return "Vui lòng nhập họ tên.";
    if (!birthdate) return "Vui lòng chọn ngày sinh.";
    if (!gender) return "Vui lòng chọn giới tính.";
    if (!role) return "Vui lòng chọn vai trò.";
    if (!email) return "Vui lòng nhập email.";
    if (!validateEmail(email)) return "Email không hợp lệ.";
    if (!password) return "Vui lòng nhập mật khẩu.";
    if (password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
    if (role === null) return "Vui lòng chọn vai trò.";
    return "";
}

// Hàm kiểm tra định dạng email
function validateEmail(email) {
    // Regex đơn giản cho email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function validateUsername(username) {
    const userDoc = await firebase.firestore().collection('users').where('user_name', '==', username).get();
    return userDoc.size === 0;
}

async function isUsernameTaken(username) {
    const userDoc = await firebase.firestore().collection('users').where('user_name', '==', username).get();
    return !userDoc.empty;
}

// Hàm chuyển đổi mã lỗi Firebase thành thông báo tiếng Việt
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Email không hợp lệ';
        case 'auth/user-disabled':
            return 'Tài khoản đã bị vô hiệu hóa';
        case 'auth/user-not-found':
            return 'Không tìm thấy tài khoản';
        case 'auth/wrong-password':
            return 'Mật khẩu không đúng';
        case 'auth/email-already-in-use':
            return 'Email đã được sử dụng';
        case 'auth/weak-password':
            return 'Mật khẩu quá yếu';
        default:
            return 'Đã xảy ra lỗi, vui lòng thử lại';
    }
}

function initShowHidePassword() {
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    if (passwordInput && togglePassword) {
        togglePassword.addEventListener('click', function() {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            this.innerHTML = isHidden
                ? '<i class="fas fa-eye"></i>'
                : '<i class="fas fa-eye-slash"></i>';
        });
    }
}

function generateClassCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }
}

async function signupWithGoogle() {
    const roleStr = document.querySelector('input[name="role"]:checked')?.value;
    // Chuyển role về số
    let role = 0;
    if (roleStr === "teacher") role = 2;
    else if (roleStr === "parent") role = 1;
    // if roleStr is not selected, alert and return
    if (!roleStr) {
        alert("Vui lòng chọn vai trò.");
        return;
    }

    const googleProvider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(googleProvider);
        const user = result.user;
        if (user) {
            // Kiểm tra xem user đã tồn tại trong Firestore chưa
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            let userRole = role;
            if (!userDoc.exists) {
                // Tạo user mới với thông tin từ Google
                await createUserInFirestore({ userId: user.uid, username: user.displayName || "", fullname: user.displayName || "", email: user.email, birthdate: "", gender: "", role: role });
            } else {
                // Nếu đã có user, lấy role từ Firestore
                userRole = userDoc.data().role;
            }
            showSuccess("Đăng nhập bằng Google thành công! Đang chuyển hướng...");
            setTimeout(() => {
                if (userRole === 2) {
                    window.location.href = '../teacher-dashboard.html?userId=' + user.uid;
                } else if (userRole === 1) {
                    window.location.href = '../parent-dashboard.html?userId=' + user.uid;
                } else {
                    window.location.href = '../student-dashboard.html?userId=' + user.uid;
                }
            }, 1200);
        }
    } catch (error) {
        showError("Đăng nhập bằng Google thất bại.");
        console.error(error);
    }
}

function showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = "block";
    } else {
        alert(message);
    }
}

async function createUserInFirestore({ userId, username, fullname, email, birthdate, gender, role }) {
    const now = new Date().toISOString();
    // role: 0-student, 1-parent, 2-teacher
    await firebase.firestore().collection('users').doc(userId).set({
        user_name: username || "",
        full_name: fullname || "",
        email: email || "",
        DOB: birthdate || "",
        notifications: [],
        phone: "",
        address: "",
        gender: typeof gender === "number" ? gender : (gender === "male" ? 0 : gender === "female" ? 1 : 2),
        role: typeof role === "number" ? role : (role === "teacher" ? 2 : role === "parent" ? 1 : 0),
        created_at: now,
        last_login: now
    });

    // notification_preferences
    await firebase.firestore().collection('users').doc(userId).update({
        notification_preferences: {
            notifications: true,
            progress_updates: true,
            achievements: true,
            class_announcements: true
        }
    });

    // game_settings
    await firebase.firestore().collection('users').doc(userId).update({
        game_settings: {
            difficulty: "normal",
            sound_enabled: true,
            music_enabled: true,
            language: "vi",
            notifications_enabled: true
        }
    });

    // role-specific
    const userRole = typeof role === "number" ? role : (role === "teacher" ? 2 : role === "parent" ? 1 : 0);
    if (userRole === 2) {
        await firebase.firestore().collection('users').doc(userId).update({
            teacher_role: { listOfClasses: [] }
        });
    } else if (userRole === 1) {
        await firebase.firestore().collection('users').doc(userId).update({
            parent_role: { listOfChildren: [] }
        });
    } else {
        await firebase.firestore().collection('users').doc(userId).update({
            student_role: {
                parent_id: "",
                class_id: "",
                level: 1,
                exp_points: 0,
                diamonds: 0,
                total_learning_time: 0,
                total_practice_time: 0,
                learning_progress: [],
                activity_logs: [],
                toys: [],
                badges: []
            }
        });
    }
}

const mockStudentData = {
    student_role: {
        parent_id: "",
        class_id: "",
        level: 3,
        exp_points: 0,
        diamonds: 200,
        total_learning_time: 0,
        total_practice_time: 30,
        learning_progress: [
            {
                chapter: "Chương 1: Làm quen với các số đến 10",
                lesson: "Bài 1: Các số 1,2,3",
                status: 1,
                errorDetails: "1 + 1= 3 2 + 4 = 6 3 + 3 = 7",
                syncStatus: 1
            },
            {
                chapter: "Chương 1: Làm quen với các số đến 10",
                lesson: "Bài 2: Các số 4,5,6",
                status: 0,
                errorDetails: "4 + 1= 5 5 + 5 = 10 6 + 6 = 12",
                syncStatus: 1
            }
        ],
        badges: [
            {
                BadgeID: "FirstSteps",
                name: "First Steps",
                description: "Hoàn thành bài học toán đầu tiên.",
                obtained_at: "2025-04-15"
            },
            {
                BadgeID: "DailyMathematician",
                name: "Daily Mathematician",
                description: "Học toán ít nhất 3 ngày liên tiếp.",
                obtained_at: "2025-05-15"
            },
            {
                BadgeID: "CountingPro",
                name: "Counting Pro",
                description: "Hoàn thành bài tập đếm số đầu tiên.",
                obtained_at: "2025-05-15"
            },
            {
                BadgeID: "AdditionApprentice",
                name: "Addition Apprentice",
                description: "Hoàn thành phép cộng đầu tiên.",
                obtained_at: "2025-07-15"
            },
            {
                BadgeID: "SubtractionStarter",
                name: "Subtraction Starter",
                description: "Hoàn thành phép trừ đầu tiên.",
                obtained_at: "2025-06-15"
            },
        ],
        toys: [
            {
                toy_id: "Toy1",
                name: "Toy 1",
                description: "Toy 1 description",
                obtained_at: "2025-04-15"
            },
            {
                toy_id: "Toy2",
                name: "Toy 2",
                description: "Toy 2 description",
                obtained_at: "2025-05-15"
            },
            {
                toy_id: "Toy3",
                name: "Toy 3",
                description: "Toy 3 description",
                obtained_at: "2025-06-15"
            }
        ],
        activity_logs: [
            {
                student_id: "1",
                activity_id: "log1",
                activity_name: "Học tập: Chương 1. Bài 1: Các số 1,2,3",
                date: new Date().toISOString(),
                description: "Dạy trẻ cách xác định phương hướng",
                correct_problems: 7 ,
                total_problems: 7,
                time_taken: 10,
                activity_type: "Học tập",
            },
            {
                student_id: "1",
                activity_id: "log2",
                activity_name: "Học tập: Chương 1. Bài 2: Các số 4,5,6",
                date: new Date().toISOString(),
                description: "Dạy trẻ cách xác định phương hướng",
                correct_problems: 7,
                total_problems: 7,
                time_taken: 10,
                activity_type: "Học tập",
            },
            {
                student_id: "1",
                activity_id: "log3",
                activity_name: "Luyện tập: Mini-game đếm số",
                date: new Date().toISOString(),
                description: "Dạy trẻ cách xác định phương hướng",
                correct_problems: 0,
                total_problems: 0,
                time_taken: 20,
                activity_type: "Luyện tập",
            }
        ]
    }
}
