# Flipdot Spotify Display

A Node.js application that displays your current Spotify playback on a flipdot display with album art, scrolling text, and interactive animations.


## Features

- **Spotify Integration** - Real-time display of currently playing track
- **Album Art Display** - Optimized dithering for 28x56 pixel display
- **Smooth Text Scrolling** - Automatically scrolls long track/artist names
- **Button Animations** - Visual feedback for play, pause, next, and back actions
- **External Control Detection** - Animations trigger when controlling from Spotify app
- **Auto Token Refresh** - Never needs re-authentication after initial login
- **Live Web Preview** - Real-time preview at 8x scale with responsive design
- **Background Dithering** - CPU-intensive image processing in worker thread

## Display Specifications

- **Resolution:** 84 × 56 pixels 
- **Frame Rate:** 15 FPS
- **Color Depth:** 1-bit (black and white)

## Installation

### Prerequisites

- Node.js 18.x or higher
- Spotify Developer Account
- Spotify Premium (required for playback control API)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd flipdots-project
npm install
```

2. **Configure Spotify API**

Create a `.env` file in the project root:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/auth/spotify/callback
```

To get your Spotify credentials:
- Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Create a new app
- Add `http://127.0.0.1:3000/auth/spotify/callback` to Redirect URIs
- Copy your Client ID and Client Secret

3. **Run the application**

Development mode:
```bash
npm run dev
```


## Usage

### Web Interface

1. Open your browser and navigate to `http://localhost:3000`
2. Click "Login to Spotify" to authenticate
3. After login, the display will show your currently playing track

### Controls

- ** Back** - Skip to previous track
- ** Play/Pause** - Toggle playback
- ** Forward** - Skip to next track

Animations also trigger when you control playback from your Spotify app or other devices


## Architecture

The project follows a modular architecture for maintainability and performance:

### Core Files

- **`src/index.js`** - Main application entry point and render loop
- **`src/state-manager.js`** - Centralized state management
- **`src/ticker.js`** - Frame timing system (15 FPS)
- **`src/preview.js`** - HTTP server for web preview and API
- **`src/settings.js`** - Display configuration

### Renderers

- **`src/renderers/track-renderer.js`** - Track info, scrolling text, progress bar
- **`src/renderers/animation-renderer.js`** - Button animation playback
- **`src/renderers/idle-renderer.js`** - Idle/paused state display

### Services & Utils

- **`src/utils/spotify-service.js`** - Spotify API integration with auto-refresh
- **`src/utils/dithering.js`** - Image processing algorithms
- **`src/workers/dithering-worker.js`** - Background dithering worker thread
- **`src/animations.js`** - Animation frame generators
- **`src/config/app-config.js`** - Application configuration

## Configuration

### Display Settings (`src/settings.js`)

```javascript
export const FPS = 15;  // Frame rate
export const LAYOUT = [  // Panel arrangement
  [3, 2, 1],
  [4, 5, 6],
  [9, 8, 7],
  [10, 11, 12],
];
```




Frames are saved to `output/frame.png` for flipdot output.



## API Endpoints

The built-in web server provides:

- `GET /` - Main web interface with live preview
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/token` - Exchange authorization code for tokens
- `POST /api/button/back` - Previous track
- `POST /api/button/playpause` - Toggle playback
- `POST /api/button/forward` - Next track
- `GET /frame.png` - Current frame PNG


## Credits

Created by Danylo Kalynovskyi at Fontys University 2025
