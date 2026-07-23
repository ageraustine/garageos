# GarageOS Backend

FastAPI backend for GarageOS - trust infrastructure platform for auto-repair chains.

## Tech Stack

- **Python 3.11+**
- **FastAPI** - async web framework
- **SQLModel/SQLAlchemy** - ORM
- **PostgreSQL** - database
- **Alembic** - migrations
- **MinIO** - S3-compatible object storage
- **Daraja API** - M-Pesa payments
- **Africa's Talking** - SMS notifications

## Local Development

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Git

### Setup

```bash
# Clone repo
git clone git@github.com:ageraustine/garageos.git
cd garageos

# Start PostgreSQL & MinIO
docker compose up -d

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Production Deployment

### Server Requirements

- Ubuntu 22.04+
- 2GB+ RAM
- Docker & Docker Compose

### Initial Setup

```bash
# SSH into server
ssh user@your-server-ip

# Clone repo
git clone git@github.com:ageraustine/garageos.git
cd garageos

# Run server setup (installs Python, Docker, nginx, etc.)
cd backend/deploy
sudo ./setup-server.sh

# Start databases
cd ~/garageos
docker compose up -d

# Configure environment
cp backend/.env.example backend/.env
nano backend/.env  # Fill in production values

# Deploy backend
cd backend
./deploy/deploy.sh
```

### Setup Domain & SSL

```bash
# Add DNS A record pointing to your server IP first, then:
./deploy/setup-domain.sh api.yourdomain.com admin@yourdomain.com
```

### Deploy Updates

```bash
cd ~/garageos/backend
./deploy/deploy.sh
```

Or push to `main` branch for automatic deployment via GitHub Actions.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://garageos:garageos@localhost:5432/garageos` |
| `SECRET_KEY` | JWT signing key | `change-in-production` |
| `DEBUG` | Enable debug mode | `false` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000` |
| `MINIO_ENDPOINT` | MinIO server address | `localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `garageos` |
| `MINIO_SECRET_KEY` | MinIO secret key | `garageos-secret` |
| `MINIO_BUCKET` | Media bucket name | `garageos-media` |
| `FRONTEND_URL` | Frontend URL for magic links | `http://localhost:3000` |
| `MPESA_*` | M-Pesa Daraja API credentials | - |
| `AT_*` | Africa's Talking SMS credentials | - |

## Database

### Run Migrations

```bash
# Apply all migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"

# Rollback one migration
alembic downgrade -1

# Reset database
alembic downgrade base
alembic upgrade head
```

### Reset Database (Production)

```bash
# Stop backend first
sudo systemctl stop garageos-backend

# Drop and recreate
docker exec garageos-db psql -U garageos -d postgres -c "DROP DATABASE garageos WITH (FORCE);"
docker exec garageos-db psql -U garageos -d postgres -c "CREATE DATABASE garageos;"

# Run migrations
source venv/bin/activate
alembic upgrade head

# Restart backend
sudo systemctl start garageos-backend
```

## Common Commands

### Service Management

```bash
# Status
sudo systemctl status garageos-backend

# Restart
sudo systemctl restart garageos-backend

# View logs
sudo journalctl -u garageos-backend -f

# View last 100 lines
sudo journalctl -u garageos-backend -n 100
```

### Docker (Database & MinIO)

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Access PostgreSQL
docker exec -it garageos-db psql -U garageos

# Access MinIO console
# Open http://localhost:9001 (user: garageos, pass: garageos-secret)
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings
│   ├── database.py          # DB session
│   ├── models/              # SQLModel entities
│   ├── schemas/             # Pydantic models
│   ├── services/            # Business logic
│   ├── api/
│   │   ├── deps.py          # Dependencies
│   │   └── routes/          # API endpoints
│   └── core/
│       ├── security.py      # JWT, password hashing
│       └── exceptions.py    # Custom exceptions
├── alembic/                 # Database migrations
├── deploy/                  # Deployment scripts
│   ├── setup-server.sh      # Initial server setup
│   ├── setup-domain.sh      # Domain & SSL setup
│   ├── deploy.sh            # Deploy updates
│   └── garageos-backend.service
├── requirements.txt
├── .env.example
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new chain
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user

### Jobs
- `GET /api/v1/jobs` - List jobs
- `POST /api/v1/jobs` - Create job
- `GET /api/v1/jobs/{id}` - Job detail
- `PATCH /api/v1/jobs/{id}/status` - Update status

### Estimates
- `GET /api/v1/jobs/{id}/estimates/latest` - Get estimate
- `POST /api/v1/jobs/{id}/estimates` - Create estimate

### Media
- `POST /api/v1/jobs/{id}/media/upload-url` - Get upload URL
- `POST /api/v1/jobs/{id}/media` - Confirm upload
- `GET /api/v1/jobs/{id}/media` - List media

### Magic Link (Public)
- `GET /api/v1/link/{token}` - Job status for customer
- `POST /api/v1/link/{token}/estimate/approve` - Approve estimate
- `POST /api/v1/link/{token}/pay` - Initiate M-Pesa payment

### Marketplace
- `GET /api/v1/marketplace/listings` - Browse listings
- `POST /api/v1/marketplace/listings` - Create listing
- `GET /api/v1/marketplace/sellers` - List sellers

See full API documentation at `/docs` endpoint.

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u garageos-backend -n 50

# Check if port is in use
sudo lsof -i :8000

# Check database connection
docker exec garageos-db pg_isready -U garageos
```

### Database connection refused
```bash
# Check if container is running
docker ps

# Restart containers
docker compose down && docker compose up -d
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## License

Proprietary - All rights reserved.
