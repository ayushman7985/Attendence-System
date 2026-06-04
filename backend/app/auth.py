from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

try:
    from .database import SessionLocal
    from . import models, schemas
    from .security import hash_password, verify_password
except ImportError:
    from database import SessionLocal
    import models, schemas
    from security import hash_password, verify_password

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/signup")
def signup(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Company).filter(
        models.Company.email == company.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_company = models.Company(
        company_name=company.company_name,
        email=company.email,
        password=hash_password(company.password),
    )

    db.add(new_company)
    db.commit()

    return {"message": "Company created successfully"}


@router.post("/login")
def login(company: schemas.CompanyLogin, db: Session = Depends(get_db)):
    user = db.query(models.Company).filter(
        models.Company.email == company.email
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email")

    if not verify_password(company.password, user.password):
        raise HTTPException(status_code=400, detail="Wrong password")

    return {
        "message": "Login successful",
        "company": user.company_name,
    }
