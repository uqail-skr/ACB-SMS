import type { Movement, Staff, Student } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001'

export interface AttendanceRow extends Student {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
}

export interface GradebookRecord {
  id: string
  name: string
  grade: string
  section: string
  midterm: number
  yearly: number
  remark: string
}

export interface ReportData {
  student: Student
  rows: { name: string; mid: number; yearly: number; average: number; grade: string; classAverage: number }[]
  teacher: string
  teacher_comment: string
  principal_comment: string
  academic_year: string
  class_rank: number | null
  class_size: number
}

export interface DashboardData {
  students: number
  staff: number
  attendancePercent: number
  pendingMovements: number
  campusCount: number
  entries: number
  exits: number
  attendanceWeek: { day: string; present: number; absent: number }[]
  gradeDistribution: { grade: string; count: number; fill: string }[]
  movements: Movement[]
}

export interface StudentInput {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'FEMALE' | 'MALE' | 'OTHER'
  blood_group: string
  grade: string
  section: string
  enrolled_at: string
  guardian_name: string
  guardian_phone: string
}

export interface StaffInput {
  first_name: string
  last_name: string
  designation: string
  department: string
  type: 'TEACHING' | 'NON_ACADEMIC'
  email: string
  phone: string
  hired_at: string
}

export interface StudentUpdateInput extends StudentInput {
  medical_notes: string
  allergies: string
  guardian_alternate_phone: string
  guardian_occupation: string
  guardian_address: string
}

export interface StaffUpdateInput extends StaffInput {
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const api = {
  students: () => request<Student[]>('/api/students'),
  createStudent: (student: StudentInput) => request<Student>('/api/students', { method: 'POST', body: JSON.stringify(student) }),
  updateStudent: (id: string, student: StudentUpdateInput) => request<Student>(`/api/students/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(student) }),
  staff: () => request<Staff[]>('/api/staff'),
  createStaff: (staff: StaffInput) => request<Staff>('/api/staff', { method: 'POST', body: JSON.stringify(staff) }),
  updateStaff: (id: string, staff: StaffUpdateInput) => request<Staff>(`/api/staff/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(staff) }),
  attendance: (date: string, section: string) => request<AttendanceRow[]>(`/api/attendance?date=${encodeURIComponent(date)}&section=${encodeURIComponent(section)}`),
  saveAttendance: (date: string, records: { student_number: string; status: AttendanceRow['status'] }[]) =>
    request<{ saved: number }>('/api/attendance', { method: 'PUT', body: JSON.stringify({ date, records }) }),
  movements: () => request<Movement[]>('/api/movements'),
  createMovement: (movement: { person_name: string; category: Movement['category']; direction: 'INWARD' | 'OUTWARD'; purpose: string; status: 'PENDING' | 'CLEARED' | 'AUTHORIZED'; reference?: string }) =>
    request<Movement>('/api/movements', { method: 'POST', body: JSON.stringify(movement) }),
  updateMovementStatus: (recordId: string, status: 'PENDING' | 'CLEARED' | 'AUTHORIZED') =>
    request<Movement>(`/api/movements/${encodeURIComponent(recordId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  gradebook: (grade: string, section: string, subject: string) =>
    request<{ records: GradebookRecord[] }>(`/api/gradebook?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}`),
  saveGradebook: (grade: string, section: string, subject: string, records: GradebookRecord[]) =>
    request<{ saved: number }>('/api/gradebook', {
      method: 'PUT',
      body: JSON.stringify({
        grade,
        section,
        subject,
        records: records.map(({ id, midterm, yearly, remark }) => ({ student_number: id, midterm, yearly, remark })),
      }),
    }),
  reportComments: (studentNumber: string, term: string) =>
    request<{ teacher_comment: string; principal_comment: string }>(`/api/report-comments?student_number=${encodeURIComponent(studentNumber)}&term=${encodeURIComponent(term)}`),
  report: (studentNumber: string, term: string) =>
    request<ReportData>(`/api/reports?student_number=${encodeURIComponent(studentNumber)}&term=${encodeURIComponent(term)}`),
  dashboard: () => request<DashboardData>('/api/dashboard'),
  saveReportComments: (student_number: string, term: string, teacher_comment: string, principal_comment: string) =>
    request<{ status: string }>('/api/report-comments', {
      method: 'PUT',
      body: JSON.stringify({ student_number, term, teacher_comment, principal_comment }),
    }),
}

export function apiError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const contents = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}