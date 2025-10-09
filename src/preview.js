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
				isAuthenticated = await spotifyService.isAuthenticated();
			}
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ authenticated: isAuthenticated }));
			return;
		}

		// Handle Spotify OAuth login
		if (req.url === "/auth/login") {
			const spotifyConfig = APP_CONFIG.musicService.spotify;
			
			// Debug: Check if credentials are loaded
			console.log('Raw process.env values:');
			console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
			console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);
			console.log('Spotify Config:', {
				clientId: spotifyConfig.clientId ? `${spotifyConfig.clientId.substring(0, 8)}...` : 'MISSING',
				clientSecret: spotifyConfig.clientSecret ? 'SET' : 'MISSING',
				redirectUri: spotifyConfig.redirectUri
			});
			
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

		// Handle Spotify OAuth callback
		if (req.url.startsWith("/auth/spotify/callback")) {
			const url = new URL(req.url, `http://localhost:3000`);
			const code = url.searchParams.get('code');
			const error = url.searchParams.get('error');

			if (error) {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(`
					<html><body>
						<h1>Authentication Error</h1>
						<p>Error: ${error}</p>
						<a href="/">Go back to app</a>
					</body></html>
				`);
				return;
			}

			if (code && spotifyService) {
				// Exchange code for tokens
				spotifyService.spotifyApi.authorizationCodeGrant(code).then(data => {
					spotifyService.spotifyApi.setAccessToken(data.body['access_token']);
					spotifyService.spotifyApi.setRefreshToken(data.body['refresh_token']);
					spotifyService.saveTokens(data.body['access_token'], data.body['refresh_token']);
					
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(`
						<html><body>
							<h1>Authentication Successful!</h1>
							<p>You can now close this window and return to the app.</p>
							<a href="/">Go to app</a>
						</body></html>
					`);
				}).catch(err => {
					console.error('Error exchanging code for tokens:', err);
					res.writeHead(500, { "Content-Type": "text/html" });
					res.end(`
						<html><body>
							<h1>Authentication Failed</h1>
							<p>Error: ${err.message}</p>
							<a href="/">Go back to app</a>
						</body></html>
					`);
				});
			} else {
				res.writeHead(400, { "Content-Type": "text/html" });
				res.end(`
					<html><body>
						<h1>Authentication Failed</h1>
						<p>No authorization code received</p>
						<a href="/">Go back to app</a>
					</body></html>
				`);
			}
			return;
		}

		// Handle button actions
		if (req.url.startsWith("/api/button/")) {
			const action = req.url.split("/api/button/")[1];
			if (buttonHandler && ['back', 'playpause', 'forward', 'togglescroll'].includes(action)) {
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
            height: 100vh;
            gap: 30px;
        }
        .controls {
            display: flex;
            gap: 30px;
            align-items: center;
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
        }
        button:hover {
            background-color: #555;
            transform: scale(1.1);
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
        }
        #loginButton:hover {
            background-color: #1ed760;
        }
        #authStatus {
            color: #888;
            font-size: 14px;
            font-family: Arial, sans-serif;
            display: none;
        }
        #scrollToggle {
            background-color: #444;
            opacity: 0.7;
        }
        #scrollToggle:hover {
            background-color: #666;
            opacity: 1;
        }
        #scrollToggle.active {
            background-color: #1DB954;
            opacity: 1;
        }
        .live-preview {
            image-rendering: pixelated;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
            transform: scale(3);
            transform-origin: center;
        }
    </style>
</head>
<body>
    <button id="loginButton" onclick="loginToSpotify()">Login to Spotify</button>
    <div id="authStatus">✓ Connected to Spotify</div>
    <div class="controls">
        <button onclick="sendButtonAction('back')">⏮</button>
        <button onclick="sendButtonAction('playpause')">⏯</button>
        <button onclick="sendButtonAction('forward')">⏭</button>
        <button id="scrollToggle" onclick="sendButtonAction('togglescroll')" title="Toggle text scrolling">▶</button>
    </div>
    <img id="liveFrame" class="live-preview" src="/frame.png">
    
    <script>
        // Track scroll button state
        let scrollActive = true; // Default ON

        // Check authentication status
        async function checkAuthStatus() {
            try {
                const response = await fetch('/api/auth/status');
                const data = await response.json();
                
                const loginButton = document.getElementById('loginButton');
                const authStatus = document.getElementById('authStatus');
                
                if (data.authenticated) {
                    loginButton.style.display = 'none';
                    authStatus.style.display = 'block';
                } else {
                    loginButton.style.display = 'block';
                    authStatus.style.display = 'none';
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        }

        // Login to Spotify
        function loginToSpotify() {
            window.location.href = '/auth/login';
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
                    
                    // Toggle visual state for scroll button
                    if (action === 'togglescroll') {
                        scrollActive = !scrollActive;
                        const scrollBtn = document.getElementById('scrollToggle');
                        if (scrollActive) {
                            scrollBtn.classList.add('active');
                            scrollBtn.textContent = '▶';
                        } else {
                            scrollBtn.classList.remove('active');
                            scrollBtn.textContent = '⏸';
                        }
                    }
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

        // Initialize
        checkAuthStatus();
        setInterval(checkAuthStatus, 30000); // Check auth status every 30 seconds
        updateLiveFrame();
        
        // Initialize scroll button state
        const scrollBtn = document.getElementById('scrollToggle');
        if (scrollBtn && scrollActive) {
            scrollBtn.classList.add('active');
        }
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
