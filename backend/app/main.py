from datetime import datetime, date

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# AUTH ROUTER
try:
    from .auth import router as auth_router, CurrentUser, get_current_user, require_company
except ImportError:
    from auth import router as auth_router, CurrentUser, get_current_user, require_company

# DATABASE + MODELS
try:
    # Package-style imports
    from .database import engine, Base, SessionLocal, ensure_schema
    from . import models, schemas
except ImportError:
    # Module-style imports
    from database import engine, Base, SessionLocal, ensure_schema
    import models, schemas


ensure_schema()
Base.metadata.create_all(bind=engine)

app = FastAPI()

# INCLUDE AUTH ROUTES
app.include_router(auth_router, tags=["auth"])

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Home Route
@app.get("/")
def home():
    return {"message": "Attendance API Running"}


# Helper: employees belonging to a company
def _company_employees(db: Session, company_id: int):
    return db.query(models.Employee).filter(
        models.Employee.company_id == company_id
    )


def _company_employee_ids(db: Session, company_id: int) -> list[int]:
    return [e.id for e in _company_employees(db, company_id).all()]


def _employee_belongs_to_company(
    db: Session, employee_id: int, company_id: int
) -> bool:
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id,
        models.Employee.company_id == company_id,
    ).first()
    return employee is not None


# Get Employees
@app.get("/employees", tags=["employee"])
def get_employees(
    db: Session = Depends(get_db),
    company: CurrentUser = Depends(require_company),
):
    employees = _company_employees(db, company.id).all()
    return [
        {"id": e.id, "name": e.name, "email": e.email}
        for e in employees
    ]


# Create Employee (without login credentials)
@app.post("/employees", tags=["employee"])
def create_employee(
    emp: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    company: CurrentUser = Depends(require_company),
):
    existing = db.query(models.Employee).filter(
        models.Employee.email == emp.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_employee = models.Employee(
        name=emp.name,
        email=emp.email,
        password="",
        company_id=company.id,
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return {"id": new_employee.id, "name": new_employee.name, "email": new_employee.email}


# Mark Attendance
@app.post("/attendance", tags=["attendance"])
def mark_attendance(
    att: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    company: CurrentUser = Depends(require_company),
):
    if not _employee_belongs_to_company(db, att.employee_id, company.id):
        raise HTTPException(status_code=403, detail="Employee not in your company")

    new_att = models.Attendance(
        name=str(att.employee_id),
        status=att.status
    )

    db.add(new_att)
    db.commit()
    db.refresh(new_att)

    return {
        "message": "Attendance Marked",
        "data": new_att
    }


# Get Attendance (optionally filter by employee)
@app.get("/attendance", tags=["attendance"])
def get_attendance(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role == "employee":
        employee_id = user.id
    elif user.role != "company":
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(models.Attendance)

    if user.role == "company":
        company_ids = _company_employee_ids(db, user.id)
        if not company_ids:
            return []
        query = query.filter(models.Attendance.name.in_([str(i) for i in company_ids]))

    if employee_id is not None:
        # Attendance stores the employee id in the "name" column as a string
        query = query.filter(models.Attendance.name == str(employee_id))

    return query.all()


# Helper: resolve an employee name from the database
def _resolve_employee_name(employee_id: int, db: Session) -> str:
    emp = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    return emp.name if emp else f"Employee #{employee_id}"


# Helper: number of inclusive days in a leave (YYYY-MM-DD strings)
def _leave_days(start_date: str, end_date: str) -> int:
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        days = (end - start).days + 1
        return days if days > 0 else 0
    except (ValueError, TypeError):
        return 0


# Apply for Leave
@app.post("/leaves", tags=["leave"])
def apply_leave(
    leave: schemas.LeaveCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role != "employee" or leave.employee_id != user.id:
        raise HTTPException(status_code=403, detail="Employees can only apply leave for themselves")

    new_leave = models.Leave(
        employee_id=leave.employee_id,
        employee_name=_resolve_employee_name(leave.employee_id, db),
        reason=leave.reason,
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


# Get Leave History (optionally filter by status and/or employee)
@app.get("/leaves", tags=["leave"])
def get_leaves(
    status: str | None = None,
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role == "employee":
        employee_id = user.id
    elif user.role != "company":
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(models.Leave)

    if user.role == "company":
        company_ids = _company_employee_ids(db, user.id)
        if not company_ids:
            return []
        query = query.filter(models.Leave.employee_id.in_(company_ids))

    if status:
        query = query.filter(models.Leave.status == status)

    if employee_id is not None:
        query = query.filter(models.Leave.employee_id == employee_id)

    return query.order_by(models.Leave.id.desc()).all()


# Approve / Reject a Leave
@app.patch("/leaves/{leave_id}", tags=["leave"])
def update_leave_status(
    leave_id: int,
    update: schemas.LeaveStatusUpdate,
    db: Session = Depends(get_db),
    company: CurrentUser = Depends(require_company),
):
    leave = db.query(models.Leave).filter(
        models.Leave.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    if not _employee_belongs_to_company(db, leave.employee_id, company.id):
        raise HTTPException(status_code=403, detail="Leave not in your company")

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


# Employee leave balance summary
@app.get("/employees/{employee_id}/summary", tags=["employee"])
def employee_summary(
    employee_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role == "employee" and user.id != employee_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if user.role == "company" and not _employee_belongs_to_company(
        db, employee_id, user.id
    ):
        raise HTTPException(status_code=403, detail="Employee not in your company")
    if user.role not in ("employee", "company"):
        raise HTTPException(status_code=403, detail="Access denied")

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