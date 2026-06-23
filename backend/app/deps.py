import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import SessionLocal
import models
from security import decode_access_token

_bearer = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@dataclass
class AuthUser:
    id: int
    role: str
    email: str
    name: str | None = None


def _load_user(payload: dict, db: Session) -> AuthUser:
    role = payload.get("role")
    user_id = payload.get("sub")
    email = payload.get("email", "")

    if not role or user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role == "company":
        company = db.query(models.Company).filter(models.Company.id == user_id).first()
        if not company or company.email != email:
            raise HTTPException(status_code=401, detail="Account not found")
        return AuthUser(
            id=company.id,
            role="company",
            email=company.email,
            name=company.company_name,
        )

    if role == "employee":
        employee = db.query(models.Employee).filter(models.Employee.id == user_id).first()
        if not employee or employee.email != email:
            raise HTTPException(status_code=401, detail="Account not found")
        return AuthUser(
            id=employee.id,
            role="employee",
            email=employee.email,
            name=employee.name,
        )

    raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AuthUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return _load_user(payload, db)


def require_company(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "company":
        raise HTTPException(status_code=403, detail="Company access required")
    return user


def require_employee(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "employee":
        raise HTTPException(status_code=403, detail="Employee access required")
    return user
