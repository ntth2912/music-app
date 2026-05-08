const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');

router.get('/songs', musicController.getAllSongs);
router.get('/songs/by-hashtag', musicController.getSongByHashtag);
router.get('/songs/:songId/hashtags', musicController.getSongHashtagIds);
router.get('/songs/:songId', musicController.getSongById);
router.post('/songs/:songId/play', musicController.recordPlay);
// Per-song suggestions ("người nghe bài này cũng nghe")
router.get('/songs/:songId/suggestions', musicController.getSongDetailSuggestions);
// Queue panel suggestions — combined collab+hashtag+artist+popular
router.get('/songs/:songId/queue-suggestions', musicController.getQueueSuggestions);
router.get('/trending/suggestions', musicController.getTrendingSuggestions);
router.get('/trending', musicController.getTrending);
router.get('/home/suggestions', musicController.getHomeSuggestions);
router.get('/home', musicController.getHome);

// Favorites (discovery route must precede `/favorites/:userId`)
router.get('/favorites/discovery/:userId', musicController.getFavoriteDiscoverySuggestions);
router.get('/favorites/:userId', musicController.getFavorites);
router.post('/favorites/toggle', musicController.toggleFavorite);

// Artists (list must precede /:id)
router.get('/artists', musicController.getAllArtists);
router.get('/artists/:id', musicController.getArtistInfo);
router.get('/artists/:id/songs', musicController.getArtistSongs);
// Artist page: "fan của ca sĩ này cũng hay nghe"
router.get('/artists/:artistId/suggestions', musicController.getArtistPageSuggestions);

// Playlists CRUD
router.get('/playlists/:userId', musicController.getUserPlaylists);
router.post('/playlists', musicController.createPlaylist);
router.put('/playlists/:id', musicController.updatePlaylist);
router.delete('/playlists/:id', musicController.deletePlaylist);

// Playlist songs
router.get('/playlists/:id/songs', musicController.getPlaylistSongs);
// Playlist suggestions: bài phù hợp thêm vào playlist này
router.get('/playlists/:playlistId/suggestions', musicController.getPlaylistSuggestions);
router.post('/playlists/:id/songs', musicController.addSongToPlaylist);
router.delete('/playlists/:id/songs/:songId', musicController.removeSongFromPlaylist);

// Distributions
router.get('/distributions', musicController.getDistributions);
router.post('/distributions', musicController.submitDistribution);

module.exports = router;