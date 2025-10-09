// Spotify Service - handles Spotify API integration
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';
import { ditherCanvasEnhanced } from './dithering.js';
import SpotifyWebApi from 'spotify-web-api-node';

// Cache for processed album art
let cachedAlbumArt = new Map();

// Helper function to process album art (resize and dither)
async function processAlbumArt(image, maxWidth, maxHeight, cacheKey) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    let width = maxWidth;
    let height = Math.floor(width / aspectRatio);
    
    if (height > maxHeight) {
        height = maxHeight;
        width = Math.floor(height * aspectRatio);
    }

    // Create canvas for the album art
    const albumCanvas = createCanvas(width, height);
    const albumCtx = albumCanvas.getContext('2d');
    
    // Draw image
    albumCtx.drawImage(image, 0, 0, width, height);
    
    // Apply enhanced dithering (optimized for small screens)
    ditherCanvasEnhanced(albumCtx, width, height);
    
    cachedAlbumArt.set(cacheKey, albumCanvas);
    console.log(`Successfully processed album art: ${width}x${height}, dithered`);
    return albumCanvas;
}

// Spotify Service Implementation
export class SpotifyService {
    constructor(config) {
        this.config = config;
        this.spotifyApi = new SpotifyWebApi({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri
        });
        
        // Load saved tokens if they exist
        this.loadTokens();
        console.log('Spotify service initialized');
    }

    loadTokens() {
        try {
            const tokenPath = path.resolve(import.meta.dirname, '../../.spotify-tokens.json');
            if (fs.existsSync(tokenPath)) {
                const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
                this.spotifyApi.setAccessToken(tokens.accessToken);
                this.spotifyApi.setRefreshToken(tokens.refreshToken);
                console.log('Loaded saved Spotify tokens');
                
                // Set up automatic token refresh
                this.spotifyApi.setRefreshToken(tokens.refreshToken);
            }
        } catch (error) {
            console.log('No saved Spotify tokens found');
        }
    }

    saveTokens(accessToken, refreshToken) {
        try {
            const tokenPath = path.resolve(import.meta.dirname, '../../.spotify-tokens.json');
            const tokens = { accessToken, refreshToken };
            fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
            console.log('Saved Spotify tokens');
        } catch (error) {
            console.error('Failed to save Spotify tokens:', error);
        }
    }

    async isAuthenticated() {
        try {
            // Check if we have an access token
            const accessToken = this.spotifyApi.getAccessToken();
            if (!accessToken) {
                return false;
            }

            // Try to make a simple API call to verify the token is valid
            await this.spotifyApi.getMe();
            return true;
        } catch (error) {
            if (error.statusCode === 401) {
                console.log('Spotify token is expired or invalid');
                return false;
            }
            // For other errors, assume we're authenticated but there's a temporary issue
            console.error('Error checking authentication:', error.message);
            return false;
        }
    }

    async getCurrentTrack() {
        try {
            const response = await this.spotifyApi.getMyCurrentPlayingTrack();
            
            if (!response.body.item) {
                return null;
            }

            const track = response.body.item;
            return {
                track: track.name,
                artist: track.artists[0].name,
                album: track.album.name,
                duration: track.duration_ms,
                progress: response.body.progress_ms || 0,
                isPlaying: response.body.is_playing,
                albumImageUrl: track.album.images[0]?.url
            };
        } catch (error) {
            if (error.statusCode === 401) {
                console.log('Spotify token expired, please re-authenticate at http://127.0.0.1:3000/auth/login');
                return null;
            }
            console.error('Error getting current track:', error.message || error);
            console.error('Full error details:', JSON.stringify(error, null, 2));
            return null;
        }
    }

    async getAlbumArt(trackData, maxWidth, maxHeight) {
        if (!trackData || !trackData.albumImageUrl) return null;

        const cacheKey = `${trackData.albumImageUrl}-${maxWidth}-${maxHeight}`;
        
        if (cachedAlbumArt.has(cacheKey)) {
            return cachedAlbumArt.get(cacheKey);
        }

        try {
            // Fetch image from URL
            const response = await fetch(trackData.albumImageUrl);
            const buffer = await response.arrayBuffer();
            const image = await loadImage(Buffer.from(buffer));
            
            console.log(`Loading album art: ${trackData.track} (${image.width}x${image.height})`);
            return await processAlbumArt(image, maxWidth, maxHeight, cacheKey);
            
        } catch (error) {
            console.error('Error loading album art:', error);
            return null;
        }
    }

    async nextTrack() {
        try {
            await this.spotifyApi.skipToNext();
            console.log('Skipped to next track');
        } catch (error) {
            console.error('Error skipping to next track:', error.message || error);
            console.error('Full next track error details:', JSON.stringify(error, null, 2));
        }
    }

    async previousTrack() {
        try {
            await this.spotifyApi.skipToPrevious();
            console.log('Skipped to previous track');
        } catch (error) {
            console.error('Error skipping to previous track:', error.message || error);
            console.error('Full previous track error details:', JSON.stringify(error, null, 2));
        }
    }

    async togglePlayback() {
        try {
            const state = await this.spotifyApi.getMyCurrentPlaybackState();
            
            if (state.body && state.body.is_playing) {
                await this.spotifyApi.pause();
                console.log('Paused playback');
            } else {
                await this.spotifyApi.play();
                console.log('Resumed playback');
            }
        } catch (error) {
            console.error('Error toggling playback:', error.message || error);
            console.error('Full toggle error details:', JSON.stringify(error, null, 2));
        }
    }

    async play() {
        try {
            await this.spotifyApi.play();
            console.log('Started playback');
        } catch (error) {
            console.error('Error starting playback:', error.message);
        }
    }

    async pause() {
        try {
            await this.spotifyApi.pause();
            console.log('Paused playback');
        } catch (error) {
            console.error('Error pausing playback:', error.message);
        }
    }
}
