// QUAN TRỌNG: Sửa từ 'react-router' thành 'react-router-dom'
import { Outlet, Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import { 
  Music, Home, List, Heart, LogOut, LayoutDashboard, 
  Settings as SettingsIcon, Activity, BarChart3 
} from 'lucide-react';

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Tránh lỗi khi đang load dữ liệu hoặc chưa có user
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Đang tải...</div>;
  }

  if (!user) {
    return <Outlet />;
  }

  const getNavLinks = () => {
    switch (user.role) {
      case 'listener':
        return [
          { path: '/', icon: Home, label: 'Trang Chủ' },
          { path: '/playlists', icon: List, label: 'Playlist' },
          { path: '/favorites', icon: Heart, label: 'Yêu Thích' },
          { path: '/settings', icon: SettingsIcon, label: 'Cài Đặt' },
        ];
      case 'admin':
        return [
          { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/logs', icon: Activity, label: 'System Logs' },
          { path: '/music', icon: Music, label: 'Nghe Nhạc' },
          { path: '/settings', icon: SettingsIcon, label: 'Cài Đặt' },
        ];
      case 'artist':
        return [
          { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/artist/studio', icon: BarChart3, label: 'Content Studio' },
          { path: '/music', icon: Music, label: 'Nghe Nhạc' },
          { path: '/settings', icon: SettingsIcon, label: 'Cài Đặt' },
        ];
      default:
        return [{ path: '/', icon: Home, label: 'Trang Chủ' }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-black border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Music App</h1>
              <p className="text-xs text-gray-400">{user.name}</p>
            </div>
          </div>
          <div className="mt-3 px-3 py-1.5 bg-purple-600/20 rounded-full text-xs text-purple-300 text-center capitalize">
            {user.role}
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all group"
              >
                <link.icon className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:text-white hover:bg-red-600/20 rounded-lg transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}