document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            messageDiv.textContent = "";
            messageDiv.style.display = "none";
            const email = emailInput.value.trim();

            if (!email) {
                showMessage("Vui lòng nhập email.", false);
                return;
            }

            // Kiểm tra email tồn tại
            const exists = await checkEmailInFirestore(email);
            if (!exists) {
                showMessage("Email không tồn tại trong hệ thống.", false);
                return;
            }

            try {
                await firebase.auth().sendPasswordResetEmail(email);
                showMessage("Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư.", true);
            } catch (error) {
                showMessage(getErrorMessage(error.code), false);
            }
        });
    }

    // Hàm kiểm tra email trong Firestore
    async function checkEmailInFirestore(email) {
        const querySnapshot = await firebase.firestore()
            .collection('users')
            .where("email", "==", email)
            .limit(1)
            .get();
        return !querySnapshot.empty;
    }

    // Hàm hiển thị thông báo
    function showMessage(msg, success) {
        messageDiv.textContent = msg;
        messageDiv.style.display = "block";
        messageDiv.style.color = success ? "#28a745" : "#ff6a88";
    }

    // Hàm lấy thông báo lỗi
    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'Email không hợp lệ';
            case 'auth/user-not-found':
                return 'Không tìm thấy tài khoản với email này';
            default:
                return 'Đã xảy ra lỗi, vui lòng thử lại';
        }
    }
});
