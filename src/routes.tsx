import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import ListenerHome from './pages/listener/ListenerHome';
import ListenerPlaylists from './pages/listener/ListenerPlaylists';
import AdminDashboard from './pages/admin/AdminDashboard';
import SystemLogs from './pages/admin/SystemLogs';
import ArtistDashboard from './pages/artist/ArtistDashboard';
import ContentStudio from './pages/artist/ContentStudio';
import DistributionPage from './pages/artist/DistributionPage';
import { useAuth } from './context/AuthContext';
// 1. THÊM IMPORT NÀY
import { BehaviorProvider } from './context/BehaviorContext'; 

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleBasedHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  // Khớp với giá trị USER viết hoa trong DB của Hiền
  if (user.role === 'USER') {
    if (!user.favoriteGenres || user.favoriteGenres.length === 0) {
       return <Navigate to="/onboarding" replace />;
    }
    return <ListenerHome />;
  }

  switch (user.role) {
    case 'ADMIN': return <AdminDashboard />;
    case 'ARTIST': return <ArtistDashboard />;
    default: return <Navigate to="/login" replace />;
  }
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/onboarding', element: <Onboarding /> },
  {
    element: (
      /* 2. BỌC BEHAVIORPROVIDER TẠI ĐÂY */
      <BehaviorProvider>
        <Layout />
      </BehaviorProvider>
    ),
    children: [
      { path: '/', element: <RoleBasedHome /> },
      { path: '/settings', element: <Settings /> },
      {
        path: '/playlists',
        element: <ProtectedRoute allowedRoles={['USER']}><ListenerPlaylists /></ProtectedRoute>
      },
      {
        path: '/admin/logs',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><SystemLogs /></ProtectedRoute>
      },
      {
        path: '/artist/studio',
        element: <ProtectedRoute allowedRoles={['ARTIST']}><ContentStudio /></ProtectedRoute>
      },
      {
        path: '/artist/distributions',
        element: <ProtectedRoute allowedRoles={['ARTIST']}><DistributionPage /></ProtectedRoute>
      }
    ]
  }
]);