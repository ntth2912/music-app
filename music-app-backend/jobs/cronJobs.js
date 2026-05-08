const cron = require('node-cron');
const db = require('../config/db');
const { getCollaborativeRecommendations } = require('../services/recommendation');

// Chạy vào phút thứ 0 của mỗi giờ
cron.schedule('0 * * * *', async () => {
    console.log('--- [BATCH JOB] Đang cập nhật Top Charts ---');
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Xóa dữ liệu cũ trong bảng top_charts
        await conn.query('DELETE FROM top_charts');

        // 2. Chạy SQL Weighted Scoring (khớp với logic "anh trưởng" đã duyệt)
        // Play score: tối đa 1 điểm/lượt, scale theo listened_seconds (ngưỡng 30s = đủ điểm)
        // Decay theo thời gian: sự kiện trong 7 ngày gần nhất được tính, xa hơn giảm dần
        const [trending] = await conn.query(`
            SELECT song_id,
            SUM(CASE
               WHEN event_type = 'play' THEN
                   LEAST(COALESCE(listened_seconds, 30) / 30.0, 1.0)
                   * EXP(-0.05 * GREATEST(TIMESTAMPDIFF(HOUR, created_at, NOW()), 0) / 24.0)
               WHEN event_type = 'like'  THEN 3
               WHEN event_type = 'saved' THEN 2
               WHEN event_type = 'skip'  THEN -2
               ELSE 0 END) AS calculated_score
            FROM user_events
            WHERE created_at >= NOW() - INTERVAL 30 DAY
            GROUP BY song_id
            HAVING calculated_score > 0
            ORDER BY calculated_score DESC
            LIMIT 50
        `);

        // 3. Nạp vào bảng top_charts (Lưu ý: songs có 2 dấu gạch dưới)
        for (let i = 0; i < trending.length; i++) {
            await conn.query(
                'INSERT INTO top_charts (song_id, rank_position, popularity_score) VALUES (?, ?, ?)',
                [trending[i].song_id, i + 1, trending[i].calculated_score ]
            );
        }

        await conn.commit();
        console.log('--- [SUCCESS] Đã cập nhật xong 50 bài hát Trending ---');
    } catch (error) {
        await conn.rollback();
        console.error('[ERROR] Batch Job Trending lỗi:', error);
    } finally {
        conn.release();
    }
});
cron.schedule('0 0 * * *', async () => {
    const conn = await db.getConnection();
    try {
        const [users] = await conn.query('SELECT id FROM user_profile');
        for (let user of users) {
            // Lấy kết quả từ hàm CF đã viết ở trên
            const recommendations = await getCollaborativeRecommendations(user.id);
            
            // Xóa gợi ý cũ của User này
            await conn.query('DELETE FROM recommendations WHERE user_id = ?', [user.id]);

            // Lưu 10 gợi ý mới vào bảng recommendations
            for (let rec of recommendations) {
                await conn.query(
                    'INSERT INTO recommendations (user_id, song_id, score) VALUES (?, ?, ?)',
                    [user.id, rec.id, rec.final_score || 0]
                );
            }
        }
    } finally {
        conn.release();
    }
});


