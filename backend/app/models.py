from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, Enum):
    PRINCIPAL = "PRINCIPAL"
    OFFICE_STAFF = "OFFICE_STAFF"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    STUDENT = "STUDENT"
    SECURITY_GUARD = "SECURITY_GUARD"


class Gender(str, Enum):
    FEMALE = "FEMALE"
    MALE = "MALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class StaffType(str, Enum):
    TEACHING = "TEACHING"
    NON_ACADEMIC = "NON_ACADEMIC"


class RecordStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class EnrollmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    WITHDRAWN = "WITHDRAWN"
    COMPLETED = "COMPLETED"
    TRANSFERRED = "TRANSFERRED"


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class AssessmentTerm(str, Enum):
    QUIZ = "QUIZ"
    MIDTERM = "MIDTERM"
    FINAL = "FINAL"
    OTHER = "OTHER"


class MovementDirection(str, Enum):
    INWARD = "INWARD"
    OUTWARD = "OUTWARD"


class MovementStatus(str, Enum):
    PENDING = "PENDING"
    CLEARED = "CLEARED"
    AUTHORIZED = "AUTHORIZED"


def enum_type(enum_class: type[Enum], name: str) -> SqlEnum:
    return SqlEnum(enum_class, name=name, values_callable=lambda items: [item.value for item in items])


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(enum_type(UserRole, "user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    student: Mapped[Student | None] = relationship(back_populates="user", uselist=False)
    staff: Mapped[Staff | None] = relationship(back_populates="user", uselist=False)
    guardian: Mapped[Guardian | None] = relationship(back_populates="user", uselist=False)
    attendance_marked: Mapped[list[Attendance]] = relationship(back_populates="marked_by")
    movements_logged: Mapped[list[GateMovement]] = relationship(
        back_populates="logged_by", foreign_keys="GateMovement.logged_by_id"
    )
    movements_authorized: Mapped[list[GateMovement]] = relationship(
        back_populates="authorized_by", foreign_keys="GateMovement.authorized_by_id"
    )


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sections: Mapped[list[Section]] = relationship(back_populates="academic_year")

    __table_args__ = (CheckConstraint("end_date > start_date", name="ck_academic_year_dates"),)


class GradeLevel(Base):
    __tablename__ = "grade_levels"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(unique=True, nullable=False)
    sections: Mapped[list[Section]] = relationship(back_populates="grade_level")


class Section(TimestampMixin, Base):
    __tablename__ = "sections"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(20), nullable=False)
    grade_level_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("grade_levels.id", ondelete="RESTRICT"), nullable=False
    )
    academic_year_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("academic_years.id", ondelete="RESTRICT"), nullable=False
    )
    homeroom_staff_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("staff.id", ondelete="SET NULL")
    )

    grade_level: Mapped[GradeLevel] = relationship(back_populates="sections")
    academic_year: Mapped[AcademicYear] = relationship(back_populates="sections")
    homeroom_staff: Mapped[Staff | None] = relationship(back_populates="homeroom_sections")
    enrollments: Mapped[list[Enrollment]] = relationship(back_populates="section")
    subjects: Mapped[list[SectionSubject]] = relationship(back_populates="section")

    __table_args__ = (
        UniqueConstraint("grade_level_id", "academic_year_id", "name"),
        Index("ix_sections_academic_year_id", "academic_year_id"),
    )


class Student(TimestampMixin, Base):
    __tablename__ = "students"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Gender] = mapped_column(enum_type(Gender, "gender"), nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(5))
    medical_notes: Mapped[str | None] = mapped_column(Text)
    allergies: Mapped[str | None] = mapped_column(Text)
    status: Mapped[RecordStatus] = mapped_column(
        enum_type(RecordStatus, "record_status"),
        nullable=False,
        default=RecordStatus.ACTIVE,
        server_default=RecordStatus.ACTIVE.value,
    )

    user: Mapped[User | None] = relationship(back_populates="student")
    enrollments: Mapped[list[Enrollment]] = relationship(back_populates="student")
    guardians: Mapped[list[StudentGuardian]] = relationship(back_populates="student")
    movements: Mapped[list[GateMovement]] = relationship(back_populates="student")

    __table_args__ = (Index("ix_students_last_name_first_name", "last_name", "first_name"),)


class Guardian(TimestampMixin, Base):
    __tablename__ = "guardians"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    alternate_phone: Mapped[str | None] = mapped_column(String(30))
    occupation: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User | None] = relationship(back_populates="guardian")
    students: Mapped[list[StudentGuardian]] = relationship(back_populates="guardian")

    __table_args__ = (Index("ix_guardians_last_name_first_name", "last_name", "first_name"),)


class StudentGuardian(Base):
    __tablename__ = "student_guardians"

    student_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    guardian_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("guardians.id", ondelete="CASCADE"), primary_key=True
    )
    relationship_type: Mapped[str] = mapped_column("relationship", String(40), nullable=False)
    is_primary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    student: Mapped[Student] = relationship(back_populates="guardians")
    guardian: Mapped[Guardian] = relationship(back_populates="students")

    __table_args__ = (Index("ix_student_guardians_guardian_id", "guardian_id"),)


class Staff(TimestampMixin, Base):
    __tablename__ = "staff"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    employee_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    designation: Mapped[str] = mapped_column(String(120), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[StaffType] = mapped_column(enum_type(StaffType, "staff_type"), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    hired_at: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[RecordStatus] = mapped_column(
        enum_type(RecordStatus, "record_status"),
        nullable=False,
        default=RecordStatus.ACTIVE,
        server_default=RecordStatus.ACTIVE.value,
    )

    user: Mapped[User | None] = relationship(back_populates="staff")
    homeroom_sections: Mapped[list[Section]] = relationship(back_populates="homeroom_staff")
    section_subjects: Mapped[list[SectionSubject]] = relationship(back_populates="staff")
    movements: Mapped[list[GateMovement]] = relationship(back_populates="staff")

    __table_args__ = (Index("ix_staff_last_name_first_name", "last_name", "first_name"),)


class Enrollment(TimestampMixin, Base):
    __tablename__ = "enrollments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="RESTRICT"), nullable=False
    )
    section_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False
    )
    enrolled_at: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[EnrollmentStatus] = mapped_column(
        enum_type(EnrollmentStatus, "enrollment_status"),
        nullable=False,
        default=EnrollmentStatus.ACTIVE,
        server_default=EnrollmentStatus.ACTIVE.value,
    )

    student: Mapped[Student] = relationship(back_populates="enrollments")
    section: Mapped[Section] = relationship(back_populates="enrollments")
    attendance: Mapped[list[Attendance]] = relationship(back_populates="enrollment")
    grades: Mapped[list[Grade]] = relationship(back_populates="enrollment")

    __table_args__ = (
        UniqueConstraint("student_id", "section_id"),
        Index("ix_enrollments_section_id_status", "section_id", "status"),
    )


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        enum_type(AttendanceStatus, "attendance_status"), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(String(500))
    marked_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    enrollment: Mapped[Enrollment] = relationship(back_populates="attendance")
    marked_by: Mapped[User | None] = relationship(back_populates="attendance_marked")

    __table_args__ = (
        UniqueConstraint("enrollment_id", "date"),
        Index("ix_attendance_date_status", "date", "status"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sections: Mapped[list[SectionSubject]] = relationship(back_populates="subject")


class SectionSubject(Base):
    __tablename__ = "section_subjects"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    section_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False
    )
    staff_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("staff.id", ondelete="RESTRICT"), nullable=False
    )

    section: Mapped[Section] = relationship(back_populates="subjects")
    subject: Mapped[Subject] = relationship(back_populates="sections")
    staff: Mapped[Staff] = relationship(back_populates="section_subjects")
    assessments: Mapped[list[Assessment]] = relationship(back_populates="section_subject")

    __table_args__ = (
        UniqueConstraint("section_id", "subject_id"),
        Index("ix_section_subjects_staff_id", "staff_id"),
    )


class Assessment(TimestampMixin, Base):
    __tablename__ = "assessments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    section_subject_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("section_subjects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    term: Mapped[AssessmentTerm] = mapped_column(
        enum_type(AssessmentTerm, "assessment_term"),
        nullable=False,
        default=AssessmentTerm.OTHER,
        server_default=AssessmentTerm.OTHER.value,
    )
    max_score: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), nullable=False, default=Decimal("100"), server_default="100"
    )
    due_date: Mapped[date | None] = mapped_column(Date)

    section_subject: Mapped[SectionSubject] = relationship(back_populates="assessments")
    grades: Mapped[list[Grade]] = relationship(back_populates="assessment")

    __table_args__ = (
        CheckConstraint("max_score > 0", name="ck_assessments_max_score_positive"),
        Index("ix_assessments_section_subject_id_term", "section_subject_id", "term"),
    )


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    assessment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    enrollment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    assessment: Mapped[Assessment] = relationship(back_populates="grades")
    enrollment: Mapped[Enrollment] = relationship(back_populates="grades")

    __table_args__ = (
        CheckConstraint("score >= 0", name="ck_grades_score_nonnegative"),
        UniqueConstraint("assessment_id", "enrollment_id"),
        Index("ix_grades_enrollment_id", "enrollment_id"),
    )


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    organization: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    movements: Mapped[list[GateMovement]] = relationship(back_populates="visitor")

    __table_args__ = (Index("ix_visitors_full_name", "full_name"),)


class GateMovement(Base):
    __tablename__ = "gate_movements"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    direction: Mapped[MovementDirection] = mapped_column(
        enum_type(MovementDirection, "movement_direction"), nullable=False
    )
    status: Mapped[MovementStatus] = mapped_column(
        enum_type(MovementStatus, "movement_status"),
        nullable=False,
        default=MovementStatus.PENDING,
        server_default=MovementStatus.PENDING.value,
    )
    person_name: Mapped[str] = mapped_column(String(160), nullable=False)
    purpose: Mapped[str] = mapped_column(String(250), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    student_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL")
    )
    staff_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("staff.id", ondelete="SET NULL")
    )
    visitor_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("visitors.id", ondelete="SET NULL")
    )
    logged_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    authorized_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    student: Mapped[Student | None] = relationship(back_populates="movements")
    staff: Mapped[Staff | None] = relationship(back_populates="movements")
    visitor: Mapped[Visitor | None] = relationship(back_populates="movements")
    logged_by: Mapped[User | None] = relationship(
        back_populates="movements_logged", foreign_keys=[logged_by_id]
    )
    authorized_by: Mapped[User | None] = relationship(
        back_populates="movements_authorized", foreign_keys=[authorized_by_id]
    )

    __table_args__ = (
        Index("ix_gate_movements_occurred_at", "occurred_at"),
        Index("ix_gate_movements_status_occurred_at", "status", "occurred_at"),
    )


class ReportComment(Base):
    __tablename__ = "report_comments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    student_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    term: Mapped[str] = mapped_column(String(40), nullable=False)
    teacher_comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    principal_comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("student_id", "term"),)
