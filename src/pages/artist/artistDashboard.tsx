import { useState } from 'react';
import { Upload, Heart, Eye, Music } from 'lucide-react';
// 1. XÓA dòng import mockSongs cũ
import { useAuth } from '../../context/AuthContext';

// 2. Định nghĩa lại Interface Song ngay tại đây
interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  duration: number;
  genre: string;
  coverUrl: string;
  audioUrl: string;
  likes: number;
  views: number;
  uploadDate: string;
  approved: boolean;
  hashtags: string[];
}

export default function ArtistDashboard() {
  const { user } = useAuth();
  
  // 3. Khởi tạo mảng rỗng thay vì filter từ mockData
  const [songs, setSongs] = useState<Song[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newSong, setNewSong] = useState({
    title: '',
    album: '',
    genre: '',
    duration: 0,
    hashtags: ''
  });

  const totalViews = songs.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = songs.reduce((sum, s) => sum + s.likes, 0);
  const approvedSongs = songs.filter(s => s.approved).length;

  const handleUploadSong = () => {
    if (newSong.title && newSong.genre) {
      const song: Song = {
        id: Date.now().toString(),
        title: newSong.title,
        artist: user?.name || '',
        artistId: user?.user_id?.toString() || '',
        album: newSong.album,
        duration: newSong.duration || 180,
        genre: newSong.genre,
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
        audioUrl: '',
        likes: 0,
        views: 0,
        uploadDate: new Date().toISOString(),
        approved: false, // Mặc định là chờ duyệt
        hashtags: newSong.hashtags.split(',').map(h => h.trim()).filter(Boolean)
      };

      setSongs([song, ...songs]);
      setNewSong({ title: '', album: '', genre: '', duration: 0, hashtags: '' });
      setIsUploading(false);
      
      // Thông báo cho Hiền biết bài hát đã được thêm vào State
      alert("Bài hát đã được gửi đi và đang chờ duyệt!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Artist Dashboard</h1>
            <p className="text-gray-400 mt-2">Chào mừng nghệ sĩ {user?.name}!</p>
          </div>
          <button
            onClick={() => setIsUploading(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <Upload className="w-5 h-5" />
            Upload Bài Hát Mới
          </button>
        </div>

        {/* Các Card thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{totalViews.toLocaleString()}</span>
            </div>
            <p className="text-blue-100 uppercase text-xs font-bold tracking-wider">Tổng Lượt Nghe</p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{totalLikes.toLocaleString()}</span>
            </div>
            <p className="text-red-100 uppercase text-xs font-bold tracking-wider">Lượt Yêu Thích</p>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Music className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{approvedSongs}/{songs.length}</span>
            </div>
            <p className="text-green-100 uppercase text-xs font-bold tracking-wider">Bài Hát Đã Duyệt</p>
          </div>
        </div>

        {/* Form Upload */}
        {isUploading && (
          <div className="mb-6 p-6 bg-white/10 rounded-lg border border-white/20 backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-4">Upload Bài Hát Mới</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-300">Tên Bài Hát</label>
                <input
                  type="text"
                  value={newSong.title}
                  onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Nhập tên bài hát..."
                />
              </div>
              {/* ... (Các input khác của Hiền giữ nguyên) ... */}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleUploadSong} className="flex-1 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all font-bold">Lưu Bài Hát</button>
              <button onClick={() => setIsUploading(false)} className="flex-1 px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all">Đóng</button>
            </div>
          </div>
        )}

        {/* Danh sách bài hát */}
        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
          <h2 className="text-2xl font-bold mb-4">Danh Sách Tác Phẩm</h2>
          <div className="space-y-3">
            {songs.length > 0 ? (
              songs.map(song => (
                <div key={song.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all">
                  <img src={song.coverUrl} alt={song.title} className="w-16 h-16 rounded object-cover shadow-md" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{song.title}</h3>
                    <p className="text-sm text-gray-400">{song.album || 'Single'} • {song.genre}</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-blue-400 justify-center">
                        <Eye className="w-4 h-4" />
                        <span className="font-bold">{song.views}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Lượt nghe</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1 rounded-full text-xs font-bold ${song.approved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {song.approved ? 'ĐÃ DUYỆT' : 'CHỜ DUYỆT'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <Music className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 italic">Bạn chưa đăng tải bài hát nào.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}