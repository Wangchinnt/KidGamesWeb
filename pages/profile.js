document.addEventListener('DOMContentLoaded', function() {
    // Lấy userId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    // Load thông tin người dùng từ Firestore
    async function loadUserProfile() {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists) throw new Error('Không tìm thấy thông tin người dùng');
            const userData = userDoc.data();

            // Cập nhật UI
            document.getElementById('user_name').value = userData.user_name || '';
            document.getElementById('email').value = userData.email || '';
            document.getElementById('fullname').value = userData.full_name || '';
            document.getElementById('phone').value = userData.phone || '';
            document.getElementById('address').value = userData.address || '';
            document.getElementById('birthday').value = userData.DOB
                ? new Date(userData.DOB.seconds ? userData.DOB.seconds * 1000 : userData.DOB).toISOString().split('T')[0]
                : '';
            document.getElementById('gender').value = userData.gender != null ? userData.gender : '0';

            // Vai trò
            let roleText = '';
            if (userData.role === 0) roleText = 'Học sinh';
            else if (userData.role === 1) roleText = 'Phụ huynh';
            else roleText = 'Giáo viên';
            document.getElementById('user-role').textContent = roleText;

            // Lớp: chỉ hiện nếu là học sinh
            const userClassElem = document.getElementById('user-class');
            if (userData.role === 0) {
                userClassElem.style.display = '';
                userClassElem.textContent = userData.student_role?.class_id || 'Chưa có lớp';
            } else {
                userClassElem.style.display = 'none';
            }

            // Tên hiển thị
            if (document.getElementById('user-name')) {
                document.getElementById('user-name').textContent = userData.full_name || '';
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Không thể tải thông tin người dùng. Vui lòng đăng nhập lại.');
        }
    }

    loadUserProfile();

    // Chỉ giữ 1 event listener cho submit
    document.getElementById('profile-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveUserProfile();
    });

    async function saveUserProfile() {
        try {
            const formData = {
                full_name: document.getElementById('fullname').value,
                DOB: document.getElementById('birthday').value ? new Date(document.getElementById('birthday').value) : null,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                gender: parseInt(document.getElementById('gender').value, 10)
            };
            await firebase.firestore().collection('users').doc(userId).update(formData);

            // Lấy lại userData để biết role
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            const userData = userDoc.data();

            alert('Cập nhật thông tin thành công!');
            let href = "";
            if (userData.role === 0) href = 'student-dashboard.html?userId=' + userId;
            else if (userData.role === 1) href = 'parent-dashboard.html?userId=' + userId;
            else href = 'teacher-dashboard.html?userId=' + userId;
            window.location.href = href;
        } catch (error) {
            alert('Có lỗi xảy ra. Vui lòng thử lại sau.');
            console.error('Error:', error);
        }
    }
});
