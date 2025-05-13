document.addEventListener('DOMContentLoaded', function() {
    // Xử lý form submit
    const profileForm = document.getElementById('profile-form');
    
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            fullname: document.getElementById('fullname').value,
            phone: document.getElementById('phone').value,
            birthday: document.getElementById('birthday').value,
            gender: document.getElementById('gender').value
        };

        try {
            // Lưu thông tin vào localStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    ...formData
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                
                // Cập nhật UI
                document.getElementById('user-name').textContent = formData.fullname;
                
                alert('Cập nhật thông tin thành công!');
                window.location.href = 'student-dashboard.html';
            } else {
                throw new Error('Không tìm thấy thông tin người dùng');
            }
        } catch (error) {
            alert('Có lỗi xảy ra. Vui lòng thử lại sau.');
            console.error('Error:', error);
        }
    });

    // Load thông tin người dùng
    async function loadUserProfile() {
        try {
            // Lấy thông tin từ localStorage
            const userData = JSON.parse(localStorage.getItem('currentUser'));
            
            if (userData) {
                // Cập nhật UI
                document.getElementById('user-name').textContent = userData.fullname;
                document.getElementById('user-role').textContent = userData.role || 'Học sinh';
                document.getElementById('user-class').textContent = userData.class || 'Lớp 1A';
                
                document.getElementById('fullname').value = userData.fullname;
                document.getElementById('email').value = userData.email;
                document.getElementById('phone').value = userData.phone || '';
                document.getElementById('birthday').value = userData.birthday || '';
                document.getElementById('gender').value = userData.gender || 'male';
            } else {
                throw new Error('Không tìm thấy thông tin người dùng');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.');
            window.location.href = 'login.html';
        }
    }

    loadUserProfile();
}); 