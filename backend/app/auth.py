import json
import urllib.request
import urllib.error

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


# Verify a Google access token by fetching the user's profile from Google.
# Returns the verified profile dict (email, name, ...) or raises.
def _google_userinfo(access_token: str) -> dict:
    request = urllib.request.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


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


# EMPLOYEE SIGNUP
@router.post("/employee/signup")
def employee_signup(
    employee: schemas.EmployeeSignup,
    db: Session = Depends(get_db)
):
    existing = db.query(models.Employee).filter(
        models.Employee.email == employee.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_employee = models.Employee(
        name=employee.name,
        email=employee.email,
        password=hash_password(employee.password),
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {"message": "Employee created successfully"}


# EMPLOYEE LOGIN
@router.post("/employee/login")
def employee_login(
    employee: schemas.EmployeeLogin,
    db: Session = Depends(get_db)
):
    user = db.query(models.Employee).filter(
        models.Employee.email == employee.email
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email")

    if not verify_password(employee.password, user.password):
        raise HTTPException(status_code=400, detail="Wrong password")

    return {
        "message": "Login successful",
        "employee": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "total_leaves": user.total_leaves,
        },
    }


# GOOGLE SIGN IN / SIGN UP (for both company and employee)
@router.post("/auth/google")
def google_auth(payload: schemas.GoogleAuth, db: Session = Depends(get_db)):
    try:
        info = _google_userinfo(payload.access_token)
    except (urllib.error.URLError, ValueError):
        raise HTTPException(status_code=401, detail="Could not verify Google account")

    email = (info.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    if info.get("email_verified") not in (True, "true", None):
        raise HTTPException(status_code=400, detail="Google email is not verified")

    name = info.get("name") or email.split("@")[0]

    # EMPLOYEE
    if payload.role == "employee":
        user = db.query(models.Employee).filter(
            models.Employee.email == email
        ).first()

        if not user:
            user = models.Employee(name=name, email=email, password="")
            db.add(user)
            db.commit()
            db.refresh(user)

        return {
            "message": "Login successful",
            "role": "employee",
            "employee": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "total_leaves": user.total_leaves,
            },
        }

    # COMPANY
    company = db.query(models.Company).filter(
        models.Company.email == email
    ).first()

    if not company:
        # Ensure company_name is unique
        company_name = name
        if db.query(models.Company).filter(
            models.Company.company_name == company_name
        ).first():
            company_name = f"{name} ({email})"

        company = models.Company(
            company_name=company_name,
            email=email,
            password="",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    return {
        "message": "Login successful",
        "role": "company",
        "company": company.company_name,
        "email": company.email,
    }
