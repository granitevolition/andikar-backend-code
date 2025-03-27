# Andikar Backend API

Backend API for the Andikar AI text humanizer service. This API provides endpoints for text humanization, AI detection, user management, and payment processing.

## Features

- **Text Humanization:** Convert AI-generated text to sound more natural and human-like
- **AI Detection:** Analyze text to determine if it was written by AI or a human
- **User Management:** Register, login, and manage user accounts
- **Plan Management:** Support for different pricing tiers with varying word limits
- **Payment Processing:** Simulated payment processing for plan upgrades
- **Usage Tracking:** Monitor and track API usage and text processing statistics

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/api-keys` - Update user's API keys

### Core Functionality

- `POST /echo_text` - Simple echo endpoint for testing
- `POST /humanize_text` - Humanize AI-generated text
- `POST /detect_ai` - Detect if text was written by AI
- `POST /payment` - Process payment for plan upgrade
- `GET /usage` - Get usage statistics for current user

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
4. Modify the `.env` file with your settings
5. Start the server:
   ```
   npm run dev
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| JWT_SECRET | Secret for JWT token generation | andikar-api-secret-key |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/andikar |
| ADMIN_API_URL | URL of the admin API | http://localhost:3001 |
| DEFAULT_MODEL | Default humanizer model | andikar-v1 |
| TEMPERATURE | Temperature parameter for text generation | 0.7 |
| HUMANIZER_API_KEY | API key for external humanizer service | sk-test-key |
| USE_EXTERNAL_API | Flag to use external API instead of local humanizer | false |
| NODE_ENV | Environment (development/production) | development |

## Integration with Other Components

### Andikar Frontend

The frontend connects to this API for user authentication, text humanization, and AI detection services.

### Admin Backend

This backend communicates with the admin backend for usage reporting and system monitoring.

## Deployment

This project is configured for deployment on Railway.com. The `package.json` includes the necessary configuration for Railway deployment.

## Security Considerations

- Set strong JWT secret in production
- Enable HTTPS in production
- Use secure MongoDB connection with authentication
- Implement proper input validation and sanitization
- Monitor rate limiting to prevent abuse

## License

This project is licensed under the MIT License.
