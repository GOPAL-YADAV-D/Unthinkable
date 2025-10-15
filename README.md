# 🎯 AI-Powered Productivity Dashboard

A modern, intelligent productivity dashboard that helps you manage goals and tasks with AI-powered subtask generation. Built with Next.js, Node.js, PostgreSQL, and Google Gemini AI.

![Dashboard Preview](./docs/dashboard-preview.png)

## ✨ Features

### AI-Powered Goal Management
- **Smart Subtask Generation**: Describe your goal and get AI-generated, actionable subtasks
- **Intelligent Breakdown**: AI analyzes goal complexity, priority, and timeline to create optimal task structures
- **Context-Aware Suggestions**: Takes into account team size, skill level, and available resources

### nteractive Dashboard
- **Visual Progress Tracking**: Real-time progress bars showing completion percentage
- **Calendar Integration**: Date-based goal organization with calendar view
- **Dynamic Status Updates**: Goals automatically marked as completed when all subtasks are done
- **Priority Management**: High, Medium, and Low priority classification with visual indicators

### dvanced Task Management
- **Subtask Toggle**: Click checkboxes to mark tasks complete/incomplete
- **Auto Goal Completion**: Goals automatically transition between active and completed states
- **Team Collaboration**: Assign team members and track collective progress
- **Platform Tags**: Organize goals by platform or category

### Secure Authentication
- **JWT-based Authentication**: Secure user sessions with access and refresh tokens
- **User Management**: Registration, login, and profile management
- **Protected Routes**: API endpoints secured with middleware authentication

### Robust Data Management
- **PostgreSQL Database**: Reliable data persistence with Prisma ORM
- **Real-time Sync**: Changes reflect immediately across all clients
- **Offline Fallback**: Graceful degradation when backend is unavailable
- **Data Validation**: Comprehensive input validation and error handling

## Tech Stack

### Frontend
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible UI components
- **SWR** - Data fetching with caching and revalidation
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Prisma** - Modern database toolkit and ORM
- **PostgreSQL** - Robust relational database
- **JWT** - JSON Web Tokens for authentication
- **Winston** - Professional logging
- **Helmet** - Security middleware

### AI Integration
- **Google Gemini AI** - Advanced language model for subtask generation
- **Intelligent Prompting** - Context-aware AI prompts for optimal results
- **Fallback Systems** - Graceful degradation when AI is unavailable

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or pnpm
- Google Gemini API key (optional, has fallback)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/productivity-dashboard.git
   cd productivity-dashboard
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Setup environment variables**
   
   **Frontend (.env.local):**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

   **Backend (.env):**
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/productivity_dashboard"
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Google Gemini AI (optional)
   GEMINI_API_KEY=your-gemini-api-key-here
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # CORS
   CORS_ORIGIN=http://localhost:3000
   
   # Rate Limiting
   LLM_RATE_LIMIT_WINDOW_MS=900000
   LLM_RATE_LIMIT_MAX=20
   ```

5. **Setup PostgreSQL database**
   ```bash
   # Create database
   sudo -u postgres psql
   CREATE DATABASE productivity_dashboard;
   CREATE USER your_username WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE productivity_dashboard TO your_username;
   \q
   ```

6. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

7. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

8. **Start the development servers**
   
   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```

9. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Usage Guide

### Creating Your First Goal

1. **Click the "+" button** in the bottom right corner
2. **Enter a goal title** (e.g., "Launch Product MVP")
3. **Describe your goal** in the chat interface
4. **Watch AI generate subtasks** with estimated hours and dependencies
5. **Save the goal** to add it to your dashboard

### Managing Tasks

- **Toggle subtasks** by clicking the checkbox next to each item
- **Track progress** with the visual progress bar
- **View goal status** - automatically updates when all subtasks complete
- **Navigate dates** using the calendar sidebar

### Team Collaboration

- **Assign team members** when creating goals
- **Add platform tags** to organize by project or category
- **Set priorities** to focus on what matters most
- **Share progress** with real-time updates

## API Reference

### Authentication Endpoints
```
POST /api/auth/register    # Create new account
POST /api/auth/login       # Login user
POST /api/auth/refresh     # Refresh access token
POST /api/auth/logout      # Logout user
```

### Goal Management
```
GET    /api/goals                           # Get all goals
POST   /api/goals                           # Create new goal
GET    /api/goals/:id                       # Get specific goal
PUT    /api/goals/:id                       # Update goal
DELETE /api/goals/:id                       # Delete goal
GET    /api/goals/date/:date                # Get goals by date
GET    /api/goals/stats                     # Get dashboard statistics
```

### Subtask Management
```
POST /api/goals/:goalId/subtasks             # Add subtask to goal
PUT  /api/goals/:goalId/subtasks/:subtaskId  # Update subtask
PUT  /api/goals/subtasks/:subtaskId/toggle   # Toggle subtask completion
```

### AI Integration
```
POST /api/llm/generate-subtasks  # Generate AI subtasks
GET  /api/llm/status             # Check AI service status
```

## Project Structure

```
productivity-dashboard/
├── app/                      # Next.js App Router pages
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Dashboard home page
│   ├── login/               # Authentication pages
│   └── signup/
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── goal-card.tsx        # Goal display component
│   ├── new-task-composer.tsx # AI goal creation
│   ├── sidebar.tsx          # Navigation sidebar
│   └── calendar.tsx         # Date picker calendar
├── hooks/                   # Custom React hooks
│   ├── use-goals.ts         # Goal management logic
│   ├── use-auth.tsx         # Authentication context
│   └── use-toast.ts         # Toast notifications
├── lib/                     # Utility libraries
│   ├── api.ts               # API client functions
│   ├── goal-utils.ts        # Data transformation utilities
│   └── utils.ts             # General utilities
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Backend utilities
│   │   └── app.js          # Express application
│   ├── prisma/             # Database schema and migrations
│   │   ├── schema.prisma   # Prisma schema definition
│   │   ├── migrations/     # Database migration files
│   │   └── seed.js         # Database seeding script
│   └── logs/               # Application logs
└── types.ts                # TypeScript type definitions
```

## Testing

### Backend Tests
```bash
cd backend
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
```

### Frontend Tests
```bash
npm test           # Run React tests
```

## Database Schema

### Core Tables
- **Users**: User accounts and authentication
- **Goals**: Main goal entities with metadata
- **Subtasks**: Individual tasks within goals
- **Projects**: Goal organization and grouping
- **Platform Tags**: Categorization and filtering

### Key Relationships
- Users → Goals (one-to-many)
- Goals → Subtasks (one-to-many)
- Goals → Projects (many-to-one)
- Goals ↔ Platform Tags (many-to-many)

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel, Netlify, or your preferred platform
```

### Backend (Railway, Heroku, etc.)
```bash
# Set environment variables
# Run database migrations
npm run db:migrate
npm start
```

### Database (PostgreSQL)
- Set up managed PostgreSQL instance
- Run migrations: `npx prisma migrate deploy`
- Update DATABASE_URL environment variable

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

