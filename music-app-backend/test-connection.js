const pool = require('./config/db'); // Đường dẫn chuẩn vào thư mục config

async function testConnection() {
    try {
        // Thử lấy tên ca sĩ từ bảng ARTISTS mà Hiền vừa nạp
        const [rows] = await pool.query('SELECT artist_name FROM ARTISTS LIMIT 3');
        console.log('✅ Tuyệt vời Hiền ơi! Kết nối Database mhh thành công.');
        console.log('🎵 Dữ liệu mẫu:', rows);
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi rồi! Hiền kiểm tra lại XAMPP/MariaDB nhé:', err.message);
        process.exit(1);
    }
}

testConnection();