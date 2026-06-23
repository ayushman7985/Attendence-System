from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    name: str
    email: str


# EMPLOYEE AUTH
class EmployeeSignup(BaseModel):
    name: str
    email: str
    password: str


class EmployeeLogin(BaseModel):
    email: str
    password: str


# GOOGLE OAUTH
class GoogleAuth(BaseModel):
    access_token: str
    # "company" or "employee"
    role: str = "company"


class AttendanceCreate(BaseModel):
    employee_id: int
    status: str

class CompanyCreate(BaseModel):
    company_name: str
    email: str
    password: str


# LOGIN
class CompanyLogin(BaseModel):
    email: str
    password: str


# LEAVE
class LeaveCreate(BaseModel):
    employee_id: int
    reason: str
    start_date: str
    end_date: str


class LeaveStatusUpdate(BaseModel):
    # "Approved" or "Rejected"
    status: str