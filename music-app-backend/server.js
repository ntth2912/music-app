const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const musicRoutes = require('./routes/musicRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

dotenv.config();
const app = express();

// Thêm cột listened_seconds vào user_events nếu chưa có
(async () => {
  try {
    const db = require('./config/db');
    await db.query(`
      ALTER TABLE user_events
      ADD COLUMN listened_seconds INT UNSIGNED NOT NULL DEFAULT 0
    `);
    console.log('[DB] Đã thêm cột listened_seconds vào user_events');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.warn('[DB] Migration listened_seconds:', err.message);
    }
  }
})();

app.use(cors());
app.use(express.json());

// Serve file audio tĩnh: GET /audio/filename.mp3
app.use('/audio', express.static(path.join(__dirname, 'uploads/audio')));

app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => {
    res.send('Backend đang chạy tốt!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});