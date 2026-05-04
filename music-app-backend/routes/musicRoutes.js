const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');

router.get('/songs', musicController.getAllSongs);
router.get('/songs/by-hashtag', musicController.getSongByHashtag);
router.get('/songs/:songId/hashtags', musicController.getSongHashtagIds);
router.get('/songs/:songId', musicController.getSongById);
router.get('/trending/suggestions', musicController.getTrendingSuggestions);
router.get('/trending', musicController.getTrending);
router.get('/home/suggestions', musicController.getHomeSuggestions);
router.get('/home', musicController.getHome);

// Favorites (discovery route must precede `/favorites/:userId`)
router.get('/favorites/discovery/:userId', musicController.getFavoriteDiscoverySuggestions);
router.get('/favorites/:userId', musicController.getFavorites);
router.post('/favorites/toggle', musicController.toggleFavorite);

// Artists
router.get('/artists/:id', musicController.getArtistInfo);
router.get('/artists/:id/songs', musicController.getArtistSongs);

// Playlists CRUD
router.get('/playlists/:userId', musicController.getUserPlaylists);
router.post('/playlists', musicController.createPlaylist);
router.put('/playlists/:id', musicController.updatePlaylist);
router.delete('/playlists/:id', musicController.deletePlaylist);

// Playlist songs
router.get('/playlists/:id/songs', musicController.getPlaylistSongs);
router.post('/playlists/:id/songs', musicController.addSongToPlaylist);
router.delete('/playlists/:id/songs/:songId', musicController.removeSongFromPlaylist);

// Distributions
router.get('/distributions', musicController.getDistributions);
router.post('/distributions', musicController.submitDistribution);

module.exports = router;