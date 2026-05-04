import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/sonner';
import Sidebar from './components/layout/Sidebar';
import ListenerHome from './pages/listener/ListenerHome';
import ListenerPlaylists from './pages/listener/ListenerPlaylists';
import PlaylistDetail from './pages/listener/PlaylistDetail';
import DetailSong from './pages/listener/DetailSong';
import ArtistPage from './pages/listener/ArtistPage';
import UploadPage from './pages/admin/UploadPage';
import Login from './pages/Login';
import Trending from './pages/Trending';
import Favorites from './pages/Favorites';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BehaviorProvider } from './context/BehaviorContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { PlaybackProvider, usePlayback } from './context/PlaybackContext';
import MusicPlayer from './components/MusicPlayer';
import QueuePanel from './components/QueuePanel';

// ── Global player rendered at app level (persists across navigation) ──────────

function AppPlayer() {
  const { user } = useAuth();
  const {
    currentSong, playKey, handleNext, handlePrevious,
    toggleLike, likedSongs, queueOpen, setQueueOpen,
    queue, queueIndex, loopMode, cycleLoop, playIndexed,
  } = usePlayback();

  if (!currentSong) return null;

  return (
    <>
      <MusicPlayer
        currentSong={currentSong}
        playKey={playKey}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleLike={(id) => user && toggleLike(id, user.id)}
        isLiked={likedSongs.has(Number(currentSong.song_id))}
        onToggleQueue={() => setQueueOpen((o) => !o)}
        isQueueOpen={queueOpen}
      />
      {queueOpen && (
        <QueuePanel
          queue={queue}
          currentIndex={queueIndex}
          loopMode={loopMode}
          onCycleLoop={cycleLoop}
          onClose={() => setQueueOpen(false)}
          onPlayIndex={(idx) => playIndexed(queue, idx)}
        />
      )}
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-[100vh] pb-24">{children}</main>
      <AppPlayer />
    </div>
  );
}

const PlaceholderPage = ({ title }: { title: string }) => (
  <Layout>
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <h1 className="text-3xl font-bold text-purple-500 mb-2">{title}</h1>
      <p className="text-gray-400">Hệ thống đang xử lý dữ liệu...</p>
    </div>
  </Layout>
);

// ── Routes ────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { user } = useAuth();
  const auth = (el: React.ReactElement) =>
    user ? el : <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/listener-home" replace />} />

      <Route path="/listener-home"  element={auth(<Layout><ListenerHome /></Layout>)} />
      <Route path="/song/:songId"   element={auth(<Layout><DetailSong /></Layout>)} />
      <Route path="/trending"       element={auth(<Layout><Trending /></Layout>)} />
      <Route path="/artist/:id"     element={auth(<Layout><ArtistPage /></Layout>)} />
      <Route path="/favorites"      element={auth(<Layout><Favorites /></Layout>)} />
      <Route path="/upload"         element={auth(<Layout><UploadPage /></Layout>)} />
      <Route path="/playlists"      element={auth(<Layout><ListenerPlaylists /></Layout>)} />
      <Route path="/playlists/:id"  element={auth(<Layout><PlaylistDetail /></Layout>)} />

      <Route path="/distributions"  element={user ? <PlaceholderPage title="Phân Phối Nhạc" /> : <Navigate to="/login" replace />} />
      <Route path="/"               element={<Navigate to={user ? '/listener-home' : '/login'} replace />} />
      <Route path="*"               element={<PlaceholderPage title="404 - Không tìm thấy trang" />} />
    </Routes>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BehaviorProvider>
        <PlaylistProvider>
          <Router>
            <PlaybackProvider>
              <Toaster position="top-right" closeButton />
              <AppRoutes />
            </PlaybackProvider>
          </Router>
        </PlaylistProvider>
      </BehaviorProvider>
    </AuthProvider>
  );
}
