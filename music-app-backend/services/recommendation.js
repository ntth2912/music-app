const db = require('../config/db');

/**
 * 0. Lấy toàn bộ danh sách bài hát (Bổ sung để khớp với Controller)
 * Lấy các bài hát hợp lệ để hiển thị trên ListenerHome
 */
async function getAllSongsFromDB() {
    try {
        const sql = `
            SELECT 
                s.song_id AS id, 
                IFNULL(s.title, 'Không tiêu đề') AS title, -- Xử lý null ngay tại SQL
                IFNULL(art.artist_name, 'Chưa xác định') AS artist,
                s.album_id AS albumId,
                'https://picsum.photos/200' AS coverUrl,
                'V-Pop' AS genre,
                0 AS views,
                1 AS approved
            FROM songs s
            LEFT JOIN album_artists aa ON s.album_id = aa.album_id
            LEFT JOIN artists art ON aa.artist_id = art.artist_id
            WHERE s.title IS NOT NULL -- Hoặc lọc bỏ những bài không có tiêu đề
            LIMIT 50`;
        const [rows] = await db.query(sql);
        return rows;
    } catch (error) {
        console.error("Lỗi tại getAllSongsFromDB:", error);
        throw error;
    }
}

/**
 * 1. Popularity-Based (Trending)
 * Tính điểm dựa trên preference_score trung bình từ bảng user_event_stats
 */
async function getTrendingRecommendations() {
    const sql = `
        SELECT s.song_id AS id, s.title, art.artist_name AS artistName,
                AVG(ues.preference_score) AS calculated_score
        FROM songs s
        JOIN user_event_stats ues ON s.song_id = ues.subject_id
        LEFT JOIN album_artists aa ON s.album_id = aa.album_id
        LEFT JOIN artists art ON aa.artist_id = art.artist_id
        WHERE ues.subject_type = 'SONG'
        GROUP BY s.song_id
        ORDER BY calculated_score DESC
        LIMIT 15`;
    
    const [rows] = await db.query(sql);
    return rows;
}

/**
 * 2. Content-Based (Gợi ý nhạc cùng ca sĩ)
 */
async function getContentBasedRecommendations(currentSongId, userId) {
    const sql = `
        SELECT s.song_id AS id, s.title, art.artist_name AS artistName,
        (CASE WHEN art.artist_id = (
            SELECT aa2.artist_id FROM album_artists aa2 
            JOIN songs s2 ON aa2.album_id = s2.album_id 
            WHERE s2.song_id = ? LIMIT 1
        ) THEN 5 ELSE 0 END) AS similarity_score
        FROM songs s
        JOIN album_artists aa ON s.album_id = aa.album_id
        JOIN artists art ON aa.artist_id = art.artist_id
        WHERE s.song_id <> ? 
        AND s.song_id NOT IN (SELECT DISTINCT song_id FROM user_events WHERE user_id = ?)
        GROUP BY s.song_id
        HAVING similarity_score > 0
        ORDER BY similarity_score DESC
        LIMIT 10`;
    const [rows] = await db.query(sql, [currentSongId, currentSongId, userId]);
    return rows;
}

/**
 * 3. Collaborative Filtering (Người dùng cùng gu)
 */
async function getCollaborativeRecommendations(userId) {
    const sql = `
        WITH SimilarUsers AS (
            SELECT u2.user_id, SUM(u1.preference_score * u2.preference_score) as similarity_weight
            FROM user_event_stats u1
            JOIN user_event_stats u2 ON u1.subject_id = u2.subject_id
            WHERE u1.user_id = ? AND u2.user_id <> ? 
            AND u1.subject_type = 'SONG' AND u2.subject_type = 'SONG'
            GROUP BY u2.user_id ORDER BY similarity_weight DESC LIMIT 5
        )
        SELECT s.song_id AS id, s.title, art.artist_name AS artistName, SUM(su.similarity_weight) as final_score
        FROM user_event_stats ues
        JOIN SimilarUsers su ON ues.user_id = su.user_id
        JOIN songs s ON ues.subject_id = s.song_id
        JOIN album_artists aa ON s.album_id = aa.album_id
        JOIN artists art ON aa.artist_id = art.artist_id
        WHERE ues.subject_type = 'SONG'
        AND s.song_id NOT IN (SELECT song_id FROM user_events WHERE user_id = ?)
        GROUP BY s.song_id
        ORDER BY final_score DESC LIMIT 10`;
    const [rows] = await db.query(sql, [userId, userId, userId]);
    return rows;
}

/**
 * 4. Context-Aware (Gợi ý ngẫu nhiên)
 */
async function getContextRecommendedSongs(userId, deviceType) {
    const sql = `
        SELECT s.song_id AS id, s.title, art.artist_name AS artistName
        FROM songs s
        JOIN album_artists aa ON s.album_id = aa.album_id
        JOIN artists art ON aa.artist_id = art.artist_id
        ORDER BY RAND()
        LIMIT 5`;
    const [rows] = await db.query(sql);
    return rows;
}

/**
 * 5. Home Feed (Hybrid Logic)
 */
async function getHomeFeed(userId, deviceType) {
    try {
        const [stats] = await db.query(
            'SELECT COUNT(*) as count FROM user_event_stats WHERE user_id = ?', 
            [userId]
        );

        if (stats[0].count === 0) {
            const trending = await getTrendingRecommendations();
            const context = await getContextRecommendedSongs(userId, deviceType);
            return mergeAndUnique([...context, ...trending]);
        }

        const contextRecs = await getContextRecommendedSongs(userId, deviceType);
        const cfRecs = await getCollaborativeRecommendations(userId);
        let finalRecs = [...contextRecs, ...cfRecs];

        if (finalRecs.length < 10) {
            const trending = await getTrendingRecommendations();
            finalRecs = [...finalRecs, ...trending];
        }

        return mergeAndUnique(finalRecs);

    } catch (e) {
        console.error("Lỗi Hybrid Feed:", e);
        return await getTrendingRecommendations(); 
    }
}

function mergeAndUnique(songs) {
    const unique = [];
    const seen = new Set();
    for (const s of songs) {
        if (s && s.id && !seen.has(s.id)) {
            seen.add(s.id);
            unique.push(s);
        }
    }
    return unique.slice(0, 20);
}

/**
 * 6. Lấy danh sách yêu cầu phân phối bài hát của User
 */
async function getDistributionsByUserId(userId) {
    try {
        const sql = `
            SELECT 
                application_id AS id, 
                artist_name AS artistName, 
                status, 
                DATE_FORMAT(created_at, '%d/%m/%Y') AS submittedDate
            FROM ARTIST_APPLICATIONS 
            WHERE user_id = ? 
            ORDER BY created_at DESC`;

        const [rows] = await db.query(sql, [userId]);
        return rows;
    } catch (error) {
        console.error("Lỗi tại getDistributionsByUserId:", error);
        throw error;
    }
}

module.exports = {
    getAllSongsFromDB, // Đã thêm vào export
    getHomeFeed,
    getTrendingRecommendations,
    getCollaborativeRecommendations,
    getContentBasedRecommendations,
    getContextRecommendedSongs,
    getDistributionsByUserId
};