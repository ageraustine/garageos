from sqlmodel import SQLModel, Session, create_engine
from contextlib import contextmanager
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)


def create_db_and_tables():
    """Create all tables - use Alembic migrations in production."""
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session():
    """Context manager for database sessions."""
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db():
    """FastAPI dependency for database sessions."""
    with Session(engine) as session:
        yield session
