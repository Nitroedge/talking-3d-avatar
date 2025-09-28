# Talking Avatar - React Three.js Application

## Overview
This is a ThreeJS-powered virtual human being that uses Azure APIs for text-to-speech synthesis with realistic facial movements. The application creates a 3D avatar that can speak text input with synchronized mouth movements and expressions.

## Recent Changes (September 28, 2025)
- Imported from GitHub and configured for Replit environment
- Updated React development server configuration to bind to 0.0.0.0:5000
- Configured host verification bypass for Replit proxy environment
- Updated backend API host to use Replit domain instead of localhost
- Set up frontend workflow on port 5000
- Configured deployment settings for production (autoscale with serve)

## Project Architecture
- **Frontend**: React application with Three.js for 3D rendering
- **3D Engine**: @react-three/fiber and @react-three/drei for React Three.js integration
- **Audio**: react-audio-player for speech playback
- **Backend Communication**: Axios for API calls to text-to-speech service
- **Build System**: Create React App (react-scripts)

## Key Features
- 3D avatar with realistic facial animations
- Text-to-speech conversion with Azure Cognitive Services
- Morph target-based facial animation
- Real-time audio-visual synchronization
- Responsive web interface

## Dependencies
- React ecosystem (react, react-dom, react-scripts)
- Three.js and React Three Fiber (@react-three/fiber, @react-three/drei)
- Azure Speech SDK (microsoft-cognitiveservices-speech-sdk)
- Audio handling (react-audio-player)
- Utility libraries (axios, lodash)

## Development
- Development server runs on port 5000 with host 0.0.0.0
- Hot reloading enabled for development
- ESLint warnings present but non-critical

## Deployment
- Build: `npm run build` creates optimized production bundle
- Serve: Uses `serve` package to serve static files on port 5000
- Target: Autoscale deployment for stateless web application

## Known Limitations
- WebGL context creation may fail in headless environments (expected behavior)
- Requires backend service for text-to-speech functionality
- Azure Cognitive Services API key needed for full functionality

## Backend Dependency
This frontend requires a companion backend service for text-to-speech conversion. The backend API endpoint is configured to use the Replit domain environment.