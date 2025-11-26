#  Flipboard Slack API

A modern Next.js application that integrates with Slack to allow users to upload and share GitHub repositories via slash commands. Features a React dashboard and a 3D gallery room to visualize uploaded repositories.

##  Features

- ** Slack Integration** - `/upload-flipboard` slash command to share GitHub repositories
- ** React Dashboard** - Beautiful UI to view upload history
- ** 3D Gallery Room** - Interactive 3D raycaster gallery displaying repositories as paintings
- ** GitHub Validation** - Automatic URL parsing and validation
- ** File-based Storage** - JSON file storage (keeps last 6 uploads)
- ** Flipdot Display** - 15 FPS flipdot display output module

## 📁 Project Structure

```
├── src/                              # Source code
│   ├── components/                   # React components
│   │   ├── ui/                      # Reusable UI components
│   │   └── dashboard/               # Dashboard components
│   ├── lib/                         # Utilities & business logic
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── api/                     # API utilities (GitHub, Slack)
│   │   └── storage/                 # Data storage functions
│   └── pages/                       # Next.js pages
│       ├── api/                     # API routes
│       ├── dashboard.tsx            # Dashboard page
│       └── index.tsx                # Homepage
├── public/                          # Static assets
│   └── gallery/                     # 3D Gallery Room
│       ├── room.html                # Gallery HTML
│       └── js/                      # Gallery JavaScript files
├── modules/                         # Separate modules
│   └── flipdot-display/             # Flipdot display module (15 FPS)
├── data/                            # Data storage (auto-created)
│   └── uploads.json                 # Upload history
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Slack workspace with admin access
- (Optional) GitHub personal access token

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```env
# Optional: For enhanced GitHub API features
GITHUB_TOKEN=your_github_token_here
```

**Note:** The app works without a GitHub token, but some features may be limited.

### 3. Run Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 4. Available Routes

**Frontend Pages:**
- `http://localhost:3000/` - Homepage
- `http://localhost:3000/dashboard` - Upload dashboard
- `http://localhost:3000/gallery/room.html` - 3D Gallery Room

**API Endpoints:**
- `GET /api` - API information
- `GET /api/health` - Health check
- `GET /api/uploads` - Get all uploads (JSON)
- `POST /api/slack/events` - Slack slash command handler

##  Slack Integration

### 1. Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy and paste the contents of `app-manifest.json` (if available)
5. Click "Create"
6. Install the app to your workspace

### 2. Configure Slack App

1. Go to "OAuth & Permissions" in your Slack app settings
2. Copy the "Bot User OAuth Token" (if needed)
3. Go to "Basic Information" and copy the "Signing Secret" (if needed)
4. Go to "Slash Commands" and set the Request URL:
   - **Local development:** Use ngrok: `https://your-ngrok-url.ngrok.io/api/slack/events`
   - **Production:** `https://your-domain.com/api/slack/events`

### 3. Local Testing with ngrok

1. Install ngrok: `npm install -g ngrok`
2. Start your local server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Update your Slack app's Request URL: `https://abc123.ngrok.io/api/slack/events`

### 4. Usage

In any Slack channel where the app is installed:

```
/upload-flipboard https://github.com/user/repo
```

Or with branch/path:
```
/upload-flipboard https://github.com/user/repo/tree/branch/path
```

Or with @mention format:
```
/upload-flipboard @https://github.com/user/repo
```

### Supported GitHub URL Formats

- `https://github.com/user/repo`
- `https://github.com/user/repo/tree/branch`
- `https://github.com/user/repo/tree/branch/path/to/folder`

##  3D Gallery Room

The 3D Gallery Room is an interactive raycaster-based gallery that displays uploaded GitHub repositories as paintings on the walls.

### Access

Navigate to: `http://localhost:3000/gallery/room.html`

### Controls

- **WASD** - Move around the room
- **Mouse** - Look around
- **Click paintings** - Open GitHub repository in new tab

### Features

- Real-time data loading from `/api/uploads` endpoint
- Interactive paintings with clickable links
- Black and white flipboard aesthetic
- Minimap display for navigation

## 📊 Dashboard

The React dashboard provides a clean interface to view all uploaded repositories.

### Features

- Total uploads counter
- Recent uploads list (last 5)
- Repository information (branch, user, timestamp)
- Direct links to GitHub repositories
- Responsive design

## 🔧 Configuration

### Next.js Configuration

The `next.config.js` file includes:
- CORS headers for API routes
- Base path configuration for production
- URL rewriting rules

### TypeScript Configuration

The `tsconfig.json` includes:
- Path aliases (`@/*` → `./src/*`)
- Strict type checking
- Next.js plugin support

##  Production Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Update Slack App URL:**
   ```
   https://your-app.vercel.app/api/slack/events
   ```

### Option 2: Traditional Hosting

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Configure reverse proxy** (nginx/apache) to point to Next.js server on port 3000

### Option 3: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

##  Modules

### Flipdot Display Module

Located in `modules/flipdot-display/`, this module provides:
- 15 FPS flipdot display output
- Canvas-based rendering
- Real-time preview server
- PNG frame export

See `modules/flipdot-display/README.md` for details.

##  Testing

### API Testing

Test endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3000/api/health

# Get uploads
curl http://localhost:3000/api/uploads

# Test Slack endpoint (POST)
curl -X POST http://localhost:3000/api/slack/events \
  -H "Content-Type: application/json" \
  -d '{"command":"/upload-flipboard","text":"https://github.com/user/repo"}'
```

##  Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. **TypeScript path alias errors:**
   - Ensure `tsconfig.json` has correct path aliases
   - Restart your IDE/editor

3. **Slack not receiving responses:**
   - Verify URL is publicly accessible (use ngrok for local)
   - Check CORS headers are set correctly
   - Ensure POST method is allowed

4. **Gallery not loading data:**
   - Check browser console for errors
   - Verify `/api/uploads` endpoint is accessible
   - Check CORS settings

## 📝 API Reference

### GET /api

Returns server information and available endpoints.

**Response:**
```json
{
  "message": "Flipboard Slack API Server",
  "status": "Running",
  "endpoints": {
    "health": "/api/health",
    "slack_events": "/api/slack/events",
    "dashboard": "/dashboard",
    "uploads": "/api/uploads"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/uploads

Returns all uploads.

**Response:**
```json
{
  "total": 3,
  "uploads": [
    {
      "id": "abc123",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "github_url": "https://github.com/user/repo",
      "repository": "user/repo",
      "branch": "main",
      "path": "",
      "slack_user": "username",
      "slack_channel": "general"
    }
  ]
}
```

### POST /api/slack/events

Handles Slack slash commands.

**Request Body:**
```json
{
  "command": "/upload-flipboard",
  "text": "https://github.com/user/repo",
  "user_name": "username",
  "channel_name": "general"
}
```

**Response:**
```json
{
  "text": "🎮 Flipboard Upload Successful!",
  "blocks": [...]
}
```

##  Security Notes

- Never commit `.env` files or secrets to git
- Use environment variables for sensitive data
- Validate all GitHub URLs before processing
- Implement rate limiting for production use
- Use HTTPS in production

## 📄 License

MIT License

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues and questions, please open an issue on the repository.

---

**Built with Next.js, React, TypeScript, and Three.js**
