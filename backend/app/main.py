from datetime import datetime, date

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import router as auth_router
from database import engine, Base, SessionLocal, run_migrations, ensure_company_invite_codes
import models, schemas
from deps import AuthUser, get_current_user, get_db, require_company, require_employee
from security import normalize_invite_code


Base.metadata.create_all(bind=engine)
run_migrations()
ensure_company_invite_codes()

app = FastAPI()

app.include_router(auth_router, tags=["auth"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Attendance API Running"}


@app.get("/invite/validate", tags=["invite"])
def validate_invite_code(code: str, db: Session = Depends(get_db)):
    normalized = normalize_invite_code(code)
    if not normalized:
        raise HTTPException(status_code=400, detail="Invite code is required")

    company = db.query(models.Company).filter(
        models.Company.invite_code == normalized
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="Invalid company invite code")

    return {
        "valid": True,
        "company_name": company.company_name,
        "invite_code": company.invite_code,
    }


@app.get("/company/invite", tags=["company"])
def get_company_invite(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_company),
):
    company = db.query(models.Company).filter(models.Company.id == user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not company.invite_code:
        from security import generate_invite_code

        company.invite_code = generate_invite_code(db)
        db.commit()
        db.refresh(company)

    return {
        "company_name": company.company_name,
        "invite_code": company.invite_code,
    }


def _company_employees_query(db: Session, company_id: int):
    return db.query(models.Employee).filter(
        models.Employee.company_id == company_id
    )


def _get_company_employee(db: Session, company_id: int, employee_id: int):
    employee = _company_employees_query(db, company_id).filter(
        models.Employee.id == employee_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


def _employee_registered(employee: models.Employee) -> bool:
    return bool(employee.password)


@app.get("/employees", tags=["employee"])
def get_employees(
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_company),
):
    employees = _company_employees_query(db, user.id).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "registered": _employee_registered(e),
        }
        for e in employees
    ]


@app.post("/employees", tags=["employee"])
def create_employee(
    emp: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_company),
):
    email = emp.email.strip().lower()

    existing = db.query(models.Employee).filter(
        models.Employee.email == email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_employee = models.Employee(
        company_id=user.id,
        name=emp.name.strip(),
        email=email,
        password="",
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {
        "id": new_employee.id,
        "name": new_employee.name,
        "email": new_employee.email,
        "registered": False,
    }


@app.post("/attendance", tags=["attendance"])
def mark_attendance(
    att: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_company),
):
    employee = _get_company_employee(db, user.id, att.employee_id)

    new_att = models.Attendance(
        name=str(att.employee_id),
        status=att.status,
    )

    db.add(new_att)
    db.commit()
    db.refresh(new_att)

    return {
        "message": "Attendance Marked",
        "data": new_att,
    }


@app.get("/attendance", tags=["attendance"])
def get_attendance(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    query = db.query(models.Attendance)

    if user.role == "employee":
        query = query.filter(models.Attendance.name == str(user.id))
    else:
        employee_ids = [
            str(e.id)
            for e in _company_employees_query(db, user.id).all()
        ]
        if not employee_ids:
            return []
        query = query.filter(models.Attendance.name.in_(employee_ids))

    return query.all()


def _resolve_employee_name(employee_id: int, db: Session) -> str:
    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    return emp.name if emp else f"Employee #{employee_id}"


def _leave_days(start_date: str, end_date: str) -> int:
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        days = (end - start).days + 1
        return days if days > 0 else 0
    except (ValueError, TypeError):
        return 0


@app.post("/leaves", tags=["leave"])
def apply_leave(
    leave: schemas.LeaveCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_employee),
):
    new_leave = models.Leave(
        employee_id=user.id,
        employee_name=_resolve_employee_name(user.id, db),
        reason=leave.reason.strip(),
        start_date=leave.start_date,
        end_date=leave.end_date,
        status="Pending",
        applied_at=datetime.utcnow().isoformat(),
    )

    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return {
        "message": "Leave applied",
        "data": new_leave,
    }


@app.get("/leaves", tags=["leave"])
def get_leaves(
    status: str | None = None,
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    query = db.query(models.Leave)

    if user.role == "employee":
        query = query.filter(models.Leave.employee_id == user.id)
    else:
        employee_ids = [
            e.id for e in _company_employees_query(db, user.id).all()
        ]
        if not employee_ids:
            return []
        query = query.filter(models.Leave.employee_id.in_(employee_ids))

    if status:
        query = query.filter(models.Leave.status == status)

    return query.order_by(models.Leave.id.desc()).all()


@app.patch("/leaves/{leave_id}", tags=["leave"])
def update_leave_status(
    leave_id: int,
    update: schemas.LeaveStatusUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_company),
):
    leave = db.query(models.Leave).filter(
        models.Leave.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    _get_company_employee(db, user.id, leave.employee_id)

    valid_statuses = {"Approved", "Rejected", "Pending"}
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of: Approved, Rejected, Pending",
        )

    leave.status = update.status
    db.commit()
    db.refresh(leave)

    return {
        "message": f"Leave {update.status.lower()}",
        "data": leave,
    }


@app.get("/employees/{employee_id}/summary", tags=["employee"])
def employee_summary(
    employee_id: int,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(get_current_user),
):
    if user.role == "employee" and user.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if user.role == "company":
        employee = _get_company_employee(db, user.id, employee_id)
    else:
        employee = db.query(models.Employee).filter(
            models.Employee.id == employee_id
        ).first()

        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    total = employee.total_leaves or 0

    approved = db.query(models.Leave).filter(
        models.Leave.employee_id == employee_id,
        models.Leave.status == "Approved",
    ).all()

    pending = db.query(models.Leave).filter(
        models.Leave.employee_id == employee_id,
        models.Leave.status == "Pending",
    ).count()

    used = sum(_leave_days(lv.start_date, lv.end_date) for lv in approved)
    remaining = total - used

    return {
        "employee_id": employee_id,
        "name": employee.name,
        "total_leaves": total,
        "used_leaves": used,
        "remaining_leaves": remaining if remaining > 0 else 0,
        "pending_requests": pending,
    }
