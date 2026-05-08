const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ── Multer config ──────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/audio');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, safe);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file audio: mp3, wav, flac, m4a, ogg'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── Controllers ────────────────────────────────────────────────────────────────

const uploadController = {

    // POST /api/upload/hashtags — tạo hashtag mới
    createHashtag: async (req, res) => {
        const name = req.body.name?.trim();
        if (!name) return res.status(400).json({ message: 'Thiếu tên hashtag' });
        try {
            const [[existing]] = await db.query('SELECT hashtag_id, name FROM hashtag WHERE name = ?', [name]);
            if (existing) return res.status(200).json(existing);

            const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(hashtag_id), 0) AS maxId FROM hashtag');
            const newId = maxId + 1;
            await db.query('INSERT INTO hashtag (hashtag_id, name) VALUES (?, ?)', [newId, name]);
            res.status(201).json({ hashtag_id: newId, name });
        } catch (error) {
            console.error('Lỗi createHashtag:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    // GET /api/upload/hashtags — danh sách tất cả hashtag
    getHashtags: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT hashtag_id, name FROM hashtag ORDER BY name'
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Lỗi getHashtags:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    uploadMiddleware: upload.single('audio'),

    // POST /api/upload/songs
    uploadSong: async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Thiếu file audio' });
        }

        const { title, lyrics, artistIds } = req.body;

        if (!title?.trim()) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'Thiếu tiêu đề bài hát' });
        }

        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const fileUrl = `${baseUrl}/audio/${req.file.filename}`;

            const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(song_id), 0) AS maxId FROM songs');
            const songId = maxId + 1;

            await db.query(
                `INSERT INTO songs (song_id, title, file_url, lyrics, status, is_new)
                 VALUES (?, ?, ?, ?, 'active', 1)`,
                [songId, title.trim(), fileUrl, lyrics?.trim() || null]
            );

            // Liên kết với ca sĩ nếu có
            const ids = artistIds
                ? (Array.isArray(artistIds) ? artistIds : [artistIds]).map(Number).filter(Boolean)
                : [];

            for (let i = 0; i < ids.length; i++) {
                await db.query(
                    'INSERT INTO song_artists (song_id, artist_id, display_order) VALUES (?, ?, ?)',
                    [songId, ids[i], i + 1]
                );
            }

            // Liên kết hashtag nếu có
            const hids = req.body.hashtagIds
                ? (Array.isArray(req.body.hashtagIds) ? req.body.hashtagIds : [req.body.hashtagIds]).map(Number).filter(Boolean)
                : [];
            for (const hid of hids) {
                await db.query(
                    'INSERT IGNORE INTO song_hashtag (songId, hashtagId) VALUES (?, ?)',
                    [songId, hid]
                );
            }

            res.status(201).json({ song_id: songId, title: title.trim(), file_url: fileUrl });
        } catch (error) {
            fs.unlink(req.file.path, () => {});
            console.error('Lỗi uploadSong:', error);
            res.status(500).json({ message: 'Lỗi server khi lưu bài hát' });
        }
    },

    // GET /api/upload/songs — danh sách bài hát, hỗ trợ ?q=&status=&page=&limit=
    getAllSongs: async (req, res) => {
        const q = req.query.q?.trim() || '';
        const status = req.query.status || 'all'; // all|active|pending|inactive
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        try {
            const conditions = [];
            const params = [];
            if (q) { conditions.push('s.title LIKE ?'); params.push(`%${q}%`); }
            if (status !== 'all') { conditions.push('s.status = ?'); params.push(status); }
            const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

            const [[{ total }]] = await db.query(
                `SELECT COUNT(*) AS total FROM songs s ${where}`, params
            );

            const [rows] = await db.query(`
                SELECT s.song_id, s.title, s.file_url, s.status, s.is_new,
                       s.play_count, s.like_count, s.lyrics,
                       COALESCE(
                           (SELECT GROUP_CONCAT(a.artist_name ORDER BY sa2.display_order SEPARATOR ', ')
                            FROM song_artists sa2 JOIN artists a ON sa2.artist_id = a.artist_id
                            WHERE sa2.song_id = s.song_id),
                           'Chưa xác định'
                       ) AS artist
                FROM songs s
                ${where}
                ORDER BY s.song_id DESC
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            res.status(200).json({ songs: rows, total, page, limit });
        } catch (error) {
            console.error('Lỗi getAllSongs upload:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    // GET /api/upload/artists — danh sách ca sĩ để chọn
    getArtists: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT artist_id, artist_name FROM artists ORDER BY artist_name'
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Lỗi getArtists:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    // GET /api/upload/songs/:id — chi tiết 1 bài (dùng cho form sửa)
    getSong: async (req, res) => {
        const { id } = req.params;
        try {
            const [[song]] = await db.query(
                'SELECT song_id, title, file_url, lyrics, status FROM songs WHERE song_id = ?', [id]
            );
            if (!song) return res.status(404).json({ message: 'Không tìm thấy bài hát' });

            const [artistRows] = await db.query(
                'SELECT artist_id FROM song_artists WHERE song_id = ? ORDER BY display_order', [id]
            );
            song.artistIds = artistRows.map(r => r.artist_id);

            const [hashtagRows] = await db.query(
                'SELECT hashtagId FROM song_hashtag WHERE songId = ? ORDER BY hashtagId', [id]
            );
            song.hashtagIds = hashtagRows.map(r => r.hashtagId);
            res.json(song);
        } catch (error) {
            console.error('Lỗi getSong:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    // PUT /api/upload/songs/:id — cập nhật bài hát (file audio tùy chọn)
    updateSong: async (req, res) => {
        const { id } = req.params;
        const { title, lyrics, artistIds } = req.body;

        if (!title?.trim()) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'Thiếu tiêu đề bài hát' });
        }

        try {
            const [[song]] = await db.query(
                'SELECT file_url FROM songs WHERE song_id = ?', [id]
            );
            if (!song) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(404).json({ message: 'Không tìm thấy bài hát' });
            }

            let fileUrl = song.file_url;

            if (req.file) {
                // Xóa file cũ nếu có
                if (song.file_url) {
                    const oldName = path.basename(song.file_url);
                    const oldPath = path.join(__dirname, '../uploads/audio', oldName);
                    if (fs.existsSync(oldPath)) fs.unlink(oldPath, () => {});
                }
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                fileUrl = `${baseUrl}/audio/${req.file.filename}`;
            }

            const newStatus = ['active','pending','inactive'].includes(req.body.status) ? req.body.status : undefined;
            if (newStatus) {
                await db.query(
                    'UPDATE songs SET title = ?, file_url = ?, lyrics = ?, status = ? WHERE song_id = ?',
                    [title.trim(), fileUrl, lyrics?.trim() || null, newStatus, id]
                );
            } else {
                await db.query(
                    'UPDATE songs SET title = ?, file_url = ?, lyrics = ? WHERE song_id = ?',
                    [title.trim(), fileUrl, lyrics?.trim() || null, id]
                );
            }

            // Cập nhật ca sĩ: xóa cũ → thêm mới
            await db.query('DELETE FROM song_artists WHERE song_id = ?', [id]);
            const ids = artistIds
                ? (Array.isArray(artistIds) ? artistIds : [artistIds]).map(Number).filter(Boolean)
                : [];
            for (let i = 0; i < ids.length; i++) {
                await db.query(
                    'INSERT INTO song_artists (song_id, artist_id, display_order) VALUES (?, ?, ?)',
                    [id, ids[i], i + 1]
                );
            }

            // Sync hashtag
            const hids = req.body.hashtagIds
                ? (Array.isArray(req.body.hashtagIds) ? req.body.hashtagIds : [req.body.hashtagIds]).map(Number).filter(Boolean)
                : [];
            await db.query('DELETE FROM song_hashtag WHERE songId = ?', [id]);
            for (const hid of hids) {
                await db.query(
                    'INSERT IGNORE INTO song_hashtag (songId, hashtagId) VALUES (?, ?)',
                    [id, hid]
                );
            }

            res.json({ song_id: id, title: title.trim(), file_url: fileUrl });
        } catch (error) {
            if (req.file) fs.unlink(req.file.path, () => {});
            console.error('Lỗi updateSong:', error);
            res.status(500).json({ message: 'Lỗi server khi cập nhật bài hát' });
        }
    },

    // GET /api/upload/songs/:id/file-check
    checkSongFile: async (req, res) => {
        const { id } = req.params;
        try {
            const [[song]] = await db.query(
                'SELECT song_id, title, file_url FROM songs WHERE song_id = ?', [id]
            );
            if (!song) return res.status(404).json({ ok: false, reason: 'Bài hát không có trong DB' });

            if (!song.file_url) {
                return res.json({ ok: false, reason: 'Chưa có file audio trong DB', song_id: id, title: song.title });
            }

            const filename = path.basename(song.file_url);
            const filePath = path.join(__dirname, '../uploads/audio', filename);
            const exists = fs.existsSync(filePath);

            res.json({
                ok: exists,
                song_id: id,
                title: song.title,
                file_url: song.file_url,
                disk_path: filePath,
                reason: exists ? null : 'File không tồn tại trên disk (đã bị xóa hoặc chưa upload)',
            });
        } catch (error) {
            console.error('Lỗi checkSongFile:', error);
            res.status(500).json({ ok: false, reason: 'Lỗi server' });
        }
    },

    // PATCH /api/upload/songs/:id/status — đổi status (approve/pending/inactive)
    updateStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ['active', 'pending', 'inactive'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Status không hợp lệ' });
        }
        try {
            const [result] = await db.query('UPDATE songs SET status = ? WHERE song_id = ?', [status, id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Không tìm thấy bài hát' });
            res.json({ song_id: id, status });
        } catch (error) {
            console.error('Lỗi updateStatus:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    // DELETE /api/upload/songs/:id
    deleteSong: async (req, res) => {
        const { id } = req.params;
        try {
            const [[song]] = await db.query(
                'SELECT file_url FROM songs WHERE song_id = ?', [id]
            );
            if (!song) return res.status(404).json({ message: 'Không tìm thấy bài hát' });

            if (song.file_url) {
                const filename = path.basename(song.file_url);
                const filePath = path.join(__dirname, '../uploads/audio', filename);
                if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
            }

            await db.query('DELETE FROM song_artists WHERE song_id = ?', [id]);
            await db.query('DELETE FROM favorites WHERE songId = ?', [id]);
            await db.query('DELETE FROM playlist_songs WHERE songId = ?', [id]);
            await db.query('DELETE FROM songs WHERE song_id = ?', [id]);

            res.status(200).json({ message: 'Đã xóa bài hát' });
        } catch (error) {
            console.error('Lỗi deleteSong:', error);
            res.status(500).json({ message: 'Lỗi server khi xóa bài hát' });
        }
    },
};

module.exports = uploadController;
