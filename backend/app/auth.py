import json
import urllib.request
import urllib.error

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
import models, schemas
from deps import AuthUser, get_current_user, get_db
from security import (
    create_access_token,
    generate_invite_code,
    hash_password,
    normalize_invite_code,
    verify_password,
)

router = APIRouter()


def _google_userinfo(access_token: str) -> dict:
    request = urllib.request.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _company_token(company: models.Company) -> str:
    return create_access_token(
        user_id=company.id,
        role="company",
        email=company.email,
    )


def _employee_token(employee: models.Employee) -> str:
    return create_access_token(
        user_id=employee.id,
        role="employee",
        email=employee.email,
    )


def _invalid_credentials():
    raise HTTPException(status_code=401, detail="Invalid email or password")


@router.get("/auth/me")
def auth_me(user: AuthUser = Depends(get_current_user)):
    if user.role == "employee":
        return {
            "role": "employee",
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }

    return {
        "role": "company",
        "id": user.id,
        "company": user.name,
        "email": user.email,
    }


@router.post("/signup")
def signup(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    email = company.email.strip().lower()

    existing = db.query(models.Company).filter(models.Company.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_name = db.query(models.Company).filter(
        models.Company.company_name == company.company_name.strip()
    ).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Company name already taken")

    new_company = models.Company(
        company_name=company.company_name.strip(),
        email=email,
        password=hash_password(company.password),
        invite_code=generate_invite_code(db),
    )

    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    return {
        "message": "Company created successfully",
        "access_token": _company_token(new_company),
        "token_type": "bearer",
        "company": new_company.company_name,
        "email": new_company.email,
    }


@router.post("/login")
def login(company: schemas.CompanyLogin, db: Session = Depends(get_db)):
    email = company.email.strip().lower()
    user = db.query(models.Company).filter(models.Company.email == email).first()

    if not user or not verify_password(company.password, user.password):
        _invalid_credentials()

    return {
        "message": "Login successful",
        "access_token": _company_token(user),
        "token_type": "bearer",
        "company": user.company_name,
        "email": user.email,
    }


@router.post("/employee/signup")
def employee_signup(
    employee: schemas.EmployeeSignup,
    db: Session = Depends(get_db),
):
    email = employee.email.strip().lower()
    company_code = normalize_invite_code(employee.company_code or "")

    invited = db.query(models.Employee).filter(
        models.Employee.email == email
    ).first()

    if invited:
        if invited.password:
            raise HTTPException(
                status_code=400,
                detail="Account already registered. Please sign in.",
            )

        invited.password = hash_password(employee.password)
        db.commit()
        db.refresh(invited)

        return {
            "message": "Employee account activated successfully",
            "access_token": _employee_token(invited),
            "token_type": "bearer",
            "employee": {
                "id": invited.id,
                "name": invited.name,
                "email": invited.email,
                "total_leaves": invited.total_leaves,
            },
        }

    if not company_code:
        raise HTTPException(
            status_code=400,
            detail="Enter your company invite code, or ask your admin to add your email first.",
        )

    company = db.query(models.Company).filter(
        models.Company.invite_code == company_code
    ).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid company invite code.")

    name = (employee.name or "").strip()
    if not name:
        raise HTTPException(
            status_code=400,
            detail="Full name is required when joining with a company code.",
        )

    new_employee = models.Employee(
        company_id=company.id,
        name=name,
        email=email,
        password=hash_password(employee.password),
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {
        "message": "Employee account created successfully",
        "access_token": _employee_token(new_employee),
        "token_type": "bearer",
        "employee": {
            "id": new_employee.id,
            "name": new_employee.name,
            "email": new_employee.email,
            "total_leaves": new_employee.total_leaves,
        },
    }


@router.post("/employee/login")
def employee_login(
    employee: schemas.EmployeeLogin,
    db: Session = Depends(get_db),
):
    email = employee.email.strip().lower()
    user = db.query(models.Employee).filter(models.Employee.email == email).first()

    if not user or not verify_password(employee.password, user.password):
        _invalid_credentials()

    return {
        "message": "Login successful",
        "access_token": _employee_token(user),
        "token_type": "bearer",
        "employee": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "total_leaves": user.total_leaves,
        },
    }


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

    if payload.role == "employee":
        user = db.query(models.Employee).filter(models.Employee.email == email).first()

        if not user:
            raise HTTPException(
                status_code=400,
                detail="This email was not added by a company admin. Ask your employer to add you first.",
            )

        return {
            "message": "Login successful",
            "access_token": _employee_token(user),
            "token_type": "bearer",
            "role": "employee",
            "employee": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "total_leaves": user.total_leaves,
            },
        }

    company = db.query(models.Company).filter(models.Company.email == email).first()

    if not company:
        company_name = name
        if db.query(models.Company).filter(
            models.Company.company_name == company_name
        ).first():
            company_name = f"{name} ({email})"

        company = models.Company(
            company_name=company_name,
            email=email,
            password="",
            invite_code=generate_invite_code(db),
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    return {
        "message": "Login successful",
        "access_token": _company_token(company),
        "token_type": "bearer",
        "role": "company",
        "company": company.company_name,
        "email": company.email,
    }
