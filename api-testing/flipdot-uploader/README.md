# Flipdot Uploader

A standalone Node.js module for uploading images to flipdot displays. This module handles image processing, dithering, and communication with flipdot hardware.

## Features

- 🖼️ **Image Processing**: Automatic resizing, centering, and aspect ratio handling
- 🎨 **Dithering**: Floyd-Steinberg dithering for high-quality black/white conversion
- 🔧 **Hardware Support**: Serial communication with flipdot displays
- 🖥️ **Development Mode**: IP-based simulation for testing without hardware
- 📦 **Standalone**: Easy to integrate into any Node.js project
- ⚡ **Flexible**: Configurable panel layouts, dimensions, and processing options

## Installation

```bash
npm install @owowagency/flipdot-emu canvas
```

## Quick Start

### Simple Usage

```javascript
import { uploadToFlipdot } from './flipdot-uploader/index.js';

// Upload an image to flipdot display
const result = await uploadToFlipdot('./my-image.jpg', {
  isDev: true, // Set to false for real hardware
  outputDir: './processed-images'
});

console.log(result);
```

### Advanced Usage

```javascript
import { FlipdotUploader } from './flipdot-uploader/index.js';

// Create uploader instance
const uploader = new FlipdotUploader({
  layout: [
    [3, 2, 1],
    [4, 5, 6],
    [9, 8, 7],
    [10, 11, 12],
  ],
  panelWidth: 28,
  isMirrored: true,
  serialPath: '/dev/ttyACM0',
  baudRate: 57600,
  isDev: false, // Set to true for development
  outputDir: './output'
});

// Upload with custom options
const result = await uploader.uploadImage('./my-image.jpg', {
  blur: 0.5,
  contrast: 1.3,
  threshold: 128,
  saveOutput: true,
  outputFilename: 'processed.png'
});
```

## Configuration Options

### FlipdotUploader Constructor

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layout` | Array | `[[3,2,1],[4,5,6],[9,8,7],[10,11,12]]` | Panel layout configuration |
| `panelWidth` | Number | `28` | Width of each panel in pixels |
| `isMirrored` | Boolean | `true` | Whether to mirror the display |
| `serialPath` | String | `"/dev/ttyACM0"` | Serial port path for hardware |
| `baudRate` | Number | `57600` | Serial communication baud rate |
| `isDev` | Boolean | `false` | Development mode (uses IP simulation) |
| `outputDir` | String | `"./output"` | Directory for processed images |

### Upload Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `blur` | Number | `0.5` | Blur amount for image processing |
| `contrast` | Number | `1.3` | Contrast boost factor |
| `threshold` | Number | `128` | Black/white conversion threshold |
| `saveOutput` | Boolean | `true` | Save processed image to disk |
| `outputFilename` | String | `"uploaded.png"` | Output filename |

## API Reference

### FlipdotUploader Class

#### Constructor
```javascript
new FlipdotUploader(options)
```

#### Methods

##### `uploadImage(imagePath, options)`
Upload and process an image to the flipdot display.

**Parameters:**
- `imagePath` (string): Path to the image file
- `options` (object): Processing options

**Returns:** Promise resolving to result object

##### `getDimensions()`
Get display dimensions and configuration.

**Returns:** Object with width, height, panelWidth, and layout

##### `isConnected()`
Check if display is connected and ready.

**Returns:** Boolean

##### `connect()`
Connect to the display (for real hardware).

**Returns:** Promise

### Utility Functions

#### `uploadToFlipdot(imagePath, options)`
Quick upload function for simple usage.

**Parameters:**
- `imagePath` (string): Path to the image file
- `options` (object): Configuration options

**Returns:** Promise resolving to result object

## Examples

### Express.js Web Server

```javascript
import express from 'express';
import multer from 'multer';
import { FlipdotUploader } from './flipdot-uploader/index.js';

const app = express();
const upload = multer({ dest: 'uploads/' });
const uploader = new FlipdotUploader({
  isDev: process.env.NODE_ENV !== 'production'
});

app.post('/upload', upload.single('image'), async (req, res) => {
  const result = await uploader.uploadImage(req.file.path);
  res.json(result);
});

app.listen(3000);
```

### Batch Processing

```javascript
import { FlipdotUploader } from './flipdot-uploader/index.js';

const uploader = new FlipdotUploader({ isDev: true });
const images = ['./img1.jpg', './img2.png', './img3.gif'];

for (const imagePath of images) {
  const result = await uploader.uploadImage(imagePath);
  console.log(`Uploaded: ${imagePath} - ${result.success ? 'Success' : 'Failed'}`);
}
```

## Hardware Setup

### Serial Connection
1. Connect flipdot display to computer via USB/serial
2. Identify serial port (e.g., `/dev/ttyACM0` on Linux, `COM3` on Windows)
3. Set `serialPath` in configuration
4. Set `isDev: false` for production mode

### Development Mode
- Set `isDev: true` to use IP simulation
- Requires flipdot emulator running on localhost:3000
- No hardware connection needed

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## Error Handling

The module returns detailed error information:

```javascript
const result = await uploadToFlipdot('./image.jpg');

if (result.success) {
  console.log('Upload successful:', result.message);
} else {
  console.error('Upload failed:', result.error);
}
```

## Dependencies

- `@owowagency/flipdot-emu`: Flipdot display communication
- `canvas`: Image processing and manipulation

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open an issue on the repository.
