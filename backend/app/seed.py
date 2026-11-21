from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models import (
    AcademicYear,
    Assessment,
    AssessmentTerm,
    Attendance,
    AttendanceStatus,
    Enrollment,
    Grade,
    GradeLevel,
    Guardian,
    GateMovement,
    Gender,
    MovementDirection,
    MovementStatus,
    RecordStatus,
    Section,
    SectionSubject,
    Staff,
    StaffType,
    Student,
    StudentGuardian,
    Subject,
    Visitor,
)


def seed_database() -> None:
    with SessionLocal.begin() as db:
        if db.scalar(select(Student.id).limit(1)):
            counts = {
                "students": db.query(Student).count(),
                "staff": db.query(Staff).count(),
                "attendance": db.query(Attendance).count(),
                "assessments": db.query(Assessment).count(),
                "gate movements": db.query(GateMovement).count(),
            }
            print("Database already contains demo data; no records were changed.")
            print(", ".join(f"{name}: {count}" for name, count in counts.items()))
            return

        today = date.today()
        year = AcademicYear(
            name=f"{today.year}-{today.year + 1}",
            start_date=date(today.year, 7, 1),
            end_date=date(today.year + 1, 6, 30),
            is_current=True,
        )
        db.add(year)
        db.flush()

        staff_rows = [
            ("ST-1001", "Olivia", "Bennett", "Mathematics Teacher", "Academics", StaffType.TEACHING, "olivia.bennett@northstarschool.edu"),
            ("ST-1002", "Liam", "Foster", "English Teacher", "Academics", StaffType.TEACHING, "liam.foster@northstarschool.edu"),
            ("ST-1003", "Ava", "Mitchell", "Science Teacher", "Academics", StaffType.TEACHING, "ava.mitchell@northstarschool.edu"),
            ("ST-1004", "Marcus", "Reed", "Security Guard", "Operations", StaffType.NON_ACADEMIC, "marcus.reed@northstarschool.edu"),
        ]
        staff = []
        for number, first, last, designation, department, staff_type, email in staff_rows:
            person = Staff(
                employee_number=number,
                first_name=first,
                last_name=last,
                designation=designation,
                department=department,
                type=staff_type,
                email=email,
                phone="+1 (555) 230-4800",
                hired_at=date(today.year - 3, 8, 1),
            )
            db.add(person)
            staff.append(person)
        db.flush()

        levels = {}
        sections = {}
        for grade_number in range(5, 10):
            level = GradeLevel(name=f"Grade {grade_number}", sort_order=grade_number)
            db.add(level)
            levels[grade_number] = level
        db.flush()
        for grade_number, level in levels.items():
            for room in ("A", "B"):
                section = Section(
                    name=room,
                    grade_level_id=level.id,
                    academic_year_id=year.id,
                    homeroom_staff_id=staff[(grade_number + ord(room)) % len(staff)].id,
                )
                db.add(section)
                sections[(grade_number, room)] = section
        db.flush()

        subject_rows = [
            ("MATH", "Mathematics"),
            ("ENG", "English Language"),
            ("SCI", "General Science"),
            ("SOC", "Social Studies"),
            ("ART", "Art & Design"),
            ("COMP", "Computer Science"),
            ("PE", "Physical Education"),
            ("MUSIC", "Music"),
            ("CIVIC", "Civic Studies"),
            ("WORLD", "World Languages"),
        ]
        subjects = []
        for code, name in subject_rows:
            subject = Subject(code=code, name=name, description=f"Demo {name} curriculum")
            db.add(subject)
            subjects.append(subject)
        db.flush()

        section_subjects = []
        assessments = []
        for section in sections.values():
            for index, subject in enumerate(subjects):
                assignment = SectionSubject(
                    section_id=section.id,
                    subject_id=subject.id,
                    staff_id=staff[index % 3].id,
                )
                db.add(assignment)
                section_subjects.append(assignment)
        db.flush()
        for assignment in section_subjects:
            for term, title in (
                (AssessmentTerm.MIDTERM, "Mid-term"),
                (AssessmentTerm.FINAL, "Yearly"),
            ):
                assessment = Assessment(
                    section_subject_id=assignment.id,
                    title=f"{title} · {assignment.subject.name}",
                    term=term,
                    max_score=Decimal("100"),
                    due_date=today,
                )
                db.add(assessment)
                assessments.append(assessment)
        db.flush()

        names = [
            ("Aarav", "Sharma", Gender.MALE),
            ("Mia", "Wilson", Gender.FEMALE),
            ("Noah", "Chen", Gender.MALE),
            ("Sofia", "Reed", Gender.FEMALE),
            ("Ethan", "Patel", Gender.MALE),
            ("Aisha", "Khan", Gender.FEMALE),
            ("Lucas", "Morgan", Gender.MALE),
            ("Zara", "Carter", Gender.FEMALE),
            ("Oliver", "Brooks", Gender.MALE),
            ("Ivy", "Singh", Gender.FEMALE),
            ("Leo", "Foster", Gender.MALE),
            ("Amara", "Hayes", Gender.FEMALE),
            ("Harper", "Lee", Gender.FEMALE),
            ("Adrian", "Kim", Gender.MALE),
            ("Nadia", "Ali", Gender.FEMALE),
        ]
        students = []
        enrollments = []
        guardians = []
        for index, (first, last, gender) in enumerate(names):
            student = Student(
                student_number=f"NS-{today.year % 100:02d}{index + 1:02d}",
                first_name=first,
                last_name=last,
                date_of_birth=date(today.year - 12, (index % 12) + 1, 1),
                gender=gender,
                blood_group=("O+", "A+", "B+", "AB+")[index % 4],
                medical_notes="Seasonal allergies" if index % 5 == 0 else None,
                allergies="Pollen" if index % 5 == 0 else None,
                status=RecordStatus.ACTIVE,
            )
            db.add(student)
            students.append(student)
        db.flush()
        for index, student in enumerate(students):
            grade_number = 5 + index // 3
            section = sections[(grade_number, "A" if index % 2 == 0 else "B")]
            enrollment = Enrollment(student_id=student.id, section_id=section.id, enrolled_at=date(today.year - 1, 8, 15))
            db.add(enrollment)
            enrollments.append(enrollment)
            guardian = Guardian(
                first_name="James" if student.first_name == "Mia" else f"{student.last_name}",
                last_name="Wilson" if student.first_name == "Mia" else "Family",
                email="james.wilson@example.com" if student.first_name == "Mia" else None,
                phone="+1 (555) 438-2200",
                occupation="Parent",
                address="Springfield, Illinois",
            )
            db.add(guardian)
            guardians.append(guardian)
        db.flush()
        for student, guardian in zip(students, guardians):
            db.add(StudentGuardian(student_id=student.id, guardian_id=guardian.id, relationship_type="Parent", is_primary=True))
        db.flush()

        for enrollment in enrollments:
            db.add(
                Attendance(
                    enrollment_id=enrollment.id,
                    date=today,
                    status=AttendanceStatus.PRESENT if enrollment.id.int % 4 else AttendanceStatus.LATE,
                )
            )
            for assessment in assessments:
                assignment = next(item for item in section_subjects if item.id == assessment.section_subject_id)
                if assignment.section_id == enrollment.section_id:
                    db.add(
                        Grade(
                            assessment_id=assessment.id,
                            enrollment_id=enrollment.id,
                            score=Decimal(str(72 + enrollment.id.int % 28)),
                            remarks="Steady progress",
                        )
                    )

        visitor = Visitor(full_name="Samuel Reed", phone="+1 (555) 555-0101", organization="Northstar families")
        db.add(visitor)
        db.flush()
        for direction, status, name, purpose in (
            (MovementDirection.INWARD, MovementStatus.CLEARED, "Mia Wilson", "School arrival"),
            (MovementDirection.OUTWARD, MovementStatus.AUTHORIZED, "Noah Chen", "Medical appointment"),
            (MovementDirection.INWARD, MovementStatus.PENDING, "Samuel Reed", "Parent meeting"),
        ):
            student = next((item for item in students if f"{item.first_name} {item.last_name}" == name), None)
            db.add(
                GateMovement(
                    direction=direction,
                    status=status,
                    person_name=name,
                    purpose=purpose,
                    occurred_at=datetime.now(),
                    student_id=student.id if student else None,
                    visitor_id=visitor.id if not student else None,
                )
            )
    print("Seeded demo records for students, staff, academics, attendance, guardians, and gate movements.")


if __name__ == "__main__":
    seed_database()