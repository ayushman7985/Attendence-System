from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# AUTH ROUTER
try:
    from .auth import router as auth_router
except ImportError:
    from auth import router as auth_router

# DATABASE + MODELS
try:
    # Package-style imports
    from .database import engine, Base, SessionLocal
    from . import models, schemas
except ImportError:
    # Module-style imports
    from database import engine, Base, SessionLocal
    import models, schemas


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

# Temporary Employee Storage
employees = [
    {
        "id": 1,
        "name": "Ayushman",
        "email": "ayushman@gmail.com"
    },
    {
        "id": 2,
        "name": "Rahul",
        "email": "rahul@gmail.com"
    }
]


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


# Get Employees
@app.get("/employees", tags=["employee"])
def get_employees():
    return employees


# Create Employee
@app.post("/employees", tags=["employee"])
def create_employee(emp: schemas.EmployeeCreate):

    new_employee = {
        "id": len(employees) + 1,
        "name": emp.name,
        "email": emp.email
    }

    employees.append(new_employee)

    return new_employee


# Mark Attendance
@app.post("/attendance", tags=["attendance"])
def mark_attendance(
    att: schemas.AttendanceCreate,
    db: Session = Depends(get_db)
):
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


# Get All Attendance
@app.get("/attendance", tags=["attendance"])
def get_attendance(db: Session = Depends(get_db)):
    return db.query(models.Attendance).all()