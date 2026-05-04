const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // ĐỂ TRỐNG NẾU KHÔNG CÓ PASS
  database: 'mhh', 
  port: 3307,// THAY ĐÚNG TÊN DATABASE CỦA HIỀN
  waitForConnections: true,
  connectionLimit: 10
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Truy vấn trực tiếp từ MySQL
  const query = "SELECT user_id, email, role FROM users WHERE email = ? AND password = ?";
  
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("Lỗi MySQL:", err);
      return res.status(500).json({ message: "Lỗi kết nối Database" });
    }
    
    if (results.length > 0) {
      res.status(200).json(results[0]); // Trả về user thật
    } else {
      res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
    }
  });
});

module.exports = router;