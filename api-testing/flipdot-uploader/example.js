import { FlipdotUploader, uploadToFlipdot } from './index.js';
import path from 'path';

// Example 1: Simple usage with quick upload function
async function simpleExample() {
  console.log('=== Simple Upload Example ===');
  
  try {
    const result = await uploadToFlipdot('./my-image.jpg', {
      isDev: true, // Set to false for real hardware
      outputDir: './processed-images'
    });
    
    console.log('Upload result:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Example 2: Advanced usage with FlipdotUploader class
async function advancedExample() {
  console.log('=== Advanced Usage Example ===');
  
  // Create uploader instance with custom settings
  const uploader = new FlipdotUploader({
    layout: [
      [3, 2, 1],
      [4, 5, 6],
      [9, 8, 7],
      [10, 11, 12],
    ],
    panelWidth: 28,
    isMirrored: true,
    serialPath: '/dev/ttyACM0', // Change this to your serial port
    baudRate: 57600,
    isDev: false, // Set to true for development/simulation
    outputDir: './output'
  });

  // Get display information
  const dimensions = uploader.getDimensions();
  console.log('Display dimensions:', dimensions);

  // Connect to display (for real hardware)
  if (!uploader.options.isDev) {
    await uploader.connect();
  }

  // Upload image with custom processing options
  const result = await uploader.uploadImage('./my-image.jpg', {
    blur: 0.5,           // Blur amount
    contrast: 1.3,       // Contrast boost
    threshold: 128,      // Black/white threshold
    saveOutput: true,    // Save processed image
    outputFilename: 'processed-image.png'
  });

  console.log('Upload result:', result);
}

// Example 3: Batch upload multiple images
async function batchUploadExample() {
  console.log('=== Batch Upload Example ===');
  
  const uploader = new FlipdotUploader({
    isDev: true,
    outputDir: './batch-output'
  });

  const images = [
    './image1.jpg',
    './image2.png',
    './image3.gif'
  ];

  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i];
    console.log(`Uploading image ${i + 1}/${images.length}: ${imagePath}`);
    
    const result = await uploader.uploadImage(imagePath, {
      outputFilename: `batch-${i + 1}.png`
    });
    
    if (result.success) {
      console.log(`✓ Successfully uploaded: ${imagePath}`);
    } else {
      console.log(`✗ Failed to upload: ${imagePath} - ${result.error}`);
    }
    
    // Wait a bit between uploads
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Example 4: Express.js web server integration
function expressExample() {
  console.log('=== Express.js Integration Example ===');
  
  const express = require('express');
  const multer = require('multer');
  const app = express();
  const upload = multer({ dest: 'uploads/' });

  const uploader = new FlipdotUploader({
    isDev: process.env.NODE_ENV !== 'production',
    outputDir: './web-output'
  });

  app.post('/upload', upload.single('image'), async (req, res) => {
    try {
      const result = await uploader.uploadImage(req.file.path, {
        outputFilename: `web-upload-${Date.now()}.png`
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          outputPath: result.outputPath
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.listen(3000, () => {
    console.log('Express server running on port 3000');
    console.log('POST /upload to upload images to flipdot');
  });
}

// Run examples
async function runExamples() {
  console.log('Flipdot Uploader Examples\n');
  
  // Uncomment the examples you want to run:
  
  // await simpleExample();
  // await advancedExample();
  // await batchUploadExample();
  // expressExample(); // This starts a server, so it runs indefinitely
  
  console.log('\nExamples completed!');
}

// Export examples for use in other files
export {
  simpleExample,
  advancedExample,
  batchUploadExample,
  expressExample
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}
