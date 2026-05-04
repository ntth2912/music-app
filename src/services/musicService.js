import axios from 'axios';

const API = 'http://localhost:5000/api/music';

const musicService = {
  getDistributions: async () => {
    const { data } = await axios.get(`${API}/distributions`);
    return data;
  },

  // ── Playlists ──────────────────────────────────────────────────────────────

  getPlaylists: async (userId) => {
    const { data } = await axios.get(`${API}/playlists/${userId}`);
    return data;
  },

  createPlaylist: async (playlistData) => {
    const { data } = await axios.post(`${API}/playlists`, playlistData);
    return data;
  },

  updatePlaylist: async (id, updateData) => {
    const { data } = await axios.put(`${API}/playlists/${id}`, updateData);
    return data;
  },

  deletePlaylist: async (id) => {
    const { data } = await axios.delete(`${API}/playlists/${id}`);
    return data;
  },

  // ── Playlist songs ─────────────────────────────────────────────────────────

  getPlaylistSongs: async (playlistId) => {
    const { data } = await axios.get(`${API}/playlists/${playlistId}/songs`);
    return data;
  },

  addSongToPlaylist: async (playlistId, songId) => {
    const { data } = await axios.post(`${API}/playlists/${playlistId}/songs`, { songId });
    return data;
  },

  removeSongFromPlaylist: async (playlistId, songId) => {
    const { data } = await axios.delete(`${API}/playlists/${playlistId}/songs/${songId}`);
    return data;
  },

  toggleFavorite: async (userId, songId) => {
    const { data } = await axios.post(`${API}/favorites/toggle`, { userId, songId });
    return data;
  },

  getHomeSuggestions: async (userId) => {
    const { data } = await axios.get(`${API}/home/suggestions`, { params: { userId } });
    return data;
  },
};

export default musicService;
