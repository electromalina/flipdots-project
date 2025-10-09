import { createCanvas, loadImage } from "canvas";
import fs from "node:fs";
import path from "node:path";
import { Display } from "@owowagency/flipdot-emu";

/**
 * Flipdot Image Uploader
 * A standalone module for uploading images to flipdot displays
 */
export class FlipdotUploader {
  constructor(options = {}) {
    this.options = {
      layout: options.layout || [
        [3, 2, 1],
        [4, 5, 6],
        [9, 8, 7],
        [10, 11, 12],
      ],
      panelWidth: options.panelWidth || 28,
      isMirrored: options.isMirrored || true,
      serialPath: options.serialPath || "/dev/ttyACM0",
      baudRate: options.baudRate || 57600,
      isDev: options.isDev || false,
      outputDir: options.outputDir || "./output",
      ...options
    };

    // Create display instance
    this.display = new Display({
      layout: this.options.layout,
      panelWidth: this.options.panelWidth,
      isMirrored: this.options.isMirrored,
      transport: !this.options.isDev
        ? {
            type: "serial",
            path: this.options.serialPath,
            baudRate: this.options.baudRate,
          }
        : {
            type: "ip",
            host: "127.0.0.1",
            port: 3000,
          },
    });

    this.width = this.display.width;
    this.height = this.display.height;

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Process and upload an image to the flipdot display
   * @param {string} imagePath - Path to the image file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Result object with success status and output path
   */
  async uploadImage(imagePath, options = {}) {
    try {
      const {
        blur = 0.5,
        contrast = 1.3,
        threshold = 128,
        saveOutput = true,
        outputFilename = "uploaded.png"
      } = options;

      // Load and process image
      const img = await loadImage(imagePath);
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext("2d");
      
      // Apply blur + contrast boost
      ctx.filter = `blur(${blur}px) contrast(${contrast})`;

      // Calculate aspect ratio and center image
      const imgAspect = img.width / img.height;
      const displayAspect = this.width / this.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > displayAspect) {
        // Image is wider than display
        drawWidth = this.width;
        drawHeight = this.width / imgAspect;
        offsetX = 0;
        offsetY = (this.height - drawHeight) / 2;
      } else {
        // Image is taller than display
        drawHeight = this.height;
        drawWidth = this.height * imgAspect;
        offsetX = (this.width - drawWidth) / 2;
        offsetY = 0;
      }

      // Fill background and draw image
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.filter = "none";

      // Convert to black & white using Floyd–Steinberg dithering
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      this._applyDithering(imageData, threshold);

      ctx.putImageData(imageData, 0, 0);

      // Save processed image if requested
      let outputPath = null;
      if (saveOutput) {
        outputPath = path.join(this.options.outputDir, outputFilename);
        fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
      }

      // Upload to flipdot display
      if (!this.options.isDev) {
        this.display.setImageData(imageData);
        if (this.display.isDirty()) {
          this.display.flush();
        }
      }

      return {
        success: true,
        outputPath,
        width: this.width,
        height: this.height,
        message: this.options.isDev ? "Image processed (dev mode)" : "Image uploaded to flipdot"
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to process/upload image"
      };
    }
  }

  /**
   * Apply Floyd-Steinberg dithering to convert image to black and white
   * @private
   */
  _applyDithering(imageData, threshold = 128) {
    const data = imageData.data;
    const { width, height } = imageData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const oldPixel = data[i];
        const newPixel = oldPixel < threshold ? 0 : 255;
        const error = oldPixel - newPixel;

        // Set pixel
        data[i] = data[i + 1] = data[i + 2] = newPixel;
        data[i + 3] = 255;

        // Distribute error to neighboring pixels
        const distribute = (dx, dy, factor) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
          const ni = (ny * width + nx) * 4;
          data[ni] += error * factor;
          data[ni + 1] += error * factor;
          data[ni + 2] += error * factor;
        };

        distribute(1, 0, 7 / 16);
        distribute(-1, 1, 3 / 16);
        distribute(0, 1, 5 / 16);
        distribute(1, 1, 1 / 16);
      }
    }
  }

  /**
   * Get display dimensions
   */
  getDimensions() {
    return {
      width: this.width,
      height: this.height,
      panelWidth: this.options.panelWidth,
      layout: this.options.layout
    };
  }

  /**
   * Check if display is connected and ready
   */
  isConnected() {
    return this.display && !this.options.isDev;
  }

  /**
   * Connect to the display
   */
  async connect() {
    if (!this.options.isDev) {
      await this.display.connect();
    }
  }
}

/**
 * Quick upload function for simple usage
 * @param {string} imagePath - Path to image file
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Upload result
 */
export async function uploadToFlipdot(imagePath, options = {}) {
  const uploader = new FlipdotUploader(options);
  return await uploader.uploadImage(imagePath);
}

export default FlipdotUploader;
