import { useState } from 'react';
import { Users, Music, TrendingUp, DollarSign, CheckCircle, XCircle, UserCheck } from 'lucide-react';

// 1. Định nghĩa các kiểu dữ liệu (Interfaces) ngay tại đây
interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  genre: string;
  views: number;
  likes: number;
  approved: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'artist' | 'advertiser' | 'distributor' | 'listener';
}

interface Ad {
  id: string;
  title: string;
  content: string;
  status: 'active' | 'paused' | 'completed';
  budget: number;
  interactions: number;
  targetAge: string;
  targetGenres: string[];
}

// 2. Tạo dữ liệu mẫu nội bộ (Thay thế cho mockData cũ)
const internalMockUsers: User[] = [
  { id: '1', name: 'Thanh Hiền', email: 'hien@example.com', role: 'admin' },
  { id: '2', name: 'Nghệ Sĩ A', email: 'artist@example.com', role: 'artist' },
];

const internalMockSongs: Song[] = [
  { id: '1', title: 'Bài hát mẫu', artist: 'Nghệ sĩ A', coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100', genre: 'Pop', views: 1200, likes: 300, approved: false },
];

const internalMockAds: Ad[] = [
  { id: '1', title: 'Quảng cáo tháng 4', content: 'Giảm giá gói Premium', status: 'active', budget: 500000, interactions: 150, targetAge: '18-25', targetGenres: ['Pop', 'R&B'] }
];

export default function AdminDashboard() {
  // 3. Sử dụng dữ liệu nội bộ vừa tạo
  const [songs, setSongs] = useState<Song[]>(internalMockSongs);
  const [users] = useState<User[]>(internalMockUsers);
  const [ads] = useState<Ad[]>(internalMockAds);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'songs' | 'ads'>('overview');

  const handleApproveSong = (songId: string) => {
    setSongs(songs.map(s => s.id === songId ? { ...s, approved: true } : s));
  };

  const handleRejectSong = (songId: string) => {
    setSongs(songs.map(s => s.id === songId ? { ...s, approved: false } : s));
  };

  const stats = {
    totalUsers: users.length,
    totalSongs: songs.length,
    totalViews: songs.reduce((sum, s) => sum + s.views, 0),
    totalLikes: songs.reduce((sum, s) => sum + s.likes, 0),
    pendingSongs: songs.filter(s => !s.approved).length,
    activeAds: ads.filter(a => a.status === 'active').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white p-6">
      <div className="max-w-screen-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 italic">Admin Control Panel</h1>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-3xl font-bold">{stats.totalUsers}</span>
            </div>
            <p className="text-gray-400 text-sm">Người dùng hệ thống</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Music className="w-8 h-8 text-blue-400" />
              <span className="text-3xl font-bold">{stats.totalSongs}</span>
            </div>
            <p className="text-gray-400 text-sm">Bài hát đã đăng tải</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</span>
            </div>
            <p className="text-gray-400 text-sm">Tổng lượt nghe</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-yellow-400" />
              <span className="text-3xl font-bold">{stats.activeAds}</span>
            </div>
            <p className="text-gray-400 text-sm">Chiến dịch quảng cáo</p>
          </div>
        </div>

        {/* Thanh điều hướng Tab */}
        <div className="mb-6 flex gap-2 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
          {(['overview', 'users', 'songs', 'ads'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTab === tab ? 'bg-purple-600 shadow-lg' : 'hover:bg-white/5'
              }`}
            >
              {tab === 'overview' && 'Tổng Quan'}
              {tab === 'users' && 'Người Dùng'}
              {tab === 'songs' && 'Kiểm Duyệt'}
              {tab === 'ads' && 'Quảng Cáo'}
            </button>
          ))}
        </div>

        {/* Nội dung Tab: Kiểm duyệt (Phần quan trọng nhất của Admin) */}
        {selectedTab === 'songs' && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-6">Danh sách chờ duyệt</h2>
            <div className="grid gap-4">
              {songs.length > 0 ? songs.map(song => (
                <div key={song.id} className="flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
                  <img src={song.coverUrl} className="w-16 h-16 rounded-lg object-cover" alt="" />
                  <div className="flex-1">
                    <h3 className="font-bold">{song.title}</h3>
                    <p className="text-xs text-gray-500">{song.artist} • {song.genre}</p>
                  </div>
                  <div className="flex gap-2">
                    {!song.approved ? (
                      <button 
                        onClick={() => handleApproveSong(song.id)}
                        className="bg-green-600/20 text-green-400 p-2 rounded-lg hover:bg-green-600 hover:text-white transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    ) : (
                       <span className="text-green-500 text-xs font-bold px-3 py-1 bg-green-500/10 rounded-full">ĐÃ DUYỆT</span>
                    )}
                    <button 
                      onClick={() => handleRejectSong(song.id)}
                      className="bg-red-600/20 text-red-400 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )) : <p className="text-gray-500">Không có bài hát nào.</p>}
            </div>
          </div>
        )}

        {/* Các Tab khác Hiền có thể hiển thị tương tự dựa trên biến 'ads' và 'users' */}
        {selectedTab === 'overview' && (
            <div className="p-10 border border-dashed border-white/20 rounded-xl text-center text-gray-500">
                Giao diện tổng quan đang tải dữ liệu...
            </div>
        )}
      </div>
    </div>
  );
}