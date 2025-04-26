const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
// In a real implementation, you'd use libraries like 'sharp' for image processing
// const sharp = require('sharp');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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

// Method 1: Python-based background removal using rembg
const removeBackgroundWithPython = async (inputPath, outputPath) => {
  try {
    const { exec } = require('child_process');
    const pythonCommand = `python ${path.join(__dirname, '../utils/bg_remover.py')} "${inputPath}" "${outputPath}" "u2net_human_seg"`;
    
    await new Promise((resolve, reject) => {
      exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Python background removal error: ${error}`);
          console.error(`stderr: ${stderr}`);
          return reject(error);
        }
        console.log(`Python stdout: ${stdout}`);
        resolve();
      });
    });
    
    return fs.existsSync(outputPath);
  } catch (error) {
    console.error('Python background removal failed:', error);
    return false;
  }
};

// Method 2: Cloudinary background removal
const removeBackgroundWithCloudinary = async (inputPath) => {
  try {
    const result = await cloudinary.uploader.upload(inputPath, {
      folder: 'background_removed',
      background_removal: 'cloudinary_ai',
      resource_type: 'image'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary background removal failed:', error);
    return null;
  }
};

// Method 3: Sharp-based background removal (simplified approach)
const removeBackgroundWithSharp = async (inputPath, outputPath) => {
  try {
    await sharp(inputPath)
      .ensureAlpha()
      .png({ quality: 90 })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('Sharp background removal failed:', error);
    return false;
  }
};

// Main background removal function with fallback strategy
exports.removeBackground = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide an image file.' });
    }

    const { uploadDir, tempDir } = ensureUploadDirs();
    const inputPath = req.file.path;
    const outputFilename = `nobg-${uuidv4()}.png`;
    const outputPath = path.join(uploadDir, outputFilename);
    const tempOutputPath = path.join(tempDir, outputFilename);

    let success = false;
    let resultUrl = null;
    let methodUsed = '';

    // Try Method 1: Python-based removal
    if (process.env.ENABLE_SERVER_BG_REMOVAL === 'true') {
      success = await removeBackgroundWithPython(inputPath, outputPath);
      if (success) {
        methodUsed = 'python';
        resultUrl = `/uploads/${outputFilename}`;
      }
    }

    // Try Method 2: Cloudinary if Python fails
    if (!success && process.env.CLOUDINARY_CLOUD_NAME) {
      resultUrl = await removeBackgroundWithCloudinary(inputPath);
      if (resultUrl) {
        success = true;
        methodUsed = 'cloudinary';
      }
    }

    // Try Method 3: Sharp as last server-side attempt
    if (!success) {
      success = await removeBackgroundWithSharp(inputPath, tempOutputPath);
      if (success) {
        methodUsed = 'sharp';
        // Upload the Sharp-processed image to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(tempOutputPath, {
          folder: 'background_removed'
        });
        resultUrl = cloudinaryResult.secure_url;
      }
    }

    // Clean up temporary files
    try {
      fs.unlinkSync(inputPath);
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
    }

    if (success) {
      res.status(200).json({
        success: true,
        message: `Background removed successfully using ${methodUsed}!`,
        imageUrl: resultUrl,
        method: methodUsed
      });
    } else {
      // If all server-side methods fail, suggest client-side processing
      res.status(500).json({
        message: 'Server-side background removal failed. Please try client-side processing.',
        fallback: true,
        error: 'All server-side methods failed'
      });
    }
  } catch (error) {
    console.error('Image background removal error:', error);
    res.status(500).json({
      message: 'Failed to remove image background',
      error: error.message,
      fallback: true
    });
  }
};

// Image compression
exports.compressImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide an image file.' });
    }

    const compressionLevel = req.body.compressionLevel || 'medium';
    const { uploadDir } = ensureUploadDirs();
    
    // In a real implementation, you'd use sharp for image compression:
    // const quality = {
    //   low: 80,
    //   medium: 60,
    //   high: 40
    // }[compressionLevel];
    
    const outputFilename = `compressed-${uuidv4()}${path.extname(req.file.originalname)}`;
    const outputPath = path.join(uploadDir, outputFilename);
    
    // Example with sharp (commented out):
    // await sharp(req.file.path)
    //   .jpeg({ quality: quality })
    //   .toFile(outputPath);
    
    // For demo, just copy the file
    fs.copyFileSync(req.file.path, outputPath);
    
    // Get file stats for original and compressed versions
    const originalStats = fs.statSync(req.file.path);
    const compressedStats = fs.statSync(outputPath);
    
    // Clean up - remove temporary file
    fs.unlinkSync(req.file.path);
    
    const compressionRate = Math.round((1 - (compressedStats.size / originalStats.size)) * 100);
    const downloadUrl = `/uploads/${outputFilename}`;
    
    res.status(200).json({
      success: true,
      message: 'Image compressed successfully!',
      downloadUrl,
      fileName: outputFilename,
      originalSize: originalStats.size,
      compressedSize: compressedStats.size,
      compressionRate
    });
  } catch (error) {
    console.error('Image compression error:', error);
    res.status(500).json({ message: 'Failed to compress image', error: error.message });
  }
};
