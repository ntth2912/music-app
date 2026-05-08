import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from './components/sonner';
import Sidebar from './components/layout/Sidebar';
import ListenerHome from './pages/listener/ListenerHome';
import ListenerPlaylists from './pages/listener/ListenerPlaylists';
import PlaylistDetail from './pages/listener/PlaylistDetail';
import DetailSong from './pages/listener/DetailSong';
import ArtistPage from './pages/listener/ArtistPage';
import ArtistsListPage from './pages/listener/ArtistsListPage';
import UploadPage from './pages/admin/UploadPage';
import Login from './pages/Login';
import Trending from './pages/Trending';
import Favorites from './pages/Favorites';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BehaviorProvider } from './context/BehaviorContext';
import { PlaylistProvider } from './context/PlaylistContext';
import { PlaybackProvider, usePlayback } from './context/PlaybackContext';
import MusicPlayer, { toPlaybackSong } from './components/MusicPlayer';
import QueuePanel from './components/QueuePanel';
import musicService from './services/musicService';

// ── Global player rendered at app level (persists across navigation) ──────────

function sourceTypeFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname.startsWith('/trending')) return 'trending';
  if (pathname.startsWith('/favorites')) return 'favorites';
  if (pathname.startsWith('/artists')) return 'artist';
  if (pathname.startsWith('/playlists')) return 'playlist';
  if (pathname.startsWith('/song')) return 'detail';
  if (pathname.startsWith('/search')) return 'search';
  return 'other';
}

function AppPlayer() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    currentSong, playKey, handleNext, handlePrevious,
    toggleLike, likedSongs, queueOpen, setQueueOpen,
    queue, queueIndex, manualQueue, suggestions,
    loopMode, cycleLoop, playIndexed, playFromManualQueue, playSuggestion,
    setSuggestions, stopPlayback,
  } = usePlayback();

  // Refetch suggestions when playing song changes; pass queue IDs so server excludes them
  useEffect(() => {
    if (!currentSong) return;
    const songId = Number(currentSong.song_id);
    const excludeIds = [
      ...queue.map((s) => Number(s.song_id)),
      ...manualQueue.map((s) => Number(s.song_id)),
    ];
    musicService.getQueueSuggestions(songId, user?.id ?? null, excludeIds)
      .then((data: unknown) => {
        const raw = Array.isArray(data) ? data : [];
        const mapped = raw.map((s: unknown) => toPlaybackSong(s as Parameters<typeof toPlaybackSong>[0]));
        setSuggestions(mapped);
      })
      .catch((err) => console.error('[QueueSuggestions] fetch failed:', err));
  }, [user?.id, currentSong?.song_id, queue, manualQueue, setSuggestions]);

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
        disableSkip={loopMode === 'one'}
        onClose={() => { setQueueOpen(false); stopPlayback(); }}
        onCountPlay={(songId, listenedSeconds) => {
          if (user?.id) {
            const sourceType = sourceTypeFromPath(location.pathname);
            musicService.recordPlay(songId, user.id, listenedSeconds, sourceType).catch(() => {});
          }
        }}
      />
      {queueOpen && (
        <QueuePanel
          queue={queue}
          currentIndex={queueIndex}
          manualQueue={manualQueue}
          suggestions={suggestions}
          loopMode={loopMode}
          onCycleLoop={cycleLoop}
          onClose={() => setQueueOpen(false)}
          onPlayIndex={(idx) => playIndexed(queue, idx)}
          onPlayFromManualQueue={playFromManualQueue}
          onPlaySuggestion={playSuggestion}
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
      <main className="flex-1 overflow-y-auto h-[100vh] pb-20  [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full">{children}</main>
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
      <Route path="/artists"         element={auth(<Layout><ArtistsListPage /></Layout>)} />
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
