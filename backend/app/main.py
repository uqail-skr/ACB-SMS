from contextlib import asynccontextmanager
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import (
    AcademicYear,
    Assessment,
    AssessmentTerm,
    Attendance,
    AttendanceStatus,
    Enrollment,
    EnrollmentStatus,
    GateMovement,
    Gender,
    Grade,
    GradeLevel,
    Guardian,
    MovementDirection,
    MovementStatus,
    RecordStatus,
    ReportComment,
    Section,
    SectionSubject,
    Staff,
    StaffType,
    Student,
    StudentGuardian,
    Subject,
    Visitor,
)
from app.schemas import (
    AttendanceUpdate,
    GradebookUpdate,
    MovementCreate,
    MovementStatusUpdate,
    ReportCommentUpdate,
    StaffCreate,
    StaffUpdate,
    StudentCreate,
    StudentUpdate,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Northstar School Management API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _student_dtos(db: Session, students: list[Student]) -> list[dict]:
    if not students:
        return []
    student_ids = [student.id for student in students]
    enrollment_rows = db.execute(
        select(Enrollment, Section, GradeLevel)
        .join(Section, Enrollment.section_id == Section.id)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(
            Enrollment.student_id.in_(student_ids),
            Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    ).all()
    enrollment_by_student = {enrollment.student_id: (enrollment, section, grade) for enrollment, section, grade in enrollment_rows}
    attendance_by_enrollment: dict[UUID, list[AttendanceStatus]] = {}
    for enrollment_id, status in db.execute(
        select(Attendance.enrollment_id, Attendance.status).where(
            Attendance.enrollment_id.in_([row[0].id for row in enrollment_rows])
        )
    ):
        attendance_by_enrollment.setdefault(enrollment_id, []).append(status)
    guardian_rows = db.execute(
        select(StudentGuardian.student_id, Guardian.first_name, Guardian.last_name, Guardian.phone)
        .join(Guardian, StudentGuardian.guardian_id == Guardian.id)
        .where(StudentGuardian.student_id.in_(student_ids), StudentGuardian.is_primary.is_(True))
    ).all()
    guardian_by_student = {
        student_id: (f"{first_name} {last_name}", phone)
        for student_id, first_name, last_name, phone in guardian_rows
    }
    guardian_details = {
        student_id: (guardian.alternate_phone, guardian.occupation, guardian.address)
        for student_id, guardian in db.execute(
            select(StudentGuardian.student_id, Guardian)
            .join(Guardian, StudentGuardian.guardian_id == Guardian.id)
            .where(StudentGuardian.student_id.in_(student_ids), StudentGuardian.is_primary.is_(True))
        )
    }

    result = []
    for student in students:
        enrollment, section, grade = enrollment_by_student.get(student.id, (None, None, None))
        statuses = attendance_by_enrollment.get(enrollment.id, []) if enrollment else []
        counted = [status for status in statuses if status != AttendanceStatus.EXCUSED]
        attendance_rate = (
            round(sum(status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE) for status in counted) * 100 / len(counted))
            if counted
            else 100
        )
        guardian_name, guardian_phone = guardian_by_student.get(student.id, ("No guardian on file", ""))
        alternate_phone, occupation, address = guardian_details.get(student.id, (None, None, None))
        result.append(
            {
                "id": student.student_number,
                "name": f"{student.first_name} {student.last_name}",
                "grade": grade.name if grade else "Unassigned",
                "section": section.name if section else "—",
                "gender": student.gender.value.title() if student.gender != Gender.PREFER_NOT_TO_SAY else "Other",
                "blood": student.blood_group or "—",
                "dob": student.date_of_birth.isoformat(),
                "enrolled": enrollment.enrolled_at.isoformat() if enrollment else "",
                "parent": guardian_name,
                "phone": guardian_phone,
                "attendance": attendance_rate,
                "avatar": f"{student.first_name[:1]}{student.last_name[:1]}".upper(),
                "condition": student.medical_notes or "None reported",
                "allergies": student.allergies or "None reported",
                "guardianAlternatePhone": alternate_phone or "",
                "guardianOccupation": occupation or "",
                "guardianAddress": address or "",
                "status": student.status.value.title(),
            }
        )
    return result


def _staff_dto(person: Staff) -> dict:
    return {
        "id": person.employee_number,
        "name": f"{person.first_name} {person.last_name}",
        "role": person.designation,
        "department": person.department,
        "type": "Teacher" if person.type == StaffType.TEACHING else "Non-Academic",
        "email": person.email,
        "phone": person.phone,
        "since": str(person.hired_at.year),
        "avatar": f"{person.first_name[:1]}{person.last_name[:1]}".upper(),
        "status": person.status.value.title(),
    }


def _movement_dto(movement: GateMovement) -> dict:
    if movement.student_id:
        category = "Student"
    elif movement.staff_id:
        category = "Staff"
    else:
        category = "Visitor"
    occurred_at = movement.occurred_at
    return {
        "id": f"MV-{movement.id.hex[:8].upper()}",
        "recordId": str(movement.id),
        "name": movement.person_name,
        "category": category,
        "direction": movement.direction.value.title(),
        "time": occurred_at.strftime("%I:%M %p"),
        "purpose": movement.purpose,
        "status": movement.status.value.title(),
        "occurredAt": occurred_at.isoformat(),
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/students")
def list_students(db: Session = Depends(get_db)) -> list[dict]:
    students = list(db.scalars(select(Student).order_by(Student.last_name, Student.first_name)))
    return _student_dtos(db, students)


@app.post("/api/students", status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)) -> dict:
    current_year = db.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    section = db.scalar(
        select(Section)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(
            GradeLevel.name == payload.grade,
            Section.name == payload.section,
            Section.academic_year_id == current_year.id if current_year else True,
        )
    )
    if not section:
        raise HTTPException(status_code=404, detail="The selected class does not exist in the current academic year.")
    prefix = f"NS-{date.today().year % 100:02d}"
    existing_numbers = db.scalars(select(Student.student_number).where(Student.student_number.like(f"{prefix}%"))).all()
    next_number = max((int(value[len(prefix) :]) for value in existing_numbers if value[len(prefix) :].isdigit()), default=0) + 1
    student = Student(
        student_number=f"{prefix}{next_number:02d}",
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        date_of_birth=payload.date_of_birth,
        gender=Gender(payload.gender.value),
        blood_group=payload.blood_group,
        medical_notes=payload.medical_notes,
        allergies=payload.allergies,
    )
    db.add(student)
    db.flush()
    db.add(Enrollment(student_id=student.id, section_id=section.id, enrolled_at=payload.enrolled_at))
    if payload.guardian_name and payload.guardian_phone:
        parts = payload.guardian_name.strip().split(maxsplit=1)
        guardian = Guardian(
            first_name=parts[0],
            last_name=parts[1] if len(parts) > 1 else "Guardian",
            phone=payload.guardian_phone,
        )
        db.add(guardian)
        db.flush()
        db.add(StudentGuardian(student_id=student.id, guardian_id=guardian.id, relationship_type="Parent", is_primary=True))
    db.commit()
    db.refresh(student)
    return _student_dtos(db, [student])[0]


@app.put("/api/students/{student_number}")
def update_student(student_number: str, payload: StudentUpdate, db: Session = Depends(get_db)) -> dict:
    student = db.scalar(select(Student).where(Student.student_number == student_number))
    if not student:
        raise HTTPException(status_code=404, detail="Student was not found.")
    current_year = db.scalar(select(AcademicYear).where(AcademicYear.is_current.is_(True)))
    section = db.scalar(
        select(Section)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(
            GradeLevel.name == payload.grade,
            Section.name == payload.section,
            Section.academic_year_id == current_year.id if current_year else True,
        )
    )
    if not section:
        raise HTTPException(status_code=404, detail="The selected class does not exist in the current academic year.")
    student.first_name = payload.first_name.strip()
    student.last_name = payload.last_name.strip()
    student.date_of_birth = payload.date_of_birth
    student.gender = Gender(payload.gender.value)
    student.blood_group = payload.blood_group
    student.medical_notes = payload.medical_notes
    student.allergies = payload.allergies
    enrollment = db.scalar(
        select(Enrollment)
        .where(Enrollment.student_id == student.id, Enrollment.status == EnrollmentStatus.ACTIVE)
        .order_by(Enrollment.enrolled_at.desc())
    )
    if enrollment:
        enrollment.section_id = section.id
        enrollment.enrolled_at = payload.enrolled_at
    else:
        db.add(Enrollment(student_id=student.id, section_id=section.id, enrolled_at=payload.enrolled_at))
    if bool(payload.guardian_name) != bool(payload.guardian_phone):
        raise HTTPException(status_code=422, detail="Provide both guardian name and phone, or leave both blank.")
    if payload.guardian_name and payload.guardian_phone:
        guardian_link = db.scalar(
            select(StudentGuardian).where(
                StudentGuardian.student_id == student.id,
                StudentGuardian.is_primary.is_(True),
            )
        )
        guardian = db.get(Guardian, guardian_link.guardian_id) if guardian_link else None
        guardian_parts = payload.guardian_name.strip().split(maxsplit=1)
        if guardian:
            guardian.first_name = guardian_parts[0]
            guardian.last_name = guardian_parts[1] if len(guardian_parts) > 1 else "Guardian"
            guardian.phone = payload.guardian_phone.strip()
            guardian.alternate_phone = payload.guardian_alternate_phone
            guardian.occupation = payload.guardian_occupation
            guardian.address = payload.guardian_address
        else:
            guardian = Guardian(
                first_name=guardian_parts[0],
                last_name=guardian_parts[1] if len(guardian_parts) > 1 else "Guardian",
                phone=payload.guardian_phone.strip(),
                alternate_phone=payload.guardian_alternate_phone,
                occupation=payload.guardian_occupation,
                address=payload.guardian_address,
            )
            db.add(guardian)
            db.flush()
            db.add(StudentGuardian(student_id=student.id, guardian_id=guardian.id, relationship_type="Parent", is_primary=True))
    db.commit()
    db.refresh(student)
    return _student_dtos(db, [student])[0]


@app.get("/api/staff")
def list_staff(db: Session = Depends(get_db)) -> list[dict]:
    staff = db.scalars(select(Staff).order_by(Staff.last_name, Staff.first_name)).all()
    return [_staff_dto(person) for person in staff]


@app.post("/api/staff", status_code=201)
def create_staff(payload: StaffCreate, db: Session = Depends(get_db)) -> dict:
    if "@" not in payload.email:
        raise HTTPException(status_code=422, detail="A valid email address is required.")
    prefix = "ST-"
    numbers = db.scalars(select(Staff.employee_number).where(Staff.employee_number.like(f"{prefix}%"))).all()
    next_number = max((int(value[len(prefix) :]) for value in numbers if value[len(prefix) :].isdigit()), default=1000) + 1
    person = Staff(
        employee_number=f"{prefix}{next_number}",
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        designation=payload.designation.strip(),
        department=payload.department.strip(),
        type=StaffType(payload.type),
        email=payload.email.lower().strip(),
        phone=payload.phone.strip(),
        hired_at=payload.hired_at,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return _staff_dto(person)


@app.put("/api/staff/{employee_number}")
def update_staff(employee_number: str, payload: StaffUpdate, db: Session = Depends(get_db)) -> dict:
    person = db.scalar(select(Staff).where(Staff.employee_number == employee_number))
    if not person:
        raise HTTPException(status_code=404, detail="Staff member was not found.")
    if "@" not in payload.email:
        raise HTTPException(status_code=422, detail="A valid email address is required.")
    person.first_name = payload.first_name.strip()
    person.last_name = payload.last_name.strip()
    person.designation = payload.designation.strip()
    person.department = payload.department.strip()
    person.type = StaffType(payload.type)
    person.email = payload.email.lower().strip()
    person.phone = payload.phone.strip()
    person.hired_at = payload.hired_at
    person.status = RecordStatus(payload.status)
    db.commit()
    db.refresh(person)
    return _staff_dto(person)


@app.get("/api/attendance")
def get_attendance(
    attendance_date: date = Query(alias="date"),
    section_name: str = Query(alias="section"),
    db: Session = Depends(get_db),
) -> list[dict]:
    grade_name, separator, room = section_name.rpartition(" ")
    if not separator:
        raise HTTPException(status_code=422, detail="Section must be formatted like 'Grade 7 A'.")
    rows = db.execute(
        select(Student, Enrollment, Section, GradeLevel)
        .join(Enrollment, and_(Enrollment.student_id == Student.id, Enrollment.status == EnrollmentStatus.ACTIVE))
        .join(Section, Enrollment.section_id == Section.id)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(GradeLevel.name == grade_name, Section.name == room)
        .order_by(Student.last_name, Student.first_name)
    ).all()
    result = []
    for student, enrollment, section, grade in rows:
        attendance = db.scalar(
            select(Attendance).where(Attendance.enrollment_id == enrollment.id, Attendance.date == attendance_date)
        )
        result.append(
            {
                **_student_dtos(db, [student])[0],
                "status": attendance.status.value if attendance else AttendanceStatus.PRESENT.value,
            }
        )
    return result


@app.put("/api/attendance")
def update_attendance(payload: AttendanceUpdate, db: Session = Depends(get_db)) -> dict[str, int]:
    saved = 0
    for record in payload.records:
        enrollment = db.scalar(
            select(Enrollment)
            .join(Student, Enrollment.student_id == Student.id)
            .where(
                Student.student_number == record.student_number,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            )
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail=f"Student {record.student_number} has no active enrollment.")
        attendance = db.scalar(
            select(Attendance).where(Attendance.enrollment_id == enrollment.id, Attendance.date == payload.date)
        )
        if attendance:
            attendance.status = AttendanceStatus(record.status.value)
        else:
            db.add(
                Attendance(
                    enrollment_id=enrollment.id,
                    date=payload.date,
                    status=AttendanceStatus(record.status.value),
                )
            )
        saved += 1
    db.commit()
    return {"saved": saved}


@app.get("/api/movements")
def list_movements(db: Session = Depends(get_db)) -> list[dict]:
    movements = db.scalars(
        select(GateMovement).order_by(GateMovement.occurred_at.desc()).limit(200)
    ).all()
    return [_movement_dto(movement) for movement in movements]


@app.post("/api/movements", status_code=201)
def create_movement(payload: MovementCreate, db: Session = Depends(get_db)) -> dict:
    student = None
    staff = None
    visitor = None
    if payload.category == "Student":
        student = db.scalar(select(Student).where(Student.student_number == payload.reference)) if payload.reference else None
        if payload.reference and not student:
            raise HTTPException(status_code=404, detail="Student reference was not found.")
    elif payload.category == "Staff":
        staff = db.scalar(select(Staff).where(Staff.employee_number == payload.reference)) if payload.reference else None
        if payload.reference and not staff:
            raise HTTPException(status_code=404, detail="Staff reference was not found.")
    else:
        visitor = Visitor(full_name=payload.person_name.strip())
        db.add(visitor)
        db.flush()
    occurred_at = payload.occurred_at or datetime.now()
    movement = GateMovement(
        direction=MovementDirection(payload.direction),
        status=MovementStatus(payload.status),
        person_name=payload.person_name.strip(),
        purpose=payload.purpose.strip(),
        occurred_at=occurred_at,
        student_id=student.id if student else None,
        staff_id=staff.id if staff else None,
        visitor_id=visitor.id if visitor else None,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return _movement_dto(movement)


@app.patch("/api/movements/{record_id}/status")
def update_movement_status(record_id: UUID, payload: MovementStatusUpdate, db: Session = Depends(get_db)) -> dict:
    movement = db.get(GateMovement, record_id)
    if not movement:
        raise HTTPException(status_code=404, detail="Gate movement was not found.")
    movement.status = MovementStatus(payload.status)
    db.commit()
    db.refresh(movement)
    return _movement_dto(movement)


@app.get("/api/gradebook")
def get_gradebook(
    grade: str,
    section: str,
    subject: str,
    db: Session = Depends(get_db),
) -> dict:
    section_row = db.scalar(
        select(Section)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(GradeLevel.name == grade, Section.name == section)
    )
    if not section_row:
        raise HTTPException(status_code=404, detail="Class was not found.")
    section_subject = db.scalar(
        select(SectionSubject)
        .join(Subject, SectionSubject.subject_id == Subject.id)
        .where(SectionSubject.section_id == section_row.id, Subject.name == subject)
    )
    if not section_subject:
        raise HTTPException(status_code=404, detail="Subject is not assigned to this class.")
    assessments = db.scalars(
        select(Assessment).where(Assessment.section_subject_id == section_subject.id)
    ).all()
    assessment_by_term = {
        assessment.term: assessment
        for assessment in assessments
        if assessment.term in (AssessmentTerm.MIDTERM, AssessmentTerm.FINAL)
    }
    enrollments = db.execute(
        select(Enrollment, Student)
        .join(Student, Enrollment.student_id == Student.id)
        .where(Enrollment.section_id == section_row.id, Enrollment.status == EnrollmentStatus.ACTIVE)
        .order_by(Student.last_name, Student.first_name)
    ).all()
    marks: dict[tuple[UUID, AssessmentTerm], Grade] = {}
    if assessment_by_term and enrollments:
        grades = db.scalars(
            select(Grade).where(
                Grade.assessment_id.in_([assessment.id for assessment in assessment_by_term.values()]),
                Grade.enrollment_id.in_([enrollment.id for enrollment, _ in enrollments]),
            )
        ).all()
        marks = {(item.enrollment_id, item.assessment.term): item for item in grades}
    if not assessment_by_term:
        raise HTTPException(status_code=404, detail="No mid-term or yearly assessments are configured for this class.")
    records = []
    for enrollment, student in enrollments:
        midterm = marks.get((enrollment.id, AssessmentTerm.MIDTERM))
        yearly = marks.get((enrollment.id, AssessmentTerm.FINAL))
        records.append(
            {
                "id": student.student_number,
                "name": f"{student.first_name} {student.last_name}",
                "grade": grade,
                "section": section,
                "midterm": float(midterm.score) if midterm else 0,
                "yearly": float(yearly.score) if yearly else 0,
                "remark": (midterm or yearly).remarks or "" if (midterm or yearly) else "",
            }
        )
    return {
        "records": records,
        "midtermMax": float(assessment_by_term[AssessmentTerm.MIDTERM].max_score) if AssessmentTerm.MIDTERM in assessment_by_term else 100,
        "yearlyMax": float(assessment_by_term[AssessmentTerm.FINAL].max_score) if AssessmentTerm.FINAL in assessment_by_term else 100,
    }


@app.put("/api/gradebook")
def update_gradebook(payload: GradebookUpdate, db: Session = Depends(get_db)) -> dict[str, int]:
    current = get_gradebook(payload.grade, payload.section, payload.subject, db)
    del current
    section_subject = db.scalar(
        select(SectionSubject)
        .join(Section, SectionSubject.section_id == Section.id)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .join(Subject, SectionSubject.subject_id == Subject.id)
        .where(
            GradeLevel.name == payload.grade,
            Section.name == payload.section,
            Subject.name == payload.subject,
        )
    )
    assessments = db.scalars(
        select(Assessment).where(Assessment.section_subject_id == section_subject.id)
    ).all()
    assessment_by_term = {item.term: item for item in assessments}
    enrollments = {
        student.student_number: enrollment
        for enrollment, student in db.execute(
            select(Enrollment, Student)
            .join(Student, Enrollment.student_id == Student.id)
            .join(Section, Enrollment.section_id == Section.id)
            .where(
                Student.student_number.in_([record.student_number for record in payload.records]),
                GradeLevel.name == payload.grade,
                Section.name == payload.section,
                Enrollment.status == EnrollmentStatus.ACTIVE,
            )
            .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        )
    }
    saved = 0
    for record in payload.records:
        enrollment = enrollments.get(record.student_number)
        if not enrollment:
            raise HTTPException(status_code=404, detail=f"Student {record.student_number} is not enrolled in this class.")
        for term, score in (
            (AssessmentTerm.MIDTERM, record.midterm),
            (AssessmentTerm.FINAL, record.yearly),
        ):
            assessment = assessment_by_term.get(term)
            if not assessment:
                continue
            if score > float(assessment.max_score):
                raise HTTPException(status_code=422, detail=f"Score exceeds the {term.value.lower()} maximum.")
            existing = db.scalar(
                select(Grade).where(
                    Grade.assessment_id == assessment.id,
                    Grade.enrollment_id == enrollment.id,
                )
            )
            if existing:
                existing.score = Decimal(str(score))
                existing.remarks = record.remark
            else:
                db.add(
                    Grade(
                        assessment_id=assessment.id,
                        enrollment_id=enrollment.id,
                        score=Decimal(str(score)),
                        remarks=record.remark,
                    )
                )
        saved += 1
    db.commit()
    return {"saved": saved}


@app.get("/api/report-comments")
def get_report_comments(student_number: str, term: str, db: Session = Depends(get_db)) -> dict:
    student = db.scalar(select(Student).where(Student.student_number == student_number))
    if not student:
        raise HTTPException(status_code=404, detail="Student was not found.")
    comment = db.scalar(
        select(ReportComment).where(ReportComment.student_id == student.id, ReportComment.term == term)
    )
    return {
        "teacher_comment": comment.teacher_comment if comment else "",
        "principal_comment": comment.principal_comment if comment else "",
    }


@app.put("/api/report-comments")
def update_report_comments(payload: ReportCommentUpdate, db: Session = Depends(get_db)) -> dict[str, str]:
    student = db.scalar(select(Student).where(Student.student_number == payload.student_number))
    if not student:
        raise HTTPException(status_code=404, detail="Student was not found.")
    comment = db.scalar(
        select(ReportComment).where(ReportComment.student_id == student.id, ReportComment.term == payload.term)
    )
    if not comment:
        comment = ReportComment(student_id=student.id, term=payload.term)
        db.add(comment)
    comment.teacher_comment = payload.teacher_comment
    comment.principal_comment = payload.principal_comment
    db.commit()
    return {"status": "saved"}


@app.get("/api/reports")
def get_report(student_number: str, term: str, db: Session = Depends(get_db)) -> dict:
    student = db.scalar(select(Student).where(Student.student_number == student_number))
    if not student:
        raise HTTPException(status_code=404, detail="Student was not found.")
    enrollment, section, grade = db.execute(
        select(Enrollment, Section, GradeLevel)
        .join(Section, Enrollment.section_id == Section.id)
        .join(GradeLevel, Section.grade_level_id == GradeLevel.id)
        .where(Enrollment.student_id == student.id, Enrollment.status == EnrollmentStatus.ACTIVE)
        .order_by(Enrollment.enrolled_at.desc())
    ).first() or (None, None, None)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Student has no active class enrollment.")
    section_subjects = db.scalars(
        select(SectionSubject)
        .where(SectionSubject.section_id == section.id)
        .order_by(SectionSubject.id)
    ).all()
    report_rows = []
    for assignment in section_subjects:
        assessments = db.scalars(
            select(Assessment).where(Assessment.section_subject_id == assignment.id)
        ).all()
        midterm_assessment = next((item for item in assessments if item.term == AssessmentTerm.MIDTERM), None)
        yearly_assessment = next((item for item in assessments if item.term == AssessmentTerm.FINAL), None)
        midterm_grade = db.scalar(
            select(Grade).where(
                Grade.assessment_id == midterm_assessment.id,
                Grade.enrollment_id == enrollment.id,
            )
        ) if midterm_assessment else None
        yearly_grade = db.scalar(
            select(Grade).where(
                Grade.assessment_id == yearly_assessment.id,
                Grade.enrollment_id == enrollment.id,
            )
        ) if yearly_assessment else None
        midterm_score = float(midterm_grade.score) if midterm_grade else 0
        yearly_score = float(yearly_grade.score) if yearly_grade else 0
        average = round((midterm_score + yearly_score) / 2)
        subject_name = db.scalar(select(Subject.name).where(Subject.id == assignment.subject_id))
        class_average = db.scalar(
            select(func.avg(Grade.score))
            .where(Grade.assessment_id.in_([item.id for item in (midterm_assessment, yearly_assessment) if item]))
        )
        report_rows.append(
            {
                "name": subject_name,
                "mid": round(midterm_score),
                "yearly": round(yearly_score),
                "average": average,
                "grade": "A" if average >= 90 else "B+" if average >= 80 else "B" if average >= 70 else "C" if average >= 60 else "F",
                "classAverage": round(float(class_average)) if class_average is not None else 0,
            }
        )
    classmates = db.scalars(
        select(Enrollment).where(
            Enrollment.section_id == section.id,
            Enrollment.status == EnrollmentStatus.ACTIVE,
        )
    ).all()
    class_averages: list[tuple[UUID, float]] = []
    assessment_ids = [
        assessment.id
        for assignment in section_subjects
        for assessment in db.scalars(
            select(Assessment).where(
                Assessment.section_subject_id == assignment.id,
                Assessment.term.in_((AssessmentTerm.MIDTERM, AssessmentTerm.FINAL)),
            )
        ).all()
    ]
    if classmates and assessment_ids:
        class_grades = db.execute(
            select(Grade.enrollment_id, Grade.score).where(
                Grade.enrollment_id.in_([item.id for item in classmates]),
                Grade.assessment_id.in_(assessment_ids),
            )
        ).all()
        scores_by_enrollment: dict[UUID, list[float]] = {}
        for enrollment_id, score in class_grades:
            scores_by_enrollment.setdefault(enrollment_id, []).append(float(score))
        class_averages = [
            (enrollment_id, sum(scores) / len(scores))
            for enrollment_id, scores in scores_by_enrollment.items()
        ]
    ranked = sorted(class_averages, key=lambda item: (-item[1], str(item[0])))
    class_rank = next((index + 1 for index, (enrollment_id, _) in enumerate(ranked) if enrollment_id == enrollment.id), None)
    comment = db.scalar(
        select(ReportComment).where(
            ReportComment.student_id == student.id,
            ReportComment.term == term,
        )
    )
    teacher = db.get(Staff, section.homeroom_staff_id) if section.homeroom_staff_id else None
    student_summary = _student_dtos(db, [student])[0]
    return {
        "student": student_summary,
        "rows": report_rows,
        "teacher": f"{teacher.first_name} {teacher.last_name}" if teacher else "Class teacher",
        "teacher_comment": comment.teacher_comment if comment else "",
        "principal_comment": comment.principal_comment if comment else "",
        "academic_year": section.academic_year.name,
        "class_rank": class_rank,
        "class_size": len(classmates),
    }


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)) -> dict:
    active_students = db.scalar(select(func.count(Student.id)).where(Student.status == RecordStatus.ACTIVE)) or 0
    active_staff = db.scalar(select(func.count(Staff.id)).where(Staff.status == RecordStatus.ACTIVE)) or 0
    latest_attendance_date = db.scalar(select(func.max(Attendance.date)))
    attendance_date = min(date.today(), latest_attendance_date) if latest_attendance_date else date.today()
    attendance_counts = db.execute(
        select(Attendance.status, func.count(Attendance.id))
        .where(Attendance.date == attendance_date)
        .group_by(Attendance.status)
    ).all()
    attendance_total = sum(count for _, count in attendance_counts)
    present_count = sum(count for status, count in attendance_counts if status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
    recent_dates = db.scalars(
        select(Attendance.date).distinct().order_by(Attendance.date.desc()).limit(6)
    ).all()
    attendance_week = []
    for attendance_day in reversed(recent_dates):
        counts = db.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(Attendance.date == attendance_day)
            .group_by(Attendance.status)
        ).all()
        day_total = sum(count for _, count in counts)
        day_present = sum(count for status, count in counts if status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
        attendance_week.append(
            {
                "day": attendance_day.strftime("%a"),
                "present": round(day_present * 100 / day_total) if day_total else 0,
                "absent": round((day_total - day_present) * 100 / day_total) if day_total else 0,
            }
        )
    grade_rows = db.execute(
        select(Grade.score)
        .join(Assessment, Grade.assessment_id == Assessment.id)
        .where(Assessment.term == AssessmentTerm.MIDTERM)
    ).all()
    distribution = {grade: 0 for grade in ("A", "B", "C", "D", "F")}
    for (score,) in grade_rows:
        value = float(score)
        letter = "A" if value >= 90 else "B" if value >= 80 else "C" if value >= 70 else "D" if value >= 60 else "F"
        distribution[letter] += 1
    colors = {"A": "#3e74df", "B": "#79a0f1", "C": "#a9c2f7", "D": "#d1def8", "F": "#efaaa6"}
    grade_distribution = [
        {"grade": grade, "count": count, "fill": colors[grade]}
        for grade, count in distribution.items()
    ]
    pending_movements = db.scalar(
        select(func.count(GateMovement.id)).where(GateMovement.status == MovementStatus.PENDING)
    ) or 0
    all_movements = db.scalars(select(GateMovement).order_by(GateMovement.occurred_at.desc()).limit(200)).all()
    movement_day = all_movements[0].occurred_at.date() if all_movements else date.today()
    movement_today = [item for item in all_movements if item.occurred_at.date() == movement_day]
    latest_person_status: dict[str, GateMovement] = {}
    for item in reversed(all_movements):
        latest_person_status[item.person_name] = item
    movements = [_movement_dto(item) for item in all_movements[:7]]
    return {
        "students": active_students,
        "staff": active_staff,
        "attendancePercent": round(present_count * 100 / attendance_total, 1) if attendance_total else 0,
        "pendingMovements": pending_movements,
        "campusCount": sum(item.direction == MovementDirection.INWARD for item in latest_person_status.values()),
        "entries": sum(item.direction == MovementDirection.INWARD for item in movement_today),
        "exits": sum(item.direction == MovementDirection.OUTWARD for item in movement_today),
        "attendanceWeek": attendance_week,
        "gradeDistribution": grade_distribution,
        "movements": movements,
    }
