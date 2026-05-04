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

            const [result] = await db.query(
                `INSERT INTO songs (title, file_url, lyrics, status, is_new)
                 VALUES (?, ?, ?, 'active', 1)`,
                [title.trim(), fileUrl, lyrics?.trim() || null]
            );
            const songId = result.insertId;

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

            res.status(201).json({ song_id: songId, title: title.trim(), file_url: fileUrl });
        } catch (error) {
            fs.unlink(req.file.path, () => {});
            console.error('Lỗi uploadSong:', error);
            res.status(500).json({ message: 'Lỗi server khi lưu bài hát' });
        }
    },

    // GET /api/upload/songs — danh sách tất cả bài hát kèm ca sĩ
    getAllSongs: async (req, res) => {
        try {
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
                ORDER BY s.song_id DESC`);
            res.status(200).json(rows);
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

            await db.query(
                'UPDATE songs SET title = ?, file_url = ?, lyrics = ? WHERE song_id = ?',
                [title.trim(), fileUrl, lyrics?.trim() || null, id]
            );

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
