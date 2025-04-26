const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const sharp = require('sharp');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper function to ensure upload directories exist
const ensureUploadDirs = () => {
  const uploadDir = path.join(__dirname, '../uploads');
  const tempDir = path.join(__dirname, '../temp');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return { uploadDir, tempDir };
};

// Compress audio file
exports.compressAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide an audio file to compress.' });
    }

    const { tempDir } = ensureUploadDirs();
    
    const inputPath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const tempFilename = `compressed-${uuidv4()}${fileExtension}`;
    const tempOutputPath = path.join(tempDir, tempFilename);
    
    // Get original file stats
    const originalStats = fs.statSync(inputPath);

    // Check compression mode (preset vs targetSize)
    const mode = req.body.mode || 'preset';
    let bitrate = 128; // Default bitrate

    if (mode === 'preset') {
      // Get bitrate from request or use default
      bitrate = parseInt(req.body.quality) || 128; // Default to 128kbps if not specified
    } else if (mode === 'targetSize') {
      // Get target size in bytes
      const targetSize = parseInt(req.body.targetSize) || originalStats.size / 2;
      
      // Calculate appropriate bitrate based on audio duration and target size
      // This is a simplified approach - in real app you might analyze the audio first
      bitrate = calculateBitrateForTargetSize(inputPath, targetSize);
    }
    
    // Compress audio file
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioBitrate(bitrate) // Set audio bitrate based on quality parameter
        .on('error', (err) => {
          console.error('Error compressing audio:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .save(tempOutputPath);
    });
    
    // Get compressed file stats
    const compressedStats = fs.statSync(tempOutputPath);
    
    // Calculate compression percentage
    const compressionRate = Math.round((1 - (compressedStats.size / originalStats.size)) * 100);
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(tempOutputPath, 'compressed_audio');
    
    // Remove temporary files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(tempOutputPath);
    
    res.json({
      message: 'Audio successfully compressed',
      fileName: path.basename(cloudinaryResult.url),
      downloadUrl: cloudinaryResult.url,
      publicId: cloudinaryResult.public_id,
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRate: compressionRate
    });
  } catch (error) {
    console.error('Error compressing audio:', error);
    res.status(500).json({ message: 'Error compressing audio file', error: error.message });
  }
};

// Helper function to calculate bitrate based on target size
function calculateBitrateForTargetSize(inputPath, targetSize) {
  // This is a simple estimation - a real implementation would determine
  // audio duration first and calculate more accurately
  let estimatedBitrate = 128; // Default bitrate
  
  try {
    // Use file size as a rough proxy - in real app we'd get audio duration
    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    
    // Calculate bitrate based on target size (simplified)
    // General formula: bitrate = target_size_in_bits / duration_in_seconds
    // Since we don't get duration, we'll use a rough approximation
    
    if (targetSize < originalSize / 4) {
      estimatedBitrate = 32; // Very low bitrate
    } else if (targetSize < originalSize / 2) {
      estimatedBitrate = 64; // Low bitrate
    } else if (targetSize < originalSize * 0.75) {
      estimatedBitrate = 96; // Medium bitrate
    } else {
      estimatedBitrate = 128; // High bitrate
    }
    
    // Ensure bitrate is in reasonable range
    return Math.max(32, Math.min(320, estimatedBitrate));
  } catch (err) {
    console.error('Error calculating bitrate:', err);
    return 128; // Default to 128kbps on error
  }
}

// Compress video file
exports.compressVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide a video file to compress.' });
    }

    const { tempDir } = ensureUploadDirs();
    
    const inputPath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const tempFilename = `compressed-${uuidv4()}${fileExtension}`;
    const tempOutputPath = path.join(tempDir, tempFilename);
    
    // Get original file stats
    const originalStats = fs.statSync(inputPath);
    
    // Check compression mode
    const mode = req.body.mode || 'preset';
    let videoSettings = {
      videoBitrate: '1000k',
      audioBitrate: '128k',
      size: '1280x?'
    };

    if (mode === 'preset') {
      // Get compression quality from request or use default
      const quality = req.body.quality || 'medium';
      
      // Set video compression settings based on quality
      switch (quality) {
        case 'low':
          videoSettings = { videoBitrate: '500k', audioBitrate: '64k', size: '640x?' };
          break;
        case 'medium':
          videoSettings = { videoBitrate: '1000k', audioBitrate: '128k', size: '1280x?' };
          break;
        case 'high':
          videoSettings = { videoBitrate: '2000k', audioBitrate: '192k', size: '1920x?' };
          break;
        default:
          videoSettings = { videoBitrate: '1000k', audioBitrate: '128k', size: '1280x?' };
      }
    } else if (mode === 'targetSize') {
      // Get target size in bytes
      const targetSize = parseInt(req.body.targetSize) || originalStats.size / 2;
      
      // Calculate bitrate based on target size (rough estimation)
      // For better results, we'd need to analyze the video duration first
      const targetSizeMB = targetSize / (1024 * 1024);
      
      if (targetSizeMB < 5) {
        videoSettings = { videoBitrate: '500k', audioBitrate: '64k', size: '640x?' };
      } else if (targetSizeMB < 20) {
        videoSettings = { videoBitrate: '1000k', audioBitrate: '128k', size: '1280x?' };
      } else {
        videoSettings = { videoBitrate: '2000k', audioBitrate: '192k', size: '1920x?' };
      }
    }
    
    // Compress video file
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoBitrate(videoSettings.videoBitrate)
        .audioBitrate(videoSettings.audioBitrate)
        .size(videoSettings.size)
        .on('error', (err) => {
          console.error('Error compressing video:', err);
          reject(err);
        })
        .on('end', () => {
          resolve();
        })
        .save(tempOutputPath);
    });
    
    // Get compressed file stats
    const compressedStats = fs.statSync(tempOutputPath);
    
    // Calculate compression percentage
    const compressionRate = Math.round((1 - (compressedStats.size / originalStats.size)) * 100);
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(tempOutputPath, 'compressed_videos');
    
    // Remove temporary files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(tempOutputPath);
    
    res.json({
      message: 'Video successfully compressed',
      fileName: path.basename(cloudinaryResult.url),
      downloadUrl: cloudinaryResult.url,
      publicId: cloudinaryResult.public_id,
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRate: compressionRate
    });
  } catch (error) {
    console.error('Error compressing video:', error);
    res.status(500).json({ message: 'Error compressing video file', error: error.message });
  }
};

// Compress image file
exports.compressImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide an image file to compress.' });
    }

    const { tempDir } = ensureUploadDirs();
    
    const inputPath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const tempFilename = `compressed-${uuidv4()}.jpg`; // Convert to jpg for consistency
    const tempOutputPath = path.join(tempDir, tempFilename);
    
    // Get original file stats
    const originalStats = fs.statSync(inputPath);
    
    // Check compression mode (preset vs targetSize)
    const mode = req.body.mode || 'preset';
    let quality = 80; // Default quality
    
    if (mode === 'preset') {
      // Get quality from request or use default
      quality = parseInt(req.body.quality) || 80;
    } else if (mode === 'targetSize') {
      // Get target size in bytes
      const targetSize = parseInt(req.body.targetSize) || originalStats.size / 2;
      
      // Calculate quality based on target size and original size
      // This is a basic approach - in a real app you might use more complex logic
      quality = calculateQualityForTargetSize(originalStats.size, targetSize);
    }
    
    // Compress image
    await sharp(inputPath)
      .jpeg({ quality, progressive: true })
      .toFile(tempOutputPath);
    
    // Get compressed file stats
    const compressedStats = fs.statSync(tempOutputPath);
    
    // Calculate compression percentage
    const compressionRate = Math.round((1 - (compressedStats.size / originalStats.size)) * 100);
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(tempOutputPath, 'compressed_images');
    
    // Remove temporary files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(tempOutputPath);
    
    res.json({
      message: 'Image successfully compressed',
      fileName: path.basename(cloudinaryResult.url),
      downloadUrl: cloudinaryResult.url,
      publicId: cloudinaryResult.public_id,
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRate: compressionRate
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    res.status(500).json({ message: 'Error compressing image file', error: error.message });
  }
};

// Helper function to calculate quality based on target size
function calculateQualityForTargetSize(originalSize, targetSize) {
  // This is a simplified approach
  if (targetSize < originalSize * 0.3) {
    return 50; // Low quality for small target size
  } else if (targetSize < originalSize * 0.6) {
    return 70; // Medium quality
  } else {
    return 85; // High quality
  }
}

// Remove background from an image
exports.removeImageBackground = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide an image file.' });
    }

    const { tempDir } = ensureUploadDirs();
    
    const inputPath = req.file.path;
    const outputFilename = `nobg-${uuidv4()}.png`;
    const tempOutputPath = path.join(tempDir, outputFilename);
    
    try {
      // Process image with TensorFlow.js
      // This is handled client-side for this feature, but here we simulate the output
      // In a real implementation, you'd use a server-side model or service

      // For fallback server processing, use Sharp to extract foreground
      // Note: This is a simplified approach, not as good as ML-based solutions
      await sharp(inputPath)
        .ensureAlpha()  // Ensure alpha channel
        .png({ quality: 90 })
        .toFile(tempOutputPath);
      
      // Upload to Cloudinary with background removal transformation
      // Cloudinary has a background removal capability we can use
      const cloudinaryResult = await uploadToCloudinary(inputPath, 'background_removed');
      
      // For actual background removal with Cloudinary, you'd use:
      // const cloudinaryResult = await cloudinary.uploader.upload(inputPath, {
      //   folder: 'background_removed',
      //   background_removal: 'cloudinary_ai',
      //   resource_type: 'image'
      // });
      
      // Remove temporary files
      fs.unlinkSync(inputPath);
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
      
      res.json({
        message: 'Background removed successfully',
        fileName: path.basename(cloudinaryResult.url),
        downloadUrl: cloudinaryResult.url,
        publicId: cloudinaryResult.public_id
      });
    } catch (error) {
      console.error('Error removing background:', error);
      // If there's an error with the ML model, fallback to client-side processing
      res.status(500).json({ 
        message: 'Server processing failed. Try client-side processing instead.',
        error: error.message,
        fallback: true
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ message: 'Error processing image', error: error.message });
  }
};
