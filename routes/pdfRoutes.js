const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');

// Ensure upload directories exist
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

// Configure multer storage for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { tempDir } = ensureUploadDirs();
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

// Configure file filter to only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20 // Maximum 20 files
  }
});

// PDF merge route
router.post('/merge', upload.array('pdfs', 20), async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload at least two PDF files to merge.' 
      });
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    const { uploadDir } = ensureUploadDirs();
    
    // Process each uploaded PDF file
    for (const file of req.files) {
      try {
        // Read the PDF file
        const pdfBytes = fs.readFileSync(file.path);
        
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Get pages from the PDF document
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        
        // Add pages to the merged PDF document
        pages.forEach(page => {
          mergedPdf.addPage(page);
        });
        
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        // Skip this file and continue with others
        continue;
      }
    }
    
    // Check if any pages were added
    if (mergedPdf.getPageCount() === 0) {
      throw new Error('No valid PDF pages were found in the uploaded files.');
    }
    
    // Save the merged PDF to a buffer
    const mergedPdfBytes = await mergedPdf.save();
    
    // Create a unique filename for the merged PDF
    const outputFilename = `merged-${uuidv4()}.pdf`;
    const outputPath = path.join(uploadDir, outputFilename);
    
    // Write the merged PDF to the output file
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    // Clean up temporary files
    req.files.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err) {
        console.error(`Error deleting temporary file ${file.path}:`, err);
      }
    });
    
    // Return the download URL for the merged PDF
    res.json({
      success: true,
      message: 'PDFs merged successfully!',
      downloadUrl: `/uploads/${outputFilename}`
    });
    
  } catch (error) {
    console.error('PDF merger error:', error);
    
    // Clean up temporary files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error(`Error deleting temporary file ${file.path}:`, err);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error merging PDF files.',
      error: error.message
    });
  }
});

module.exports = router;
