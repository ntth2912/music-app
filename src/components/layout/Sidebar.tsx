import { Link, useLocation } from 'react-router-dom';
import { Home, Music, LogOut, Compass, Heart, ListMusic, Sparkles, Upload, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlaylist } from '../../context/PlaylistContext';
import { useBehavior } from '../../context/BehaviorContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { playlists, loading: plLoading } = usePlaylist();
  const { getRecommendedSongs } = useBehavior();
  const location = useLocation();

  const recommendedIds = getRecommendedSongs();

  const menuItems = [
    { path: '/listener-home', icon: Home,      label: 'Trang Chủ' },
    { path: '/trending',      icon: Compass,   label: 'Khám Phá' },
    { path: '/artists',       icon: Users,     label: 'Ca Sĩ' },
    { path: '/favorites',     icon: Heart,     label: 'Yêu Thích' },
    { path: '/playlists',     icon: Music,     label: 'Playlist' },
  ];

  const isActive = (path: string) => {
    if (path === '/playlists') return location.pathname.startsWith('/playlists');
    if (path === '/artists') return location.pathname === '/artists';
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-zinc-950 h-screen flex flex-col border-r border-white/10 shrink-0">
      <div className="p-6 flex flex-col h-full overflow-y-auto">

        <div className="text-purple-500 mb-10 px-2 font-black text-xl">FINTECH MUSIC</div>

        <nav className="space-y-1 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                isActive(item.path)
                  ? 'text-white bg-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Playlist library */}
        <div className="flex-1 min-h-0">
          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase mb-3">Thư viện của bạn</p>

          <div className="space-y-0.5 overflow-y-auto max-h-52">
            {plLoading ? (
              <p className="px-4 text-xs text-gray-600 py-2">Đang tải...</p>
            ) : playlists.length === 0 ? (
              <p className="px-4 text-[11px] text-gray-600 italic">Chưa có playlist nào</p>
            ) : (
              playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                    location.pathname === `/playlists/${pl.id}`
                      ? 'text-white bg-purple-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ListMusic className="w-4 h-4 shrink-0" />
                  <span className="truncate text-sm">{pl.name}</span>
                </Link>
              ))
            )}
          </div>

          {/* AI recommendations badge */}
          {recommendedIds.length > 0 && (
            <div className="mt-3 mx-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Gợi ý cho Hiền</span>
              </div>
              <p className="text-[10px] text-gray-400">{recommendedIds.length} bài hát bạn hay nghe</p>
            </div>
          )}
        </div>

        <Link
          to="/upload"
          className="flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-purple-400 transition-colors rounded-xl mt-2"
        >
          <Upload className="w-5 h-5" />
          <span className="text-sm">Upload Nhạc</span>
        </Link>

        <button
          onClick={() => logout?.()}
          className="flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-red-400 transition-colors rounded-xl mt-1"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </div>
  );
}
