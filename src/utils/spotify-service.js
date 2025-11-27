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
        
        // Auth status cache
        this.authStatusCache = {
            isValid: false,
            lastCheck: 0,
            cacheDuration: 30000 // Cache for 30 seconds
        };
        
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
                
                // Don't set cache optimistically - verify tokens are valid on first check
                // This ensures expired/invalid tokens are detected immediately
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
            
            // Update auth cache - new tokens are valid
            this.authStatusCache.isValid = true;
            this.authStatusCache.lastCheck = Date.now();
        } catch (error) {
            console.error('Failed to save Spotify tokens:', error);
        }
    }

    clearTokens() {
        try {
            const tokenPath = path.resolve(import.meta.dirname, '../../.spotify-tokens.json');
            if (fs.existsSync(tokenPath)) {
                fs.unlinkSync(tokenPath);
                console.log('Cleared saved Spotify tokens');
            }
            
            // Clear tokens from API instance
            this.spotifyApi.setAccessToken('');
            this.spotifyApi.setRefreshToken('');
            
            // Invalidate auth cache
            this.authStatusCache.isValid = false;
            this.authStatusCache.lastCheck = Date.now();
        } catch (error) {
            console.error('Failed to clear Spotify tokens:', error);
        }
    }

    async refreshAccessToken() {
        try {
            console.log('Refreshing access token...');
            const data = await this.spotifyApi.refreshAccessToken();
            const newAccessToken = data.body['access_token'];
            
            // Update tokens
            this.spotifyApi.setAccessToken(newAccessToken);
            
            // Save new access token (keep existing refresh token)
            const currentRefreshToken = this.spotifyApi.getRefreshToken();
            this.saveTokens(newAccessToken, currentRefreshToken);
            
            console.log('Access token refreshed successfully');
            return true;
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            
            // Invalidate auth cache when refresh fails
            this.authStatusCache.isValid = false;
            this.authStatusCache.lastCheck = Date.now();
            
            // If refresh token is invalid (400 or 401), clear saved tokens
            if (error.statusCode === 400 || error.statusCode === 401) {
                console.log('Refresh token invalid, clearing saved tokens');
                this.clearTokens();
            }
            
            return false;
        }
    }

    async isAuthenticated(skipCache = false) {
        // Check cache first (unless explicitly skipped)
        const now = Date.now();
        if (!skipCache && (now - this.authStatusCache.lastCheck) < this.authStatusCache.cacheDuration) {
            return this.authStatusCache.isValid;
        }
        
        try {
            // Quick check: do we even have a token?
            const accessToken = this.spotifyApi.getAccessToken();
            if (!accessToken) {
                this.authStatusCache.isValid = false;
                this.authStatusCache.lastCheck = now;
                return false;
            }

            // Verify token is valid with lightweight API call
            await this.spotifyApi.getMe();
            
            // Cache the positive result
            this.authStatusCache.isValid = true;
            this.authStatusCache.lastCheck = now;
            return true;
        } catch (error) {
            if (error.statusCode === 401) {
                console.log('Access token expired, attempting refresh...');
                
                // Try to refresh the token
                const refreshed = await this.refreshAccessToken();
                
                if (refreshed) {
                    this.authStatusCache.isValid = true;
                    this.authStatusCache.lastCheck = now;
                    return true; // Successfully refreshed
                }
                
                console.log('Token refresh failed, re-authentication required');
                this.authStatusCache.isValid = false;
                this.authStatusCache.lastCheck = now;
                return false;
            }
            
            // For network errors, use cached value if available
            if (this.authStatusCache.isValid && (now - this.authStatusCache.lastCheck) < 300000) {
                console.log('Using cached auth status due to network error');
                return this.authStatusCache.isValid;
            }
            
            console.error('Error checking authentication:', error.message);
            this.authStatusCache.isValid = false;
            this.authStatusCache.lastCheck = now;
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
                console.log('Access token expired, attempting refresh...');
                const refreshed = await this.refreshAccessToken();
                
                if (refreshed) {
                    // Retry the request with new token
                    return await this.getCurrentTrack();
                }
                
                console.log('Token refresh failed, please re-authenticate at http://127.0.0.1:3000');
                return null;
            }
            console.error('Error getting current track:', error.message || error);
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
            if (error.statusCode === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) return await this.nextTrack();
            }
            console.error('Error skipping to next track:', error.message || error);
        }
    }

    async previousTrack() {
        try {
            await this.spotifyApi.skipToPrevious();
            console.log('Skipped to previous track');
        } catch (error) {
            if (error.statusCode === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) return await this.previousTrack();
            }
            console.error('Error skipping to previous track:', error.message || error);
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
            if (error.statusCode === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) return await this.togglePlayback();
            }
            console.error('Error toggling playback:', error.message || error);
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
