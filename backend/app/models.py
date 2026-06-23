from sqlalchemy import Column, Integer, String, ForeignKey

from database import Base


# Attendance Table
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    status = Column(String)


# Company Table
class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, unique=True)
    email = Column(String, unique=True)
    password = Column(String)
    invite_code = Column(String, unique=True, index=True)


# Employee Table (employees can log in too)
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True, nullable=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    total_leaves = Column(Integer, default=12)


# Leave Table
class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, index=True)
    employee_name = Column(String)
    reason = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    # Pending / Approved / Rejected
    status = Column(String, default="Pending")
    applied_at = Column(String)