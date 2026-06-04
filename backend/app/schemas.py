from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    name: str
    email: str


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