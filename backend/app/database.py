from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./attendance.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema():
    """Apply lightweight SQLite migrations for existing databases."""
    inspector = inspect(engine)
    if "employees" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("employees")}
    if "company_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE employees ADD COLUMN company_id INTEGER"))
