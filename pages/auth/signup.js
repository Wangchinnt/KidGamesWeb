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

    try {
        // 1. Tạo tài khoản Firebase
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const userId = user.uid;
        const now = new Date().toISOString();

        // 2. Lưu vào bảng users
        await firebase.firestore().collection('users').doc(userId).set({
            user_name: username,
            full_name: fullname,
            email: email,
            DOB: birthdate,
            phone: "", // hoặc lấy từ form nếu có
            address: "",
            gender: gender === "male" ? 1 : 0,
            role: role === "teacher" ? 2 : role === "parent" ? 1 : 0, // 0: student, 1: parent, 2: teacher
            created_at: now,
            last_login: now
        });

        // 3. Lưu notification_preferences trong user_id (field notification_preferences)
        await firebase.firestore().collection('users').doc(userId).update({
            notification_preferences: {
                notifications: [],
                progress_updates: true,
                achievements: true,
                class_announcements: true
            }
        });

        // 4. Lưu game_settings trong user_id (field game_settings)
        await firebase.firestore().collection('users').doc(userId).update({
            game_settings: {
                difficulty: "normal",
                sound_enabled: true,
                music_enabled: true,
                language: "vi",
                notifications_enabled: true
            }
        });

        // 5. Lưu role-specific trong user_id
        if (role === "teacher") {
            // Tạo lớp học mẫu
            // Lưu teacher_role là một field map, có listOfClasses là mảng
            await firebase.firestore().collection('users').doc(userId).update({
                teacher_role: {
                    listOfClasses: []
                }
            });
        } else if (role === "parent") {
            await firebase.firestore().collection('users').doc(userId).update({
                parent_role: {
                    listOfChildren: []
                }
            });
        } else if (role === "student") {
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

        // Thành công
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.textContent = "Đăng ký thành công! Đang chuyển hướng...";
            successMessage.style.display = "block";
        }
        setTimeout(() => {
            if (role === "teacher") {
                window.location.href = '../teacher-dashboard.html';
            } else if (role === "parent") {
                window.location.href = '../parent-dashboard.html';
            } else {
                window.location.href = '../student-dashboard.html';
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
    const role = document.querySelector('input[name="role"]:checked')?.value;
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(googleProvider);
        const user = result.user;
        if (user) {
            // Kiểm tra xem user đã tồn tại trong Firestore chưa
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                // Tạo user mới với thông tin từ Google
                await firebase.firestore().collection('users').doc(user.uid).set({
                    user_name: user.displayName || "",
                    full_name: user.displayName || "",
                    email: user.email,
                    role: role,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                });
            }
            showSuccess("Đăng nhập bằng Google thành công! Đang chuyển hướng...");
            setTimeout(() => {
                // Chuyển hướng theo role nếu muốn
                if (role === "teacher") {
                    window.location.href = '../teacher-dashboard.html';
                } else if (role === "parent") {
                    window.location.href = '../parent-dashboard.html';
                } else {
                    window.location.href = '../student-dashboard.html';
                }
            }, 1200);
        }
    } catch (error) {
        showError("Đăng nhập bằng Google thất bại.");
    }
}

