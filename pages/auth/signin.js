document.addEventListener('DOMContentLoaded', function() {
    initSignin();
    initShowHidePassword();
    initGoogleSignin();
    initRememberMe();
});

function initSignin() {
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', handleSigninSubmit);
    }
    // Remember Me
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe) {
        document.querySelector('.checkbox-container input[type="checkbox"]').checked = true;
    }
}

async function handleSigninSubmit(e) {
    e.preventDefault();
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
    successMessage.textContent = "";
    successMessage.style.display = "none";

    const usernameOrEmail = document.getElementById('UsernameOrEmail')?.value.trim();
    const password = document.getElementById('password')?.value;

    // Validate input
    if (!usernameOrEmail || !password) {
        showError("Vui lòng nhập đầy đủ thông tin đăng nhập.");
        return;
    }

    try {
        let email = usernameOrEmail;
        // Nếu nhập là username, tra cứu email từ Firestore
        if (!validateEmail(usernameOrEmail)) {
            // Tìm user theo username
            const querySnapshot = await firebase.firestore()
                .collection('users')
                .where('user_name', '==', usernameOrEmail)
                .limit(1)
                .get();
            if (querySnapshot.empty) {
                showError("Thông tin đăng nhập hoặc mật khẩu không đúng.");
                return;
            }
            email = querySnapshot.docs[0].data().email;
        }

        // Đăng nhập bằng email và mật khẩu
        await firebase.auth().signInWithEmailAndPassword(email, password);

        // Ghi nhớ đăng nhập nếu được chọn
        const rememberMe = document.querySelector('.checkbox-container input[type="checkbox"]')?.checked;
        if (rememberMe) {
            // Đã đăng nhập, Firebase sẽ tự giữ session, có thể lưu thêm vào localStorage nếu muốn
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberMe');
        }

        showSuccess("Đăng nhập thành công! Đang chuyển hướng...");
        // Lấy vai trò và chuyển hướng phù hợp
        const user = firebase.auth().currentUser;
        if (user) {
            // Lấy role từ Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            const role = userDoc.data()?.role;
            setTimeout(() => {
                if (role === 2) {
                    window.location.href = '../teacher-dashboard.html?userId=' + user.uid;
                } else if (role === 1) {
                    window.location.href = '../parent-dashboard.html?userId=' + user.uid;
                } else {
                    window.location.href = '../student-dashboard.html?userId=' + user.uid;
                }
            }, 1200);
        }
    } catch (error) {
        console.error(error);
        showError("Thông tin đăng nhập hoặc mật khẩu không đúng.");
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }
}
function showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = "block";
    }
}
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function initGoogleSignin() {
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async function() {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                // Kiểm tra user đã có trong Firestore chưa, nếu chưa thì tạo mới
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                let userRole = 0; // mặc định là student
                if (!userDoc.exists) {
                    // Tạo user mới với thông tin từ Google
                    await createUserInFirestore({
                        userId: user.uid,
                        username: user.displayName || "",
                        fullname: user.displayName || "",
                        email: user.email,
                        birthdate: "",
                        gender: 0,
                        role: 0
                    });
                } else {
                    userRole = userDoc.data().role ?? 0;
                }

                // Remember Me
                const rememberMe = document.querySelector('.checkbox-container input[type="checkbox"]')?.checked;
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('rememberMe');
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
            } catch (error) {
                console.error(error);
                showError("Đăng nhập bằng Google thất bại.");
            }
        });
    }
}

function initRememberMe() {
    const rememberMe = document.querySelector('.checkbox-container input[type="checkbox"]');
    if (rememberMe) {
        rememberMe.addEventListener('change', function() {
            if (this.checked) {
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberMe');
            }
        });
    }
}
