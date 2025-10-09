/**
 This algorithm works by:
 1. Converting each pixel to grayscale (luminance)
 2. Comparing it to a threshold to decide black or white
 3. Distributing the quantization error to neighboring pixels
 * 
 * The error diffusion pattern:
 *         current   7/16
 *   3/16    5/16    1/16
 * 
 * @param {ImageData} imageData - Canvas ImageData object to process
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {number} threshold - Luminance threshold (0-255, default 128). Pixels darker than this become black.
 * @returns {ImageData} The dithered image data
 */
export function floydSteinbergDither(imageData, width, height, threshold = 128) {
    const data = imageData.data;
    const luminance = new Array(width * height);

    // Step 1: Convert RGB to grayscale using weighted luminance formula
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // ITU-R BT.601 luma coefficients for accurate perceived brightness
        luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Step 2: Process each pixel left-to-right, top-to-bottom
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const old = luminance[idx];
            
            // Quantize: decide if this pixel should be black (0) or white (255)
            const newVal = old < threshold ? 0 : 255;
            
            // Calculate quantization error (how much information we lost)
            const err = old - newVal;
            
            // Set the pixel to its quantized value
            luminance[idx] = newVal;

            // Step 3: Distribute the error to neighboring pixels (Floyd-Steinberg weights)
            // This creates smooth gradients instead of harsh black/white transitions
            
            // Right pixel gets 7/16 of the error
            if (x + 1 < width) 
                luminance[idx + 1] += err * 7 / 16;
            
            // Bottom-left pixel gets 3/16 of the error
            if (x - 1 >= 0 && y + 1 < height) 
                luminance[idx + width - 1] += err * 3 / 16;
            
            // Bottom pixel gets 5/16 of the error (largest share going down)
            if (y + 1 < height) 
                luminance[idx + width] += err * 5 / 16;
            
            // Bottom-right pixel gets 1/16 of the error
            if (x + 1 < width && y + 1 < height) 
                luminance[idx + width + 1] += err * 1 / 16;
        }
    }

    // Step 4: Write the dithered luminance values back to the RGBA image data
    // Convert the grayscale luminance to RGB (all channels get the same value for grayscale)
    for (let i = 0; i < width * height; i++) {
        const v = luminance[i] > 127 ? 255 : 0;  // Final binary: pure black or white
        data[i * 4] = v;      // Red channel
        data[i * 4 + 1] = v;  // Green channel
        data[i * 4 + 2] = v;  // Blue channel
        data[i * 4 + 3] = 255;  // Alpha channel (fully opaque)
    }
    return imageData;
}

/**
 * Convenience function: Apply dithering directly to a canvas context
 * 
 * This is a wrapper around floydSteinbergDither that handles the common pattern of:
 * 1. Getting ImageData from canvas
 * 2. Applying dithering
 * 3. Putting the result back to canvas
 * 
 * Use this when you want to dither an entire canvas in place.
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context to dither
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {number} threshold - Luminance threshold (0-255, default 128)
 */
export function ditherCanvas(ctx, width, height, threshold = 128) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const ditheredData = floydSteinbergDither(imageData, width, height, threshold);
    ctx.putImageData(ditheredData, 0, 0);
}

/**
 * Increase image contrast before dithering
 * This makes features more visible on small displays
 */
function enhanceContrast(imageData, width, height, factor = 1.5) {
    const data = imageData.data;
    const contrast = (factor - 1) * 255;
    const intercept = 128 * (1 - factor);

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept)); // B
    }
    return imageData;
}

/**
 * Sharpen image to preserve details on small screens
 */
function sharpenImage(imageData, width, height, amount = 1.0) {
    const data = imageData.data;
    const original = new Uint8ClampedArray(data);
    
    // Sharpening kernel (unsharp mask)
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) { // RGB channels only
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += original[idx] * kernel[kernelIdx];
                    }
                }
                const idx = (y * width + x) * 4 + c;
                // Blend original with sharpened based on amount
                data[idx] = Math.max(0, Math.min(255, 
                    original[idx] * (1 - amount) + sum * amount
                ));
            }
        }
    }
    return imageData;
}

/**
 * Calculate adaptive threshold based on image content
 * Uses Otsu's method for automatic threshold selection
 */
function calculateAdaptiveThreshold(imageData, width, height) {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    
    // Build histogram
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const luminance = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
        histogram[luminance]++;
    }
    
    // Otsu's method
    const total = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 128;
    
    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        
        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
        }
    }
    
    return threshold;
}

/**
 * Atkinson dithering - better for small screens, lighter appearance
 * Uses less aggressive error diffusion than Floyd-Steinberg
 */
export function atkinsonDither(imageData, width, height, threshold = 128) {
    const data = imageData.data;
    const luminance = new Array(width * height);

    // Convert to grayscale
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Atkinson dithering pattern (distributes 6/8 of error, loses 2/8)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const old = luminance[idx];
            const newVal = old < threshold ? 0 : 255;
            const err = (old - newVal) / 8; // Divide by 8 for Atkinson
            
            luminance[idx] = newVal;

            // Distribute error (only 6/8, intentionally loses 2/8 for lighter look)
            if (x + 1 < width) luminance[idx + 1] += err;
            if (x + 2 < width) luminance[idx + 2] += err;
            if (y + 1 < height) {
                if (x - 1 >= 0) luminance[idx + width - 1] += err;
                luminance[idx + width] += err;
                if (x + 1 < width) luminance[idx + width + 1] += err;
            }
            if (y + 2 < height) luminance[idx + width * 2] += err;
        }
    }

    // Write back
    for (let i = 0; i < width * height; i++) {
        const v = luminance[i] > 127 ? 255 : 0;
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
    }
    return imageData;
}

/**
 * Enhanced dithering with preprocessing for small screens
 * Combines sharpening, contrast enhancement, adaptive thresholding, and Atkinson dithering
 * for optimal clarity on tiny pixel displays
 */
export function ditherCanvasEnhanced(ctx, width, height) {
    // Get image data
    let imageData = ctx.getImageData(0, 0, width, height);
    
    // Step 1: Sharpen to preserve details
    imageData = sharpenImage(imageData, width, height, 0.6);
    
    // Step 2: Enhance contrast
    imageData = enhanceContrast(imageData, width, height, 1.3);
    
    // Step 3: Calculate optimal threshold
    const threshold = calculateAdaptiveThreshold(imageData, width, height);
    
    // Step 4: Apply Atkinson dithering (better for small screens)
    imageData = atkinsonDither(imageData, width, height, threshold);
    
    ctx.putImageData(imageData, 0, 0);
}