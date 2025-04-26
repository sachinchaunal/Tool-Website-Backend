const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mediaController = require('../controllers/mediaController');

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../temp'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Configure file filter for media files
const fileFilter = (req, file, cb) => {
  // Check file type based on mimetype
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
  const videoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
  
  if (
    imageTypes.includes(file.mimetype) || 
    audioTypes.includes(file.mimetype) || 
    videoTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type.'), false);
  }
};

// Create multer upload instance
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Image compression route
router.post('/compress-image', upload.single('image'), mediaController.compressImage);

// Audio compression route
router.post('/compress-audio', upload.single('audio'), mediaController.compressAudio);

// Video compression route
router.post('/compress-video', upload.single('video'), mediaController.compressVideo);

// Image background removal route
router.post('/remove-bg', upload.single('image'), mediaController.removeImageBackground);

module.exports = router;
router.post('/remove-bg', upload.single('image'), mediaController.removeImageBackground);

module.exports = router;
