from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./attendance.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    if "employees" in table_names:
        columns = {col["name"] for col in inspector.get_columns("employees")}
        if "company_id" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE employees ADD COLUMN company_id INTEGER")
                )

    if "companies" in table_names:
        columns = {col["name"] for col in inspector.get_columns("companies")}
        if "invite_code" not in columns:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE companies ADD COLUMN invite_code VARCHAR")
                )


def ensure_company_invite_codes():
    import models
    from security import generate_invite_code

    db = SessionLocal()
    try:
        companies = db.query(models.Company).filter(
            (models.Company.invite_code.is_(None))
            | (models.Company.invite_code == "")
        ).all()

        for company in companies:
            company.invite_code = generate_invite_code(db)

        if companies:
            db.commit()
    finally:
        db.close()
