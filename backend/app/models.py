from sqlalchemy import Column, Integer, String

try:
    # Package-style import
    from .database import Base
except ImportError:
    # Module-style import
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