# VeTool

A scrim organizer for CS2 and Valorant with realtime lobbies, captain picks, and map veto.

## Quick Start with Docker (Recommended)

The easiest way to run VeTool is using Docker:

```bash
# Start all services (database, Redis, API, web)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Access the application:**
- Web: http://localhost:3000
- API: http://localhost:5001
- API Health: http://localhost:5001/health

## Prerequisites

### Docker Setup
- Docker Desktop (includes docker-compose)
- 4GB+ RAM allocated to Docker

### Local Development Setup
- .NET 8 SDK
- PostgreSQL 16+
- Redis 7+
- Node 18+

## Docker Configuration

### Environment Variables

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

Key environment variables:
- `POSTGRES_*`: Database connection settings
- `REDIS_CONNECTION`: Redis connection string
- `JWT__Secret`: JWT signing secret (change in production!)
- `NEXT_PUBLIC_API_BASE`: API endpoint for web app

### Docker Services

The `docker-compose.yml` includes:
- **postgres**: PostgreSQL 16 database
- **redis**: Redis 7 for caching and SignalR backplane
- **api**: .NET 8 API backend (port 5001)
- **web**: Next.js frontend (port 3000)

## Development

### Using Docker (Recommended)

```bash
# Build images
docker compose build

# Start in development mode
docker compose up -d

# Watch API logs
docker compose logs -f api

# Watch web logs
docker compose logs -f web

# Restart a single service
docker compose restart api

# Run migrations manually (if needed)
docker compose exec api dotnet ef database update
```

### Local Development (Without Docker)

#### Database Setup

```bash
# Start PostgreSQL (via Docker for convenience)
docker run -d --name vetool-postgres \
  -e POSTGRES_DB=vetool \
  -e POSTGRES_USER=vetool \
  -e POSTGRES_PASSWORD=vetool_dev_password \
  -p 5432:5432 \
  postgres:16-alpine

# Start Redis
docker run -d --name vetool-redis -p 6379:6379 redis:7-alpine
```

#### Migrations

```bash
# Install EF Core tools
dotnet tool install --global dotnet-ef

# Add migration (if needed)
dotnet ef migrations add MigrationName -p apps/domain/VeTool.Domain.csproj -s apps/api/VeTool.Api.csproj

# Apply migrations
dotnet ef database update -p apps/domain/VeTool.Domain.csproj -s apps/api/VeTool.Api.csproj
```

#### Run API

```bash
dotnet run --project apps/api/VeTool.Api.csproj
# API available at http://localhost:5001
# Health: http://localhost:5001/health
```

#### Run Web

```bash
cd apps/web
npm install
npm run dev:local
# Web available at http://localhost:3000
```

## Testing

```bash
# Run all tests
dotnet test

# Run tests in Docker
docker compose exec api dotnet test
```

## Troubleshooting

### Port 5000 Already in Use
macOS uses port 5000 for AirPlay Receiver. The Docker setup uses port 5001 instead. If you need to change it, update `docker-compose.yml` and `.env.example`.

### Database Connection Failed
Ensure PostgreSQL is running and connection settings are correct:
```bash
docker compose logs postgres
```

### Redis Connection Failed
Check Redis is running:
```bash
docker compose logs redis
```

### Web App Can't Connect to API
Verify the API is running and `NEXT_PUBLIC_API_BASE` environment variable is set correctly.

## CI/CD

See `.gitlab-ci.yml` for GitLab CI/CD configuration. The pipeline includes:
- Building Docker images for API and web
- Running tests
- Deploying to staging/production

## License

MIT

