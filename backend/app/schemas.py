from pydantic import BaseModel, EmailStr, Field


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class EmployeeSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str | None = Field(default=None, max_length=120)
    company_code: str | None = Field(default=None, max_length=32)


class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleAuth(BaseModel):
    access_token: str
    role: str = "company"


class AttendanceCreate(BaseModel):
    employee_id: int
    status: str


class CompanyCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class CompanyLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class LeaveCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    start_date: str
    end_date: str


class LeaveStatusUpdate(BaseModel):
    status: str
