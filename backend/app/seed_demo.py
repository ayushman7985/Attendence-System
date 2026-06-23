"""Seed demo company, employees, attendance, and leave data for interviews.

Run from backend/app:
    python seed_demo.py
"""

from datetime import datetime, timedelta

from database import SessionLocal, engine, Base
import models
from security import hash_password

DEMO_PASSWORD = "demo123"

COMPANY = {
    "company_name": "TechNova Solutions",
    "email": "admin@technova.com",
}

EMPLOYEES = [
    {"name": "Priya Sharma", "email": "priya@technova.com", "total_leaves": 12},
    {"name": "Rahul Kumar", "email": "rahul@technova.com", "total_leaves": 12},
    {"name": "Ananya Singh", "email": "ananya@technova.com", "total_leaves": 10},
    {"name": "Vikram Patel", "email": "vikram@technova.com", "total_leaves": 12},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        company = db.query(models.Company).filter(
            models.Company.email == COMPANY["email"]
        ).first()

        if company:
            print("Demo data already exists — skipping seed.")
        else:
            company = models.Company(
                company_name=COMPANY["company_name"],
                email=COMPANY["email"],
                password=hash_password(DEMO_PASSWORD),
            )
            db.add(company)
            db.commit()
            print(f"Created company: {COMPANY['company_name']}")

            employees = []
            for emp in EMPLOYEES:
                employee = models.Employee(
                    name=emp["name"],
                    email=emp["email"],
                    password=hash_password(DEMO_PASSWORD),
                    total_leaves=emp["total_leaves"],
                )
                db.add(employee)
                employees.append(employee)
            db.commit()
            for e in employees:
                db.refresh(e)

            today = datetime.utcnow().date()
            attendance_data = [
                (employees[0].id, "Present"),
                (employees[1].id, "Present"),
                (employees[2].id, "Absent"),
                (employees[3].id, "Present"),
                (employees[0].id, "Present"),
                (employees[1].id, "Late"),
            ]
            for emp_id, status in attendance_data:
                db.add(models.Attendance(name=str(emp_id), status=status))
            db.commit()

            leaves = [
                models.Leave(
                    employee_id=employees[0].id,
                    employee_name=employees[0].name,
                    reason="Family function",
                    start_date=(today + timedelta(days=5)).isoformat(),
                    end_date=(today + timedelta(days=6)).isoformat(),
                    status="Pending",
                    applied_at=datetime.utcnow().isoformat(),
                ),
                models.Leave(
                    employee_id=employees[1].id,
                    employee_name=employees[1].name,
                    reason="Medical appointment",
                    start_date=(today - timedelta(days=10)).isoformat(),
                    end_date=(today - timedelta(days=9)).isoformat(),
                    status="Approved",
                    applied_at=(datetime.utcnow() - timedelta(days=12)).isoformat(),
                ),
                models.Leave(
                    employee_id=employees[2].id,
                    employee_name=employees[2].name,
                    reason="Personal work",
                    start_date=(today + timedelta(days=12)).isoformat(),
                    end_date=(today + timedelta(days=13)).isoformat(),
                    status="Pending",
                    applied_at=datetime.utcnow().isoformat(),
                ),
            ]
            for leave in leaves:
                db.add(leave)
            db.commit()
            print("Created employees, attendance records, and leave requests.")

        print("\n=== Demo Login Credentials (password for all: demo123) ===\n")
        print("COMPANY (Company tab -> Sign in):")
        print(f"  Email:    {COMPANY['email']}")
        print(f"  Password: {DEMO_PASSWORD}")
        print("\nEMPLOYEES (Employee tab -> Sign in):")
        for emp in EMPLOYEES:
            print(f"  {emp['name']:<18} {emp['email']}")
        print(f"\n  Password: {DEMO_PASSWORD}")
        print("\nTip: Use email/password login — Google sign-in is optional.\n")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
