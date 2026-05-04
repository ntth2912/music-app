const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

router.get('/artists', uploadController.getArtists);
router.get('/songs', uploadController.getAllSongs);
router.post('/songs', uploadController.uploadMiddleware, uploadController.uploadSong);
router.get('/songs/:id', uploadController.getSong);
router.put('/songs/:id', uploadController.uploadMiddleware, uploadController.updateSong);
router.delete('/songs/:id', uploadController.deleteSong);
router.get('/songs/:id/file-check', uploadController.checkSongFile);

module.exports = router;
