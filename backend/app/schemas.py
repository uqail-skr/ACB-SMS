from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Gender(str, Enum):
    FEMALE = "FEMALE"
    MALE = "MALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date
    gender: Gender
    blood_group: str | None = Field(default=None, max_length=5)
    medical_notes: str | None = None
    allergies: str | None = None
    grade: str = Field(min_length=1, max_length=50)
    section: str = Field(min_length=1, max_length=20)
    enrolled_at: date
    guardian_name: str | None = Field(default=None, max_length=160)
    guardian_phone: str | None = Field(default=None, max_length=30)


class StudentUpdate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date
    gender: Gender
    blood_group: str | None = Field(default=None, max_length=5)
    medical_notes: str | None = None
    allergies: str | None = None
    grade: str = Field(min_length=1, max_length=50)
    section: str = Field(min_length=1, max_length=20)
    enrolled_at: date
    guardian_name: str | None = Field(default=None, max_length=160)
    guardian_phone: str | None = Field(default=None, max_length=30)
    guardian_alternate_phone: str | None = Field(default=None, max_length=30)
    guardian_occupation: str | None = Field(default=None, max_length=120)
    guardian_address: str | None = None


class StaffCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    designation: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(TEACHING|NON_ACADEMIC)$")
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=1, max_length=30)
    hired_at: date


class StaffUpdate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    designation: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=100)
    type: str = Field(pattern="^(TEACHING|NON_ACADEMIC)$")
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(min_length=1, max_length=30)
    hired_at: date
    status: str = Field(pattern="^(ACTIVE|INACTIVE|ARCHIVED)$")


class AttendanceRecord(BaseModel):
    student_number: str
    status: AttendanceStatus


class AttendanceUpdate(BaseModel):
    date: date
    records: list[AttendanceRecord] = Field(min_length=1)


class MovementCreate(BaseModel):
    person_name: str = Field(min_length=1, max_length=160)
    category: str = Field(pattern="^(Student|Staff|Visitor)$")
    direction: str = Field(pattern="^(INWARD|OUTWARD)$")
    purpose: str = Field(min_length=1, max_length=250)
    status: str = Field(pattern="^(PENDING|CLEARED|AUTHORIZED)$")
    reference: str | None = Field(default=None, max_length=30)
    occurred_at: datetime | None = None


class MovementStatusUpdate(BaseModel):
    status: str = Field(pattern="^(PENDING|CLEARED|AUTHORIZED)$")


class GradeRecord(BaseModel):
    student_number: str
    midterm: float = Field(ge=0)
    yearly: float = Field(ge=0)
    remark: str = Field(default="", max_length=500)


class GradebookUpdate(BaseModel):
    grade: str
    section: str
    subject: str
    records: list[GradeRecord] = Field(min_length=1)


class ReportCommentUpdate(BaseModel):
    student_number: str
    term: str = Field(min_length=1, max_length=30)
    teacher_comment: str = Field(default="", max_length=5000)
    principal_comment: str = Field(default="", max_length=5000)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)