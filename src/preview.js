import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import open from "open";
import { URL } from "node:url";
import { APP_CONFIG } from "./config/app-config.js";

// Store reference to button handler (will be set by main app)
let buttonHandler = null;
let spotifyService = null;

export function setButtonHandler(handler) {
	buttonHandler = handler;
}

export function setSpotifyService(service) {
	spotifyService = service;
}

	http
	.createServer(async (req, res) => {
		// Handle authentication status check
		if (req.url === "/api/auth/status") {
			let isAuthenticated = false;
			if (spotifyService) {
				// Skip cache to get fresh authentication status
				// This ensures we detect token refresh failures immediately
				isAuthenticated = await spotifyService.isAuthenticated(true);
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ authenticated: isAuthenticated }));
			return;
		}

		// Handle Spotify OAuth login
		if (req.url === "/auth/login") {
			const spotifyConfig = APP_CONFIG.musicService.spotify;
			
			if (!spotifyConfig.clientId) {
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(`
					<html><body>
						<h1>Configuration Error</h1>
						<p>Spotify Client ID is missing. Please check your .env file.</p>
						<p>Environment variables loaded: ${process.env.SPOTIFY_CLIENT_ID ? 'YES' : 'NO'}</p>
						<a href="/">Go back to app</a>
					</body></html>
				`);
				return;
			}
			
			const scopes = spotifyConfig.scopes.join(' ');
			const authUrl = `https://accounts.spotify.com/authorize?` +
				`client_id=${spotifyConfig.clientId}&` +
				`response_type=code&` +
				`redirect_uri=${encodeURIComponent(spotifyConfig.redirectUri)}&` +
				`scope=${encodeURIComponent(scopes)}`;
			
			res.writeHead(302, { "Location": authUrl });
			res.end();
			return;
		}

		// Handle token exchange (called from frontend)
		if (req.url === "/api/auth/token" && req.method === "POST") {
			let body = '';
			req.on('data', chunk => {
				body += chunk.toString();
			});
			
			req.on('end', async () => {
				try {
					const { code, codeVerifier } = JSON.parse(body);
					
					if (!code || !codeVerifier) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ success: false, error: 'Missing code or verifier' }));
						return;
					}
					
					// Exchange code for tokens using PKCE
					const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						body: new URLSearchParams({
							client_id: APP_CONFIG.musicService.spotify.clientId,
							grant_type: 'authorization_code',
							code: code,
							redirect_uri: APP_CONFIG.musicService.spotify.redirectUri,
							code_verifier: codeVerifier
						})
					});
					
					const tokenData = await tokenResponse.json();
					
					if (tokenData.access_token) {
						// Save tokens to backend
						spotifyService.spotifyApi.setAccessToken(tokenData.access_token);
						spotifyService.spotifyApi.setRefreshToken(tokenData.refresh_token);
						spotifyService.saveTokens(tokenData.access_token, tokenData.refresh_token);
						
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ success: true }));
					} else {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ success: false, error: tokenData.error || 'Token exchange failed' }));
					}
				} catch (error) {
					console.error('Token exchange error:', error);
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ success: false, error: error.message }));
				}
			});
			return;
		}
		
		// Handle callback route (serves same HTML as main page)
		if (req.url === "/auth/spotify/callback" || req.url.startsWith("/auth/spotify/callback?")) {
			// Serve the main interface (callback will be handled by frontend JS)
			req.url = "/";
		}

		// Handle button actions
		if (req.url.startsWith("/api/button/")) {
			const action = req.url.split("/api/button/")[1];
			if (buttonHandler && ['back', 'playpause', 'forward'].includes(action)) {
				buttonHandler(action);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, action }));
			} else {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: false, error: "Invalid action" }));
			}
			return;
		}
		
		if (req.url === "/" || req.url === "/index.html") {
			// Serve the main interface with both controls and flipdot display
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flipdot Display</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            gap: 15px;
            box-sizing: border-box;
        }
        .preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            max-width: 100%;
            width: 100%;
        }
        .controls {
            display: flex;
            gap: 30px;
            align-items: center;
            justify-content: center;
        }
        button {
            width: 50px;
            height: 50px;
            background-color: #333;
            color: #fff;
            border: 2px solid #555;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.2s ease;
            transform-origin: center center;
            will-change: transform;
        }
        button:hover {
            background-color: #555;
            transform: scale(1.1);
            position: relative;
            z-index: 10;
        }
        button:active {
            transform: scale(0.95);
        }
        #loginButton {
            width: auto;
            height: auto;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            background-color: #1DB954;
            border: none;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        #loginButton.show {
            display: block;
            opacity: 1;
        }
        #loginButton:hover {
            background-color: #1ed760;
        }
        #authStatus {
            color: #888;
            font-size: 14px;
            font-family: Arial, sans-serif;
            display: block;
            opacity: 1;
            transition: opacity 0.3s ease;
            visibility: visible;
        }
        #authStatus.hide {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .live-preview {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            width: 100%;
            max-width: min(840px, 90vw);
            height: auto;
            aspect-ratio: 84 / 56;
            object-fit: contain;
        }
        
        @media (max-height: 700px) {
            .live-preview {
                max-width: min(630px, 90vw);
            }
            body {
                gap: 10px;
            }
            .preview-container {
                gap: 10px;
            }
        }
        
        @media (max-height: 500px) {
            .live-preview {
                max-width: min(420px, 90vw);
            }
            body {
                padding: 10px;
                gap: 8px;
            }
            .preview-container {
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <img id="liveFrame" class="live-preview" src="/frame.png">
        <div class="controls">
            <button onclick="sendButtonAction('back')">⏮</button>
            <button onclick="sendButtonAction('playpause')">⏯</button>
            <button onclick="sendButtonAction('forward')">⏭</button>
        </div>
        <button id="loginButton" onclick="loginToSpotify()">Login to Spotify</button>
        <div id="authStatus">✓ Connected to Spotify</div>
    </div>
    
    <script>
        // Spotify Auth Configuration
        const SPOTIFY_CLIENT_ID = '${APP_CONFIG.musicService.spotify.clientId}';
        const SPOTIFY_REDIRECT_URI = '${APP_CONFIG.musicService.spotify.redirectUri}';
        const SPOTIFY_SCOPES = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'];

        // PKCE Helper Functions
        function generateRandomString(length) {
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const values = crypto.getRandomValues(new Uint8Array(length));
            return values.reduce((acc, x) => acc + possible[x % possible.length], '');
        }

        async function sha256(plain) {
            const encoder = new TextEncoder();
            const data = encoder.encode(plain);
            return window.crypto.subtle.digest('SHA-256', data);
        }

        function base64urlencode(a) {
            return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
                .replace(/\\+/g, '-')
                .replace(/\\//g, '_')
                .replace(/=+$/, '');
        }

        async function generateCodeChallenge(verifier) {
            const hashed = await sha256(verifier);
            return base64urlencode(hashed);
        }

        // Check authentication status
        async function checkAuthStatus() {
            try {
                // Add timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('/api/auth/status', {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                const data = await response.json();
                
                const loginButton = document.getElementById('loginButton');
                const authStatus = document.getElementById('authStatus');
                
                if (data.authenticated) {
                    // Authenticated - hide login, show status
                    loginButton.classList.remove('show');
                    authStatus.classList.remove('hide');
                    
                    // Update status message based on playback state
                    if (data.hasPlayback) {
                        authStatus.textContent = '✓ Connected to Spotify';
                        authStatus.style.color = '#1DB954';
                    } else {
                        authStatus.textContent = '✓ Connected - No music playing';
                        authStatus.style.color = '#888';
                    }
                } else {
                    // Not authenticated - show login, hide status
                    loginButton.classList.add('show');
                    authStatus.classList.add('hide');
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                // On error, assume not authenticated
                const loginButton = document.getElementById('loginButton');
                const authStatus = document.getElementById('authStatus');
                loginButton.classList.add('show');
                authStatus.classList.add('hide');
            }
        }

        // Login to Spotify with PKCE
        async function loginToSpotify() {
            // Generate PKCE codes
            const codeVerifier = generateRandomString(64);
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            
            // Store code verifier for later use
            localStorage.setItem('spotify_code_verifier', codeVerifier);
            
            // Build authorization URL
            const params = new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                response_type: 'code',
                redirect_uri: SPOTIFY_REDIRECT_URI,
                code_challenge_method: 'S256',
                code_challenge: codeChallenge,
                scope: SPOTIFY_SCOPES.join(' ')
            });
            
            // Redirect to Spotify authorization
            window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
        }

        // Handle OAuth callback
        async function handleCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            
            if (error) {
                console.error('Spotify auth error:', error);
                alert('Authentication failed: ' + error);
                window.location.href = '/';
                return;
            }
            
            if (code) {
                try {
                    // Get stored code verifier
                    const codeVerifier = localStorage.getItem('spotify_code_verifier');
                    
                    if (!codeVerifier) {
                        throw new Error('Code verifier not found');
                    }
                    
                    // Exchange code for tokens
                    const response = await fetch('/api/auth/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            code: code,
                            codeVerifier: codeVerifier
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Clear code verifier
                        localStorage.removeItem('spotify_code_verifier');
                        
                        // Redirect to main page
                        window.location.href = '/';
                    } else {
                        throw new Error(data.error || 'Token exchange failed');
                    }
                } catch (error) {
                    console.error('Error exchanging code:', error);
                    alert('Authentication failed. Please try again.');
                    window.location.href = '/';
                }
            }
        }

        // Check if this is a callback page
        if (window.location.pathname === '/auth/spotify/callback') {
            handleCallback(); // This will redirect, so no need to do anything else
        } else {
            // Only check auth status and start updates if NOT on callback page
            checkAuthStatus();
            setInterval(checkAuthStatus, 30000); // Check auth status every 30 seconds
        }

        // Send button action to server
        async function sendButtonAction(action) {
            try {
                const response = await fetch('/api/button/' + action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('Button action "' + action + '" sent successfully');
                } else {
                    console.error('Button action failed:', result.error);
                }
            } catch (error) {
                console.error('Error sending button action:', error);
            }
        }

        // Live preview update
        function updateLiveFrame() {
            document.getElementById('liveFrame').src = '/frame.png?t=' + Date.now();
            requestAnimationFrame(updateLiveFrame);
        }

        // Always start the frame update (works on any page)
        updateLiveFrame();
    </script>
</body>
</html>
    `);
		} else if (req.url.startsWith("/frame.png")) {
			res.writeHead(200, { "Content-Type": "image/png" });
			res.end(fs.readFileSync("./output/frame.png"));
		} else {
			// 404 for other routes
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not Found");
		}
	})
	.listen(3000);
