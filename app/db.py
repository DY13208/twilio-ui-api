from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings


connect_args = {}
if settings.database_url.startswith("mysql"):
    connect_args["connect_timeout"] = settings.db_connect_timeout_seconds

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
