import { useState } from 'react';
import { TrendingUp, Heart, Eye, Music, BarChart3, Users, Clock } from 'lucide-react';
// 1. Xóa dòng import mockSongs và Song cũ
import { useAuth } from '../../context/AuthContext';

// 2. Tự định nghĩa Interface Song để không bị lỗi "Song is not defined"
interface Song {
  id: string;
  title: string;
  artistId: string;
  album: string;
  genre: string;
  coverUrl: string;
  views: number;
  likes: number;
  duration: number;
  hashtags: string[];
}

export default function ContentStudio() {
  const { user } = useAuth();

  // 3. Khởi tạo state bằng mảng rỗng thay vì dùng mockSongs.filter
  const [songs, setSongs] = useState<Song[]>([]); 
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Tính toán các thông số (Sẽ tự nhảy khi songs có dữ liệu từ API)
  const totalViews = songs.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = songs.reduce((sum, s) => sum + s.likes, 0);
  const avgEngagement = songs.length > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';

  // Dữ liệu mẫu về hoạt động và nhân khẩu học (Hiền có thể giữ lại để UI đẹp)
  const recentActivity = [
    { action: 'Nghe bài hát', song: 'Lạc Trôi', count: 1250, time: '2 giờ trước' },
    { action: 'Thích', song: 'Nơi Này Có Anh', count: 345, time: '3 giờ trước' },
  ];

  const demographics = [
    { age: '18-24', percentage: 45 },
    { age: '25-34', percentage: 25 },
    { age: 'Khác', percentage: 30 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Content Studio</h1>
          <p className="text-gray-400">Chào mừng {user?.name}, quản lý nội dung của bạn tại đây.</p>
        </div>

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8" />
              <span className="text-3xl font-bold">{totalViews.toLocaleString()}</span>
            </div>
            <p className="text-blue-200">Tổng Lượt Nghe</p>
          </div>
          {/* ... Các card Heart, TrendingUp, Music tương tự ... */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white/5 p-6 rounded-lg border border-white/10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              Hiệu Suất Theo Bài Hát
            </h2>

            {/* Hiển thị bài hát đã chọn hoặc thông báo nếu trống */}
            {selectedSong ? (
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                 {/* ... Nội dung chi tiết bài hát ... */}
              </div>
            ) : (
              <div className="text-center py-10 bg-white/5 rounded-lg mb-6 text-gray-400">
                {songs.length === 0 ? "Bạn chưa có dữ liệu bài hát thật." : "Chọn một bài hát để xem chi tiết."}
              </div>
            )}

            {/* Danh sách bài hát */}
            <div className="space-y-2">
              {songs.length > 0 ? (
                songs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => setSelectedSong(song)}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all ${
                      selectedSong?.id === song.id ? 'bg-purple-600/30 border border-purple-500' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <img src={song.coverUrl} alt={song.title} className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1 text-left">
                      <h4 className="font-medium">{song.title}</h4>
                      <p className="text-sm text-gray-400">{song.genre}</p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500">Chưa có danh sách bài hát.</p>
              )}
            </div>
          </div>

          {/* Cột bên phải: Hoạt động và Nhân khẩu học */}
          <div className="space-y-6">
             {/* ... Giữ nguyên phần UI Hoạt động & Nhân khẩu học của Hiền ... */}
          </div>
        </div>
      </div>
    </div>
  );
}