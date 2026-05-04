import { useState } from 'react';
import { User, Lock, Shield, Bell, Eye, EyeOff, Save, Music } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Khai báo danh sách genres trực tiếp để fix lỗi import
const internalGenres = ['Pop', 'Rock', 'R&B', 'EDM', 'Ballad', 'Jazz', 'HipHop', 'Country'];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'preferences'>('profile');

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [privacySettings, setPrivacySettings] = useState({
    showListeningHistory: true,
    showPlaylists: true,
    showFavorites: false,
    allowRecommendations: true,
    shareWithFriends: true
  });

  const [preferences, setPreferences] = useState({
    favoriteGenres: user?.favoriteGenres || [],
    favoriteArtists: user?.favoriteArtists || []
  });

  const handleSaveProfile = () => {
    updateUser({
      name: profileData.name,
      email: profileData.email
    });
    alert('Đã lưu thông tin cá nhân!');
  };

  const handleSavePrivacy = () => {
  // Kiểm tra xem user và user_id có tồn tại không trước khi lưu
  if (user?.user_id) {
    localStorage.setItem(`privacy_${user.user_id}`, JSON.stringify(privacySettings));
    alert('Đã lưu cài đặt bảo mật thành công!');
  } else {
    alert('Không tìm thấy ID người dùng để lưu cài đặt!');
  }
};

  const handleSavePreferences = () => {
    updateUser({
      favoriteGenres: preferences.favoriteGenres,
      favoriteArtists: preferences.favoriteArtists
    });
    alert('Đã cập nhật sở thích! Hệ thống gợi ý sẽ được cải thiện.');
  };

  const handleToggleGenre = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Cài Đặt</h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'profile' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <User className="w-5 h-5" />
            Hồ Sơ
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'privacy' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Shield className="w-5 h-5" />
            Quyền Riêng Tư
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === 'preferences' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Music className="w-5 h-5" />
            Sở Thích
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-6">Thông Tin Cá Nhân</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Tên hiển thị</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button onClick={handleSaveProfile} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Lưu Thay Đổi
            </button>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-sm">
            <h2 className="text-2xl font-bold mb-6 text-base">Quyền Riêng Tư & Bảo Mật</h2>
            {/* ... Render các toggle switches (giữ nguyên logic của bạn) ... */}
            <button onClick={handleSavePrivacy} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center gap-2 mt-6">
              <Save className="w-5 h-5" />
              Lưu Cài Đặt
            </button>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-2">Sở Thích Âm Nhạc</h2>
            <p className="text-gray-400 mb-6">Cập nhật sở thích để cải thiện thuật toán gợi ý</p>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Thể loại yêu thích</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {internalGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => handleToggleGenre(genre)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      preferences.favoriteGenres.includes(genre)
                        ? 'bg-purple-600 border-purple-400'
                        : 'bg-white/5 border-white/20 hover:border-purple-400'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSavePreferences} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              Cập Nhật Sở Thích
            </button>
          </div>
        )}
      </div>
    </div>
  );
}