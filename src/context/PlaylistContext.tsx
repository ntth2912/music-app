import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface Playlist {
  id: number;
  name: string;
}

interface PlaylistContextType {
  playlists: Playlist[];
  loading: boolean;
  fetchPlaylists: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextType>({
  playlists: [],
  loading: false,
  fetchPlaylists: async () => {},
});

export const PlaylistProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = useMemo(() => (user as any)?.id || (user as any)?._id, [user]);

  const fetchPlaylists = useCallback(async () => {
    if (!userId) {
      setPlaylists([]);
      return;
    }

    setLoading(true);
    try {
      // ✅ ĐÃ SỬA: Thêm /music vào URL để khớp với server.js
      const response = await fetch(`http://localhost:5000/api/music/playlists/${userId}`);
      
      if (response.status === 404) {
        setPlaylists([]);
        return;
      }

      if (!response.ok) throw new Error('API_ERROR');

      const data = await response.json();
      // ✅ ĐẢM BẢO AN TOÀN: Luôn kiểm tra Array để tránh crash
      setPlaylists(Array.isArray(data) ? data : []);
      
    } catch (error) {
      // Chỉ log lỗi thực sự nghiêm trọng
      console.error("Lỗi đồng bộ Playlist:", error);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return (
    <PlaylistContext.Provider value={{ playlists, loading, fetchPlaylists }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylist = () => useContext(PlaylistContext);