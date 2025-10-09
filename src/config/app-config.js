// src/config/app-config.js
import path from 'node:path';

// Development configuration
const devConfig = {
    isDev: process.argv.includes('--dev') || process.env.NODE_ENV === 'development',
    outputDir: path.resolve(import.meta.dirname, '../../output')
};

// Music service configuration
const musicServiceConfig = {
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || 'fd6e514207fd419b9c81f19c602f250d',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '21fbb679b9404c96a7a4fad2149cf034',
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/auth/spotify/callback',
        scopes: ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing']
    }
};

// Animation configuration
const animationConfig = {
    nextBackDuration: 800, // Duration for next/back animations in ms
    playPauseDuration: 1200, // Duration for play/pause animations in ms
    nextBackFrameRate: 20, // Frame rate for next/back animations
    playPauseFrameRate: 15 // Frame rate for play/pause animations
};

// Display configuration
const displayConfig = {
    layout: [
        [3, 2, 1],
        [4, 5, 6],
        [9, 8, 7],
        [10, 11, 12],
    ],
    panelWidth: 28,
    isMirrored: true,
    transport: {
        serial: {
            path: '/dev/ttyACM0',
            baudRate: 57600
        },
        ip: {
            host: '127.0.0.1',
            port: 3000
        }
    }
};

// Export main configuration object
export const APP_CONFIG = {
    dev: devConfig,
    musicService: musicServiceConfig,
    animations: animationConfig,
    display: displayConfig
};
