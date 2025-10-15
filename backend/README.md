# Productivity Dashboard Backend

A Node.js/Express backend API with LLM integration for intelligent goal and task management.

## Features

- 🎯 Goal and task management
- 🤖 AI-powered task generation using LLM
- 🔐 JWT-based authentication
- 📊 Real-time updates with WebSockets
- 🗄️ PostgreSQL database with Prisma ORM
- 📈 Analytics and insights
- 🚀 Redis caching for performance
- 📝 Comprehensive logging
- ⚡ Rate limiting and security

## Tech Stack

- **Framework**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + bcrypt
- **LLM Integration**: OpenAI API / Anthropic Claude
- **Caching**: Redis
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Logging**: Winston

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. Clone the repository:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key for LLM | No |
| `ANTHROPIC_API_KEY` | Anthropic API key for LLM | No |
| `REDIS_URL` | Redis connection string | No |
| `CORS_ORIGIN` | Frontend URL for CORS | No |

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Goals (Coming Soon)
- `GET /api/goals` - Get user goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### LLM Integration (Coming Soon)
- `POST /api/llm/generate-subtasks` - Generate subtasks using AI
- `POST /api/llm/optimize-title` - Optimize goal title
- `POST /api/llm/suggest-priority` - Suggest priority level

## Development

### Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models (Prisma)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── app.js          # Main application file
├── prisma/             # Database schema and migrations
├── tests/              # Test files
├── logs/               # Log files (auto-generated)
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities:

- **Users**: User accounts and authentication
- **Goals**: Main goals/objectives
- **Subtasks**: Actionable tasks for each goal
- **Projects**: Goal organization
- **Platform Tags**: Categorization tags
- **Team Members**: Collaboration features
- **LLM Conversations**: AI interaction history

## LLM Integration

The backend supports multiple LLM providers:

1. **OpenAI GPT-4**: Primary provider for task generation
2. **Anthropic Claude**: Fallback provider
3. **Caching**: Responses cached for efficiency
4. **Rate Limiting**: Prevents API quota exhaustion

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=auth
```

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t productivity-backend .

# Run container
docker run -p 3001:3001 --env-file .env productivity-backend
```

### Manual Deployment

1. Set `NODE_ENV=production`
2. Install production dependencies: `npm ci --only=production`
3. Run database migrations: `npm run db:migrate`
4. Start the server: `npm start`

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT token authentication
- Password hashing with bcrypt
- Input validation with Zod
- SQL injection prevention with Prisma

## Monitoring

- Winston logging to files and console
- Request/response logging
- Error tracking and alerting
- Performance metrics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.