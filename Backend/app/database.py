from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

Base = declarative_base()

def get_configured_engine():
    """Create and validate the configured database engine."""
    target_url = settings.DATABASE_URL
    is_sqlite = target_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}

    try:
        test_engine = create_engine(target_url, connect_args=connect_args)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[Database] Successfully connected to {target_url.split('@')[-1] if '@' in target_url else 'SQLite'}")
        return test_engine
    except Exception as e:
        raise RuntimeError(
            "Database connection failed. Check DATABASE_URL in Backend/.env and make sure "
            "PostgreSQL is running, the database exists, and the user/password are correct."
        ) from e

engine = get_configured_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
