const firebaseConfig = {
    apiKey: "AIzaSyA_kx2mi6cqOxieXZOFvJCt1OaYZ7MmxLo",
    authDomain: "kidgames-19112003.firebaseapp.com",
    databaseURL: "https://kidgames-19112003-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kidgames-19112003",
    storageBucket: "kidgames-19112003.appspot.com",
    messagingSenderId: "348205482193",
    appId: "1:348205482193:web:4d3d6744691d4634b5c5f0",
    measurementId: "G-59QZJGR5FS"
};
// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
// Nếu muốn dùng Firestore toàn cục:
const db = firebase.firestore();


