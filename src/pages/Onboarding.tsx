import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Music, Heart, User } from 'lucide-react';

// 1. Thay vì import từ mockData, ta khai báo trực tiếp ở đây 
// để giải quyết vấn đề "Cold Start" như Hiền mong muốn.
const internalGenres = ['Pop', 'Rock', 'R&B', 'EDM', 'Ballad', 'Jazz', 'HipHop', 'Country'];

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const artists = [
    { id: '3', name: 'Sơn Tùng MTP' },
    { id: 'a1', name: 'BLACKPINK' },
    { id: 'a2', name: 'BTS' },
    { id: 'a3', name: 'Taylor Swift' },
    { id: 'a4', name: 'Ed Sheeran' },
    { id: 'a5', name: 'The Weeknd' },
    { id: 'a6', name: 'Ariana Grande' },
    { id: 'a7', name: 'Billie Eilish' },
  ];

  const handleToggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleToggleArtist = (artistId: string) => {
    setSelectedArtists(prev =>
      prev.includes(artistId) ? prev.filter(a => a !== artistId) : [...prev, artistId]
    );
  };

  const handleComplete = () => {
    // Lưu sở thích vào Context (và sau đó đồng bộ với SQL Server qua Backend)
    updateUser({
      favoriteGenres: selectedGenres,
      favoriteArtists: selectedArtists
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <Music className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h1 className="text-4xl font-bold mb-2">Chào mừng đến với Music Platform!</h1>
          <p className="text-gray-400">Hãy cho chúng tôi biết sở thích của bạn để nhận được gợi ý tốt nhất</p>
        </div>

        {/* Stepper Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-600' : 'bg-gray-700'}`}>
              <User className="w-6 h-6" />
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-700'}`} />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-600' : 'bg-gray-700'}`}>
              <Music className="w-6 h-6" />
            </div>
            <div className={`w-24 h-1 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-700'}`} />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-purple-600' : 'bg-gray-700'}`}>
              <Heart className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Step 1: Giới thiệu về Cold Start */}
        {step === 1 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-2">Xin chào, {user?.name || 'Thanh Hiền'}!</h2>
            <p className="text-gray-300 mb-6">Chúng tôi cần thông tin để cá nhân hóa trải nghiệm của bạn và giải quyết vấn đề dữ liệu trống ban đầu.</p>
            <button onClick={() => setStep(2)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-all">
              Bắt Đầu
            </button>
          </div>
        )}

        {/* Step 2: Chọn Thể loại */}
        {step === 2 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-2">Thể loại nhạc yêu thích</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {internalGenres.map(genre => (
                <button
                  key={genre}
                  onClick={() => handleToggleGenre(genre)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedGenres.includes(genre) ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/20'
                  }`}
                >
                  <p className="font-medium">{genre}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-700 rounded-lg">Quay Lại</button>
              <button 
                onClick={() => setStep(3)} 
                disabled={selectedGenres.length < 3}
                className={`flex-1 py-3 rounded-lg font-medium ${selectedGenres.length >= 3 ? 'bg-purple-600' : 'bg-gray-800 opacity-50'}`}
              >
                Tiếp Theo ({selectedGenres.length}/3)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Chọn Nghệ sĩ */}
        {step === 3 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-2">Nghệ sĩ yêu thích</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {artists.map(artist => (
                <button
                  key={artist.id}
                  onClick={() => handleToggleArtist(artist.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedArtists.includes(artist.id) ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/20'
                  }`}
                >
                  <p className="font-medium text-sm">{artist.name}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-700 rounded-lg">Quay Lại</button>
              <button 
                onClick={handleComplete}
                disabled={selectedArtists.length < 2}
                className={`flex-1 py-3 rounded-lg font-medium ${selectedArtists.length >= 2 ? 'bg-green-600' : 'bg-gray-800 opacity-50'}`}
              >
                Hoàn Thành ({selectedArtists.length}/2)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}