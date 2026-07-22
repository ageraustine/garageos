# GarageOS

Trust infrastructure platform for multi-branch auto-repair chains in East Africa.

> Trust, measured at the moment of work, shown to the customer instantly, and aggregated up to the brand in real time.

## Overview

GarageOS provides end-to-end garage management with real-time customer transparency. Customers receive a magic link via WhatsApp/SMS to track their vehicle's repair progress, view estimates, approve work, and pay via M-Pesa—all without installing an app.

### Key Features

- **Magic Link** - Customers track repairs via a lightweight web page (no app install)
- **Trust Score** - Computed from estimate accuracy, verification rate, timeliness, and quality
- **Job Workflow** - intake → diagnosis → working → washing → ready → paid
- **Service Stages** - Granular progress tracking per service
- **M-Pesa Integration** - STK Push payments and B2C salary disbursement
- **HR Module** - Salaries, payroll, attendance, leave, performance reviews
- **Multi-branch** - HQ visibility across all locations

## Tech Stack

### Backend
- Python 3.11+
- FastAPI + Pydantic
- SQLModel/SQLAlchemy + PostgreSQL
- Alembic migrations
- MinIO (S3-compatible storage)
- Safaricom Daraja API (M-Pesa)

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Framer Motion

## Project Structure

```
garageos/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # API endpoints
│   │   ├── models/           # SQLModel entities
│   │   ├── schemas/          # Pydantic models
│   │   ├── services/         # Business logic
│   │   └── core/             # Security, config
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   ├── components/       # UI components
│   │   ├── hooks/            # React hooks
│   │   └── lib/              # API client, utils
│   └── package.json
└── docs/
    ├── PRD.md                # Product requirements
    ├── specs/                # Epic specifications
    └── architecture/         # Data model, API contracts
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- MinIO (or S3-compatible storage)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database and M-Pesa credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with API URL

# Start development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/garageos
SECRET_KEY=your-secret-key
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...
MPESA_CALLBACK_URL=https://your-domain.com/api/v1/mpesa/callback
MPESA_ENVIRONMENT=sandbox
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Key Workflows

### Customer Journey
1. Vehicle arrives at branch
2. Advisor creates job, selects services
3. Customer receives magic link via WhatsApp/SMS
4. Mechanic updates progress, uploads photos/voice notes
5. Customer views real-time progress
6. Customer approves estimate (selects optional items)
7. Work completed, customer pays via M-Pesa
8. Trust Score updated based on job metrics

### Trust Score Signals
| Signal | Weight | Description |
|--------|--------|-------------|
| Estimate Accuracy | 35% | Final paid vs approved estimate |
| Verification Rate | 25% | Line items with customer-viewed media |
| Timeliness | 20% | Actual ready vs promised time |
| Quality | 20% | Comeback rate within warranty |

## License

Proprietary - All rights reserved.
