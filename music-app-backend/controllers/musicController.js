const db = require('../config/db');

// Subqueries tái sử dụng để lấy tên + id tất cả ca sĩ của bài hát (qua bảng song_artists)
const ARTIST_NAME_SQL = `
    COALESCE(
        (SELECT GROUP_CONCAT(a.artist_name ORDER BY ast2.display_order SEPARATOR ', ')
         FROM song_artists ast2 JOIN artists a ON ast2.artist_id = a.artist_id
         WHERE ast2.song_id = s.song_id),
        'Chưa xác định'
    )`;

const ARTIST_JSON_SQL = `
    CONCAT('[', COALESCE(
        (SELECT GROUP_CONCAT(
            JSON_OBJECT('artist_id', a.artist_id, 'artist_name', a.artist_name)
            ORDER BY ast2.display_order
            SEPARATOR ','
         )
         FROM song_artists ast2 JOIN artists a ON ast2.artist_id = a.artist_id
         WHERE ast2.song_id = s.song_id),
    ''), ']')`;

const HASHTAG_JOIN_FOR_SH2 = 'LEFT JOIN hashtag h ON h.hashtag_id = sh2.hashtagId';
const HASHTAG_JOIN_FOR_SH = 'LEFT JOIN hashtag h ON h.hashtag_id = sh.hashtagId';
const HASHTAG_NAME_SQL = `IFNULL(NULLIF(TRIM(h.name), ''), '')`;

const HASHTAG_JSON_SQL = `
    CONCAT('[', COALESCE(
        (SELECT GROUP_CONCAT(
            JSON_OBJECT(
                'hashtag_id', sh2.hashtagId,
                'name', ${HASHTAG_NAME_SQL}
            )
            ORDER BY sh2.hashtagId
            SEPARATOR ','
         )
         FROM song_hashtag sh2
         ${HASHTAG_JOIN_FOR_SH2}
         WHERE sh2.songId = s.song_id),
    ''), ']')`;

/* Xếp hạng gợi ý: điểm tổng trọng số (weighted linear score) — cách hay dùng cho MVP.
   score = w_play * play_count + w_like * like_count (like thường trọng số cao hơn vì hiếm hơn). */
const SUGGESTION_SCORE_WEIGHT_PLAY = 1;
const SUGGESTION_SCORE_WEIGHT_LIKE = 3;

const SONG_POPULARITY_SCORE_SQL = `(
    COALESCE(s.play_count, 0) * ${SUGGESTION_SCORE_WEIGHT_PLAY}
    + COALESCE(s.like_count, 0) * ${SUGGESTION_SCORE_WEIGHT_LIKE}
)`;

/* Trang chủ listener — gợi ý cá nhân (khi có userId):
 * H = tổng trọng số hashtag: mỗi hashtag t trên bài ứng viên cộng thêm “số lần hashtag t xuất hiện trong bài đã thích” của user (COUNT từ song_hashtag qua favorites).
 * A = 1 nếu bài chia sẻ ít nhất một artist với một bài đã thích, 0 nếu không.
 * P = play_count + 3·like_count (cùng công thức trending).
 *
 * Score = WH·H + WA·A + WP·P
 * (W chọn để hashtag/artist không bị một bài viral chỉ có P đè hoàn toàn thưởng thích gần nhau.) */
const HOME_WEIGHT_HASHTAG = 15;
const HOME_WEIGHT_ARTIST = 120;
const HOME_WEIGHT_POPULARITY = 1;
const HOME_SUGGESTIONS_LIMIT = 8;

const HOME_HASHTAG_AFFINITY_SQL = `
(SELECT COALESCE(SUM(tag_w.w), 0)
 FROM song_hashtag sh_c
 INNER JOIN (
     SELECT sh_f.hashtagId AS hid, COUNT(*) AS w
     FROM favorites fav
     INNER JOIN song_hashtag sh_f ON sh_f.songId = fav.songId
     WHERE fav.userId = ?
     GROUP BY sh_f.hashtagId
 ) tag_w ON tag_w.hid = sh_c.hashtagId
 WHERE sh_c.songId = s.song_id)`;

const HOME_ARTIST_MATCH_SQL = `
(CASE WHEN EXISTS (
    SELECT 1 FROM song_artists sa
    INNER JOIN (
        SELECT DISTINCT sa_f.artist_id
        FROM favorites fav_a
        INNER JOIN song_artists sa_f ON fav_a.songId = sa_f.song_id
        WHERE fav_a.userId = ?
    ) uf ON uf.artist_id = sa.artist_id
    WHERE sa.song_id = s.song_id
) THEN 1 ELSE 0 END)`;

const HOME_REC_SCORE_SQL = `(
    ${HOME_WEIGHT_HASHTAG} * ${HOME_HASHTAG_AFFINITY_SQL}
    + ${HOME_WEIGHT_ARTIST} * ${HOME_ARTIST_MATCH_SQL}
    + ${HOME_WEIGHT_POPULARITY} * ${SONG_POPULARITY_SCORE_SQL}
)`;

const FAVORITES_DISCOVERY_DEFAULT_LIMIT = 8;

function parseSongRows(rows) {
    return rows.map(({ artists_json, hashtags_json, ...row }) => ({
        ...row,
        artists: (() => {
            if (!artists_json) return [];
            try {
                const parsed = typeof artists_json === 'string'
                    ? JSON.parse(artists_json)
                    : artists_json;
                return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
            } catch {
                return [];
            }
        })(),
        hashtags: (() => {
            if (!hashtags_json) return [];
            try {
                const parsed = typeof hashtags_json === 'string'
                    ? JSON.parse(hashtags_json)
                    : hashtags_json;
                if (!Array.isArray(parsed)) return [];
                return parsed
                    .filter(Boolean)
                    .map((item) => {
                        const hashtag_id = Number(item?.hashtag_id ?? item?.hashtagId);
                        if (!Number.isFinite(hashtag_id)) return null;
                        return {
                            hashtag_id,
                            name: item?.name != null ? String(item.name) : '',
                        };
                    })
                    .filter(Boolean);
            } catch {
                return [];
            }
        })(),
    }));
}

const musicController = {
    getAllSongs: async (req, res) => {
        try {
            const keywordRaw = req.query.q != null ? String(req.query.q) : '';
            let whereClause = '';
            let params = [];

            if (keywordRaw.trim() !== '') {
                const kw = `%${keywordRaw.normalize('NFC')}%`;
                whereClause = ` WHERE (
                    s.title LIKE ?
                    OR s.song_id IN (
                        SELECT ast3.song_id FROM song_artists ast3
                        JOIN artists a2 ON ast3.artist_id = a2.artist_id
                        WHERE a2.artist_name LIKE ?
                    )
                )`;
                params.push(kw, kw);
            }

            const selectBody = `
                SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                    ${HASHTAG_JSON_SQL} AS hashtags_json
                FROM songs s`;

            const pageRaw =
                req.query.page != null ? parseInt(String(req.query.page), 10) : NaN;
            const requestedPage =
                Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : null;

            if (requestedPage !== null) {
                const limitRaw =
                    req.query.limit != null ? parseInt(String(req.query.limit), 10) : NaN;
                const pageSize =
                    Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100
                        ? limitRaw
                        : 20;

                const [countRows] = await db.query(
                    `SELECT COUNT(*) AS c FROM songs s${whereClause}`,
                    [...params],
                );
                const total = Number(countRows[0]?.c ?? 0);
                const totalPages =
                    total === 0 ? 1 : Math.ceil(total / pageSize);

                const offset = (requestedPage - 1) * pageSize;
                const [rows] = await db.query(
                    `${selectBody}${whereClause} ORDER BY s.song_id DESC LIMIT ? OFFSET ?`,
                    [...params, pageSize, offset],
                );
                return res.status(200).json({
                    items: parseSongRows(rows),
                    page: requestedPage,
                    pageSize,
                    total,
                    totalPages,
                });
            }

            let sql = `${selectBody}${whereClause}`;
            const limitLegacy =
                req.query.limit != null ? parseInt(String(req.query.limit), 10) : NaN;
            const safeLegacyLimit =
                Number.isFinite(limitLegacy) && limitLegacy > 0 && limitLegacy <= 500
                    ? limitLegacy
                    : null;

            let legacyParams = [...params];
            if (safeLegacyLimit !== null) {
                sql += ' ORDER BY s.song_id DESC LIMIT ?';
                legacyParams.push(safeLegacyLimit);
            }

            const [rows] = await db.query(sql, legacyParams);
            return res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getAllSongs:', error);
            res.status(500).json({ message: 'Lỗi hệ thống khi lấy danh sách nhạc' });
        }
    },

    getSongById: async (req, res) => {
        const songId = Number(req.params.songId);
        if (!Number.isFinite(songId) || songId <= 0) {
            return res.status(400).json({ message: 'ID bài hát không hợp lệ' });
        }
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                     ${HASHTAG_JSON_SQL} AS hashtags_json
                 FROM songs s WHERE s.song_id = ? LIMIT 1`,
                [songId]
            );
            if (!rows.length) {
                return res.status(404).json({ message: 'Không tìm thấy bài hát' });
            }
            res.status(200).json(parseSongRows(rows)[0]);
        } catch (error) {
            console.error('Lỗi getSongById:', error);
            res.status(500).json({ message: 'Lỗi hệ thống khi lấy bài hát' });
        }
    },

    getSongHashtagIds: async (req, res) => {
        const songId = Number(req.params.songId);
        if (!Number.isFinite(songId) || songId <= 0) {
            return res.status(400).json({ message: 'ID bài hát không hợp lệ' });
        }
        try {
            const [rows] = await db.query(
                `SELECT sh.hashtagId,
                        ${HASHTAG_NAME_SQL} AS hashtag_name
                 FROM song_hashtag sh
                 ${HASHTAG_JOIN_FOR_SH}
                 WHERE sh.songId = ?
                 ORDER BY sh.hashtagId`,
                [songId]
            );
            const hashtagIds = rows.map((r) => Number(r.hashtagId)).filter((id) => !Number.isNaN(id));
            const hashtags = rows.map((r) => {
                const hashtag_id = Number(r.hashtagId);
                const raw = r.hashtag_name;
                const name = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
                return { hashtag_id, name };
            }).filter((x) => !Number.isNaN(x.hashtag_id));
            res.status(200).json({ hashtagIds, hashtags });
        } catch (error) {
            console.error('Lỗi getSongHashtagIds:', error);
            res.status(500).json({ message: 'Lỗi hệ thống khi lấy hashtag' });
        }
    },

    getSongByHashtag: async (req, res) => {
        try {
            const list_hashtag = req.query.q;
    
            let sql = `
                SELECT DISTINCT s.*,
                       ${ARTIST_NAME_SQL} AS artist,
                       ${ARTIST_JSON_SQL} AS artists_json,
                       ${HASHTAG_JSON_SQL} AS hashtags_json
                FROM songs s
                JOIN song_hashtag sh ON s.song_id = sh.songId
            `;
    
            let params = [];
    
            if (list_hashtag && list_hashtag.trim() !== '') {
                const hashtagIds = list_hashtag
                    .split(',')
                    .map(id => Number(id.trim()))
                    .filter(id => !isNaN(id));
    
                if (hashtagIds.length > 0) {
                    sql += ` WHERE sh.hashtagId IN (?)`;
                    params.push(hashtagIds);
                }
            }
    
            sql += ` ORDER BY ${SONG_POPULARITY_SCORE_SQL} DESC, s.song_id DESC LIMIT 9`;

            const [rows] = await db.query(sql, params);

            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getSongByHashTag:', error);
            res.status(500).json({ message: 'Lỗi hệ thống khi lấy danh sách nhạc' });
        }
    },

    getTrendingSuggestions: async (req, res) => {
        const userId = Number(req.query.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Thiếu hoặc sai userId' });
        }
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json
                 FROM songs s
                 WHERE EXISTS (
                     SELECT 1 FROM song_artists sa
                     WHERE sa.song_id = s.song_id
                     AND sa.artist_id IN (
                         SELECT DISTINCT sa2.artist_id
                         FROM favorites f
                         INNER JOIN song_artists sa2 ON f.songId = sa2.song_id
                         WHERE f.userId = ?
                     )
                 )
                 AND NOT EXISTS (
                     SELECT 1 FROM favorites fv
                     WHERE fv.userId = ? AND fv.songId = s.song_id
                 )
                 ORDER BY ${SONG_POPULARITY_SCORE_SQL} DESC, s.song_id DESC
                 LIMIT 8`,
                [userId, userId]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getTrendingSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý trending' });
        }
    },

    getTrending: async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                       ${HASHTAG_JSON_SQL} AS hashtags_json,
                       (
                           COALESCE(s.play_count, 0) * ${SUGGESTION_SCORE_WEIGHT_PLAY}
                           + COALESCE(s.like_count, 0) * ${SUGGESTION_SCORE_WEIGHT_LIKE}
                           + (SELECT COUNT(*) FROM user_events ue
                              WHERE ue.song_id = s.song_id
                                AND ue.event_type = 'play'
                                AND ue.event_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)) * 5
                       ) AS trending_score
                FROM songs s
                ORDER BY trending_score DESC LIMIT 10`);
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getTrending:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy nhạc xu hướng' });
        }
    },

    getFavorites: async (req, res) => {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ message: 'Thiếu ID người dùng' });
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json
                 FROM songs s
                 INNER JOIN favorites f ON s.song_id = f.songId
                 WHERE f.userId = ?
                 ORDER BY f.created_at DESC`,
                [userId]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getFavorites:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy danh sách yêu thích' });
        }
    },

    /**
     * Gợi ý khám phá cho trang Yêu thích — chỉ bài CHƯA tim.
     * Thỏa (OR): không có hashtag; hoặc có ít nhất một hashtag không xuất hiện trong bất kỳ bài đã thích;
     * hoặc không chia sĩ với nhóm ca sĩ của thư viện đã thích.
     * Không có bài thích → trả mảng rỗng.
     */
    getFavoriteDiscoverySuggestions: async (req, res) => {
        const rawId = Number(req.params.userId);
        if (!Number.isFinite(rawId) || rawId <= 0) {
            return res.status(400).json({ message: 'Thiếu hoặc sai ID người dùng' });
        }

        const limParsed = Number(req.query.limit);
        const limit = Number.isFinite(limParsed) && limParsed > 0 ? limParsed : FAVORITES_DISCOVERY_DEFAULT_LIMIT;
        const safeLimit = Math.min(Math.max(1, limit), 24);

        try {
            const [[countRow]] = await db.query(
                'SELECT COUNT(*) AS n FROM favorites WHERE userId = ?',
                [rawId],
            );
            if (!(Number(countRow?.n ?? 0) > 0)) {
                return res.status(200).json([]);
            }

            const discoverySql = `
                SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                       ${HASHTAG_JSON_SQL} AS hashtags_json
                FROM songs s
                WHERE NOT EXISTS (
                    SELECT 1 FROM favorites fv
                    WHERE fv.userId = ? AND fv.songId = s.song_id
                )
                AND (
                    NOT EXISTS (SELECT 1 FROM song_hashtag shz WHERE shz.songId = s.song_id)
                    OR EXISTS (
                        SELECT 1 FROM song_hashtag sh_new
                        WHERE sh_new.songId = s.song_id
                        AND NOT EXISTS (
                            SELECT 1 FROM favorites f_ht
                            INNER JOIN song_hashtag sh_in ON sh_in.songId = f_ht.songId
                            WHERE f_ht.userId = ? AND sh_in.hashtagId = sh_new.hashtagId
                        )
                    )
                    OR NOT EXISTS (
                        SELECT 1 FROM song_artists sa
                        INNER JOIN (
                            SELECT DISTINCT sa_o.artist_id
                            FROM favorites ff
                            INNER JOIN song_artists sa_o ON ff.songId = sa_o.song_id
                            WHERE ff.userId = ?
                        ) fav_art ON fav_art.artist_id = sa.artist_id
                        WHERE sa.song_id = s.song_id
                    )
                )
                ORDER BY ${SONG_POPULARITY_SCORE_SQL} DESC, s.song_id DESC
                LIMIT ?`;

            const [rows] = await db.query(discoverySql, [
                rawId,
                rawId,
                rawId,
                safeLimit,
            ]);
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getFavoriteDiscoverySuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý yêu thích' });
        }
    },

    toggleFavorite: async (req, res) => {
        const userId = Number(req.body.userId);
        const songId = Number(req.body.songId);
        console.log('userId: ', userId)
        console.log('songID: ', songId)
        try {
            const [existing] = await db.query(
                'SELECT 1 FROM favorites WHERE userId = ? AND songId = ?',
                [userId, songId]
            );
            if (existing.length > 0) {
                await db.query('DELETE FROM favorites WHERE userId = ? AND songId = ?', [userId, songId]);
                return res.status(200).json({ isFavorite: false });
            }
            await db.query('INSERT INTO favorites (userId, songId) VALUES (?, ?)', [userId, songId]);
            return res.status(200).json({ isFavorite: true });
        } catch (error) {
            console.error('Lỗi toggleFavorite:', error);
            res.status(500).json({ message: 'Lỗi xử lý yêu thích' });
        }
    },

    // ── Artists ────────────────────────────────────────────────────────────────

    getAllArtists: async (req, res) => {
        const { q } = req.query;
        try {
            const params = [];
            let whereClause = '';
            if (q && q.trim()) {
                whereClause = 'WHERE a.artist_name LIKE ?';
                params.push(`%${q.trim()}%`);
            }
            const [rows] = await db.query(
                `SELECT a.artist_id, a.artist_name, a.avatar_url, a.biography,
                        COUNT(DISTINCT sa.song_id) AS song_count
                 FROM artists a
                 LEFT JOIN song_artists sa ON sa.artist_id = a.artist_id
                 ${whereClause}
                 GROUP BY a.artist_id
                 ORDER BY a.artist_name ASC`,
                params
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Lỗi getAllArtists:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy danh sách ca sĩ' });
        }
    },

    getArtistInfo: async (req, res) => {
        const { id } = req.params;
        try {
            const [[artist]] = await db.query(
                'SELECT artist_id, artist_name, biography, avatar_url FROM artists WHERE artist_id = ?',
                [id]
            );
            if (!artist) return res.status(404).json({ message: 'Không tìm thấy ca sĩ' });
            res.status(200).json(artist);
        } catch (error) {
            console.error('Lỗi getArtistInfo:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy thông tin ca sĩ' });
        }
    },

    getArtistSongs: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json
                 FROM songs s
                 INNER JOIN song_artists ast ON s.song_id = ast.song_id
                 WHERE ast.artist_id = ?`,
                [id]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getArtistSongs:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy bài hát của ca sĩ' });
        }
    },

    // ── Playlists ──────────────────────────────────────────────────────────────

    getUserPlaylists: async (req, res) => {
        const { userId } = req.params;
        try {
            const [rows] = await db.query(
                `SELECT 
                    p.*,
                    COUNT(ps.songId) AS song_count
                 FROM playlists p
                 LEFT JOIN playlist_songs ps ON ps.playlistId = p.id
                 WHERE p.userId = ?
                 GROUP BY p.id
                 ORDER BY p.id DESC`,
                [userId],
            );
            res.status(200).json(rows || []);
        } catch (error) {
            console.error('Lỗi getUserPlaylists:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy playlist' });
        }
    },

    createPlaylist: async (req, res) => {
        const { name, userId, coverUrl } = req.body;
        if (!name || !userId) return res.status(400).json({ message: 'Thiếu name hoặc userId' });
        try {
            const [result] = await db.query(
                'INSERT INTO playlists (name, userId, coverUrl) VALUES (?, ?, ?)',
                [name.trim(), userId, coverUrl || null]
            );
            res.status(201).json({ id: result.insertId, name: name.trim(), userId, coverUrl: coverUrl || null });
        } catch (error) {
            console.error('Lỗi createPlaylist:', error);
            res.status(500).json({ message: 'Lỗi server khi tạo playlist' });
        }
    },

    updatePlaylist: async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Thiếu tên playlist' });
        try {
            await db.query('UPDATE playlists SET name = ? WHERE id = ?', [name.trim(), id]);
            res.status(200).json({ message: 'Cập nhật thành công' });
        } catch (error) {
            console.error('Lỗi updatePlaylist:', error);
            res.status(500).json({ message: 'Lỗi server khi cập nhật playlist' });
        }
    },

    deletePlaylist: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('DELETE FROM playlist_songs WHERE playlistId = ?', [id]);
            await db.query('DELETE FROM playlists WHERE id = ?', [id]);
            res.status(200).json({ message: 'Đã xóa playlist' });
        } catch (error) {
            console.error('Lỗi deletePlaylist:', error);
            res.status(500).json({ message: 'Lỗi server khi xóa playlist' });
        }
    },

    // ── Playlist Songs ─────────────────────────────────────────────────────────

    getPlaylistSongs: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json
                 FROM songs s
                 INNER JOIN playlist_songs ps ON s.song_id = ps.songId
                 WHERE ps.playlistId = ?
                 ORDER BY ps.created_at DESC`,
                [id]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getPlaylistSongs:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy bài hát playlist' });
        }
    },

    addSongToPlaylist: async (req, res) => {
        const { id } = req.params;
        const { songId } = req.body;
        if (!songId) return res.status(400).json({ message: 'Thiếu songId' });
        try {
            const [existing] = await db.query(
                'SELECT 1 FROM playlist_songs WHERE playlistId = ? AND songId = ?',
                [id, songId]
            );
            if (existing.length > 0) {
                return res.status(200).json({ message: 'Bài hát đã có trong playlist', alreadyExists: true });
            }
            await db.query('INSERT INTO playlist_songs (playlistId, songId) VALUES (?, ?)', [id, songId]);
            res.status(201).json({ message: 'Đã thêm vào playlist' });
        } catch (error) {
            console.error('Lỗi addSongToPlaylist:', error);
            res.status(500).json({ message: 'Lỗi server khi thêm bài hát vào playlist' });
        }
    },

    removeSongFromPlaylist: async (req, res) => {
        const { id, songId } = req.params;
        try {
            await db.query('DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?', [id, songId]);
            res.status(200).json({ message: 'Đã xóa khỏi playlist' });
        } catch (error) {
            console.error('Lỗi removeSongFromPlaylist:', error);
            res.status(500).json({ message: 'Lỗi server khi xóa bài hát khỏi playlist' });
        }
    },

    getHomeSuggestions: async (req, res) => {
        const userId = Number(req.query.userId);
        const baseSelect = `
            SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                   ${HASHTAG_JSON_SQL} AS hashtags_json
            FROM songs s`;

        try {
            if (!Number.isFinite(userId) || userId <= 0) {
                const [rows] = await db.query(
                    `${baseSelect}
                     ORDER BY ${SONG_POPULARITY_SCORE_SQL} DESC, s.song_id DESC
                     LIMIT ?`,
                    [HOME_SUGGESTIONS_LIMIT],
                );
                return res.status(200).json(parseSongRows(rows));
            }

            const [rows] = await db.query(
                `${baseSelect}
                 WHERE NOT EXISTS (
                     SELECT 1 FROM favorites fv WHERE fv.userId = ? AND fv.songId = s.song_id
                 )
                 ORDER BY ${HOME_REC_SCORE_SQL} DESC, s.song_id DESC
                 LIMIT ?`,
                [userId, userId, userId, HOME_SUGGESTIONS_LIMIT],
            );
            return res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getHomeSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý trang chủ' });
        }
    },

    // Gợi ý trang Detail Song: "Người nghe bài này cũng nghe" — dựa trên user_events overlap
    getSongDetailSuggestions: async (req, res) => {
        const songId = Number(req.params.songId);
        const userId = Number(req.query.userId) || null;
        if (!Number.isFinite(songId) || songId <= 0) {
            return res.status(400).json({ message: 'songId không hợp lệ' });
        }
        try {
            // Tìm users khác cũng nghe bài này, rồi lấy bài họ hay nghe nhất (loại bài hiện tại + bài đã thích)
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json,
                        COUNT(ue2.event_id) AS co_listen_count
                 FROM user_events ue1
                 INNER JOIN user_events ue2 ON ue2.user_id = ue1.user_id
                     AND ue2.song_id != ? AND ue2.event_type = 'play'
                 INNER JOIN songs s ON s.song_id = ue2.song_id
                 WHERE ue1.song_id = ?
                   AND ue1.event_type = 'play'
                   AND (${userId ? 'ue1.user_id != ?' : '1=1'})
                   ${userId ? `AND NOT EXISTS (SELECT 1 FROM favorites fv WHERE fv.userId = ? AND fv.songId = s.song_id)` : ''}
                   AND s.song_id != ?
                 GROUP BY s.song_id
                 ORDER BY co_listen_count DESC, ${SONG_POPULARITY_SCORE_SQL} DESC
                 LIMIT 8`,
                userId
                    ? [songId, songId, userId, userId, songId]
                    : [songId, songId, songId]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getSongDetailSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý detail' });
        }
    },

    // Gợi ý trang Artist: bài của các nghệ sĩ khác mà fan của artist này cũng hay nghe
    getArtistPageSuggestions: async (req, res) => {
        const artistId = Number(req.params.artistId);
        const userId = Number(req.query.userId) || null;
        if (!Number.isFinite(artistId) || artistId <= 0) {
            return res.status(400).json({ message: 'artistId không hợp lệ' });
        }
        try {
            // Fans của artist này (users đã nghe ít nhất 3 bài) → bài họ nghe nhiều từ artist khác
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json,
                        COUNT(ue.event_id) AS fan_play_count
                 FROM user_events ue
                 INNER JOIN songs s ON s.song_id = ue.song_id
                 WHERE ue.user_id IN (
                     SELECT DISTINCT ue2.user_id
                     FROM user_events ue2
                     INNER JOIN song_artists sa2 ON sa2.song_id = ue2.song_id
                     WHERE sa2.artist_id = ? AND ue2.event_type = 'play'
                     GROUP BY ue2.user_id HAVING COUNT(*) >= 2
                 )
                 AND NOT EXISTS (
                     SELECT 1 FROM song_artists sa3 WHERE sa3.song_id = s.song_id AND sa3.artist_id = ?
                 )
                 ${userId ? `AND NOT EXISTS (SELECT 1 FROM favorites fv WHERE fv.userId = ? AND fv.songId = s.song_id)` : ''}
                 AND ue.event_type = 'play'
                 GROUP BY s.song_id
                 ORDER BY fan_play_count DESC, ${SONG_POPULARITY_SCORE_SQL} DESC
                 LIMIT 8`,
                userId ? [artistId, artistId, userId] : [artistId, artistId]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getArtistPageSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý artist page' });
        }
    },

    // Gợi ý trang Playlist: bài phù hợp để thêm vào playlist dựa trên hashtag/artist đã có trong playlist
    getPlaylistSuggestions: async (req, res) => {
        const playlistId = Number(req.params.playlistId);
        const userId = Number(req.query.userId) || null;
        if (!Number.isFinite(playlistId) || playlistId <= 0) {
            return res.status(400).json({ message: 'playlistId không hợp lệ' });
        }
        try {
            const [rows] = await db.query(
                `SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                        ${HASHTAG_JSON_SQL} AS hashtags_json,
                        (
                            /* hashtag overlap với playlist */
                            (SELECT COUNT(*) FROM song_hashtag sh_c
                             INNER JOIN song_hashtag sh_p ON sh_p.hashtagId = sh_c.hashtagId
                             INNER JOIN playlist_songs ps ON ps.songId = sh_p.songId
                             WHERE sh_c.songId = s.song_id AND ps.playlistId = ?) * 10
                            /* artist overlap */
                            + (SELECT COUNT(*) FROM song_artists sa_c
                               INNER JOIN song_artists sa_p ON sa_p.artist_id = sa_c.artist_id
                               INNER JOIN playlist_songs ps2 ON ps2.songId = sa_p.song_id
                               WHERE sa_c.song_id = s.song_id AND ps2.playlistId = ?) * 20
                            + ${SONG_POPULARITY_SCORE_SQL}
                        ) AS fit_score
                 FROM songs s
                 WHERE NOT EXISTS (
                     SELECT 1 FROM playlist_songs ps3 WHERE ps3.playlistId = ? AND ps3.songId = s.song_id
                 )
                 ${userId ? `AND NOT EXISTS (SELECT 1 FROM favorites fv WHERE fv.userId = ? AND fv.songId = s.song_id)` : ''}
                 ORDER BY fit_score DESC
                 LIMIT 8`,
                userId ? [playlistId, playlistId, playlistId, userId] : [playlistId, playlistId, playlistId]
            );
            res.status(200).json(parseSongRows(rows));
        } catch (error) {
            console.error('Lỗi getPlaylistSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý playlist' });
        }
    },

    // Gợi ý cho Queue Panel — kết hợp 4 nguồn, luôn trả về ~20 bài
    getQueueSuggestions: async (req, res) => {
        const songId = Number(req.params.songId);
        const userId = Number(req.query.userId) || null;
        const excludeRaw = String(req.query.exclude || '');
        const extraExclude = excludeRaw
            .split(',')
            .map(Number)
            .filter((n) => Number.isFinite(n) && n > 0);

        if (!Number.isFinite(songId) || songId <= 0) {
            return res.status(400).json({ message: 'songId không hợp lệ' });
        }

        // Always include current song so it's never recommended
        const baseExclude = [songId, ...extraExclude];

        const baseSelect = `
            SELECT s.*, ${ARTIST_NAME_SQL} AS artist, ${ARTIST_JSON_SQL} AS artists_json,
                   ${HASHTAG_JSON_SQL} AS hashtags_json`;

        try {
            // 5 nguồn chạy song song, mỗi nguồn có quota riêng
            const [
                [collabRows],
                [hashtagRows],
                [artistRows],
                [likedRows],
                [playedRows],
            ] = await Promise.all([
                // 1. Co-listen — 6 bài
                db.query(
                    `${baseSelect}, COUNT(ue2.event_id) AS _score
                     FROM user_events ue1
                     INNER JOIN user_events ue2 ON ue2.user_id = ue1.user_id
                         AND ue2.song_id != ? AND ue2.event_type = 'play'
                     INNER JOIN songs s ON s.song_id = ue2.song_id
                     WHERE ue1.song_id = ? AND ue1.event_type = 'play'
                       AND s.status != 'inactive' AND s.song_id NOT IN (?)
                     GROUP BY s.song_id
                     ORDER BY _score DESC, ${SONG_POPULARITY_SCORE_SQL} DESC
                     LIMIT 6`,
                    [songId, songId, baseExclude],
                ),
                // 2. Hashtag overlap — 6 bài
                db.query(
                    `${baseSelect}, COUNT(sh2.hashtagId) AS _score
                     FROM song_hashtag sh1
                     INNER JOIN song_hashtag sh2 ON sh2.hashtagId = sh1.hashtagId AND sh2.songId != ?
                     INNER JOIN songs s ON s.song_id = sh2.songId
                     WHERE sh1.songId = ?
                       AND s.status != 'inactive' AND s.song_id NOT IN (?)
                     GROUP BY s.song_id
                     ORDER BY _score DESC, ${SONG_POPULARITY_SCORE_SQL} DESC
                     LIMIT 6`,
                    [songId, songId, baseExclude],
                ),
                // 3. Cùng ca sĩ — 4 bài
                db.query(
                    `${baseSelect}
                     FROM songs s
                     INNER JOIN song_artists sa ON sa.song_id = s.song_id
                     WHERE sa.artist_id IN (
                         SELECT artist_id FROM song_artists WHERE song_id = ?
                     )
                     AND s.status != 'inactive' AND s.song_id NOT IN (?)
                     ORDER BY ${SONG_POPULARITY_SCORE_SQL} DESC
                     LIMIT 4`,
                    [songId, baseExclude],
                ),
                // 4. Top yêu thích — 8 bài (luôn chạy)
                db.query(
                    `${baseSelect}
                     FROM songs s
                     WHERE s.status != 'inactive' AND s.song_id NOT IN (?)
                     ORDER BY COALESCE(s.like_count, 0) DESC, COALESCE(s.play_count, 0) DESC
                     LIMIT 8`,
                    [baseExclude],
                ),
                // 5. Top nghe nhiều — 8 bài (luôn chạy)
                db.query(
                    `${baseSelect}
                     FROM songs s
                     WHERE s.status != 'inactive' AND s.song_id NOT IN (?)
                     ORDER BY COALESCE(s.play_count, 0) DESC, COALESCE(s.like_count, 0) DESC
                     LIMIT 8`,
                    [baseExclude],
                ),
            ]);

            // Merge theo thứ tự ưu tiên: collab > hashtag > artist > liked > played
            const seen = new Set(baseExclude);
            const combined = [];
            for (const row of [...collabRows, ...hashtagRows, ...artistRows, ...likedRows, ...playedRows]) {
                if (combined.length >= 20) break;
                const id = Number(row.song_id);
                if (!seen.has(id)) { seen.add(id); combined.push(row); }
            }

            res.status(200).json(parseSongRows(combined));
        } catch (error) {
            console.error('Lỗi getQueueSuggestions:', error);
            res.status(500).json({ message: 'Lỗi server khi lấy gợi ý queue' });
        }
    },

    getHome: async (req, res) => { res.status(200).json({ message: 'Home logic' }); },
    getDistributions: async (req, res) => { res.status(200).json({ message: 'Distributions' }); },
    submitDistribution: async (req, res) => { res.status(201).json({ message: 'Submitted' }); },

    // Ghi nhận lượt nghe — frontend gọi sau khi user nghe đủ ngưỡng (30s hoặc 50% bài)
    recordPlay: async (req, res) => {
        const songId = Number(req.params.songId);
        const userId = Number(req.body.userId) || null;
        const listenedSeconds = Number(req.body.listenedSeconds) || 0;
        // source_type: trang user đang nghe ('home','trending','favorites','artist','playlist','detail')
        const sourceType = typeof req.body.sourceType === 'string' ? req.body.sourceType.slice(0, 50) : null;

        if (!Number.isFinite(songId) || songId <= 0) {
            return res.status(400).json({ message: 'songId không hợp lệ' });
        }

        try {
            // 1. Ghi sự kiện nghe vào user_events (dùng cho trending cron + gợi ý cá nhân)
            await db.query(
                `INSERT INTO user_events (user_id, song_id, event_type, listened_seconds, source_type)
                 VALUES (?, ?, 'play', ?, ?)`,
                [userId, songId, listenedSeconds, sourceType]
            );

            // 2. Tăng play_count trực tiếp trên songs (dùng để hiển thị nhanh, k cần đợi cron)
            await db.query(
                'UPDATE songs SET play_count = play_count + 1 WHERE song_id = ?',
                [songId]
            );

            res.json({ success: true });
        } catch (error) {
            console.error('Lỗi recordPlay:', error);
            res.status(500).json({ message: 'Lỗi server khi ghi lượt nghe' });
        }
    },
};

module.exports = musicController;
