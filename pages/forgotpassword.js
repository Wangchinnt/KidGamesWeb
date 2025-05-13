document.getElementById('forgot-password-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const messageDiv = document.getElementById('message');
    
    try {
        // TODO: Thay thế bằng API call thực tế
        // Ví dụ với Firebase:
        // await firebase.auth().sendPasswordResetEmail(email);
        
        messageDiv.className = 'success';
        messageDiv.textContent = 'Nếu email hợp lệ, hướng dẫn đặt lại mật khẩu đã được gửi!';
        
        // Xóa form
        this.reset();
        
        // Chuyển hướng sau 3 giây
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
        console.error('Error:', error);
    }
}); 