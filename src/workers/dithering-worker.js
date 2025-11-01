// Dithering Worker - Handles image dithering in a background thread
import { parentPort } from 'worker_threads';
import { floydSteinbergDither } from '../utils/dithering.js';

parentPort.on('message', ({ imageData, width, height, threshold }) => {
	try {
		// Reconstruct ImageData-like object
		const data = new Uint8ClampedArray(imageData);
		const imgData = {
			data,
			width,
			height
		};
		
		// Apply dithering
		const dithered = floydSteinbergDither(imgData, width, height, threshold);
		
		// Send back the dithered data
		parentPort.postMessage({
			success: true,
			data: dithered.data
		});
	} catch (error) {
		parentPort.postMessage({
			success: false,
			error: error.message
		});
	}
});

