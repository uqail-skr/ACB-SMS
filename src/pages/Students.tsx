import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowUpDown, Edit, Eye, Filter, Plus } from 'lucide-react'
import { api, apiError, type StudentUpdateInput } from '../api'
import type { Student } from '../types'
import { Avatar, Button, Modal, PageHeading, SearchBox, Select, StatusBadge, TablePagination, Toast } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

export function StudentsPage() {
  const { role } = useAuth()
  const [studentData, setStudentData] = useState<Student[]>([])
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('All grades')
  const [blood, setBlood] = useState('All blood types')
  const [gender, setGender] = useState('All genders')
  const [selected, setSelected] = useState<Student | null>(null)
  const [tab, setTab] = useState('Personal & academic')
  const [editing, setEditing] = useState(false)
  const [sortAscending, setSortAscending] = useState(true)
  const [page, setPage] = useState(1)
  useEffect(() => {
    api.students().then(setStudentData).catch((reason: unknown) => setError(apiError(reason)))
  }, [])
  const filtered = useMemo(() => studentData.filter((student) => {
    const matchesQuery = `${student.name} ${student.id} ${student.parent}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (grade === 'All grades' || student.grade === grade) && (blood === 'All blood types' || student.blood === blood) && (gender === 'All genders' || student.gender === gender)
  }).sort((left, right) => sortAscending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name)), [studentData, query, grade, blood, gender, sortAscending])
  const visible = filtered.slice((page - 1) * 10, page * 10)
  const canEdit = role === 'Principal' || role === 'Office Staff'
  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    const [first_name, ...last] = String(form.get('name') ?? '').trim().split(/\s+/)
    const input: StudentUpdateInput = {
      first_name,
      last_name: last.join(' ') || 'Student',
      date_of_birth: String(form.get('dob')),
      gender: String(form.get('gender')).toUpperCase() as 'FEMALE' | 'MALE' | 'OTHER',
      blood_group: String(form.get('blood')),
      grade: String(form.get('grade')),
      section: String(form.get('section')),
      enrolled_at: String(form.get('enrolled')),
      guardian_name: String(form.get('guardian')),
      guardian_phone: String(form.get('phone')),
      guardian_alternate_phone: String(form.get('alternatePhone')),
      guardian_occupation: String(form.get('occupation')),
      guardian_address: String(form.get('address')),
      medical_notes: String(form.get('medical')),
      allergies: String(form.get('allergies')),
    }
    try {
      const updated = await api.updateStudent(selected.id, input)
      setStudentData((current) => current.map((student) => student.id === updated.id ? updated : student))
      setSelected(updated)
      setEditing(false)
      setToast(`${updated.name}'s profile was updated in the database.`)
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }

  return <div>
    <PageHeading eyebrow="PEOPLE & RECORDS" title="Students" description="Manage student profiles, enrollment, and academic information." action={role === 'Parent' || role === 'Student' ? undefined : <Button onClick={() => setShowAddForm(true)}><Plus size={16} /> Add student</Button>} />
    <div className="student-summary-strip"><div><strong>{studentData.length.toLocaleString()}</strong><span>Enrolled students</span></div><i /><div><strong>{studentData.length ? (studentData.reduce((sum, student) => sum + student.attendance, 0) / studentData.length).toFixed(1) : '0.0'}%</strong><span>Average attendance</span></div><i /><div><strong>{studentData.filter((student) => student.enrolled.startsWith(String(new Date().getFullYear()))).length}</strong><span>New this term</span></div><div className="summary-link"><span>Enrollment data from database</span><span>↗</span></div></div>
    {error && <div className="empty-state" role="alert">Could not load students: {error}</div>}
    <section className="panel data-panel">
      <div className="data-toolbar"><div><h2>All students <span className="count-pill">{filtered.length}</span></h2><p>A directory of all enrolled students</p></div><div className="toolbar-actions"><SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1) }} placeholder="Search name or ID..." /></div></div>
      <div className="filter-row"><span><Filter size={14} /> Filter by</span><Select value={grade} onChange={(value) => { setGrade(value); setPage(1) }} options={['All grades', ...Array.from(new Set(studentData.map((student) => student.grade)))]} /><Select value={blood} onChange={(value) => { setBlood(value); setPage(1) }} options={['All blood types', ...Array.from(new Set(studentData.map((student) => student.blood)).values()).filter((value) => value !== '—')]} /><Select value={gender} onChange={(value) => { setGender(value); setPage(1) }} options={['All genders', ...Array.from(new Set(studentData.map((student) => student.gender)))]} /><button className="clear-filters" onClick={() => { setGrade('All grades'); setBlood('All blood types'); setGender('All genders'); setQuery('') }}>Clear all</button></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th><button className="text-button" onClick={() => setSortAscending((current) => !current)}>STUDENT <ArrowUpDown size={12} /></button></th><th>STUDENT ID</th><th>GRADE & SECTION</th><th>GENDER</th><th>BLOOD TYPE</th><th>ATTENDANCE</th><th>STATUS</th><th /></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><div className="table-person"><Avatar initials={student.avatar} size="small" /><div><strong>{student.name}</strong><span>{student.parent}</span></div></div></td><td className="id-cell">{student.id}</td><td>{student.grade} <span className="table-muted">· {student.section}</span></td><td>{student.gender}</td><td><span className="blood-chip">{student.blood}</span></td><td><div className="attendance-cell"><span>{student.attendance}%</span><div className="mini-track"><i style={{ width: `${student.attendance}%` }} /></div></div></td><td><StatusBadge>{student.status ?? 'Active'}</StatusBadge></td><td><button className="row-action" aria-label={`View ${student.name}`} onClick={() => { setSelected(student); setTab('Personal & academic') }}><Eye size={16} /></button></td></tr>)}</tbody></table>
      {visible.length === 0 && <div className="empty-state"><div>⌕</div><strong>{studentData.length ? 'No students found' : 'No students loaded'}</strong><span>{studentData.length ? 'Try adjusting your search or filters.' : 'Check the API connection and seed the database.'}</span></div>}</div>
      <TablePagination current={page} total={filtered.length} onChange={(next) => setPage(next)} />
    </section>
    {selected && <Modal title="Student profile" onClose={() => { setSelected(null); setEditing(false) }} wide>
      <div className="profile-modal-banner"><Avatar initials={selected.avatar} /><div><h3>{selected.name}</h3><span>{selected.id} <i>·</i> {selected.grade} {selected.section}</span></div><StatusBadge>Active</StatusBadge>{canEdit && <Button variant="secondary" onClick={() => setEditing((current) => !current)}><Edit size={15} /> {editing ? 'Cancel edit' : 'Edit profile'}</Button>}</div>
      {editing ? <form className="entry-form" onSubmit={saveStudent}>
        <label>Full name<input name="name" required defaultValue={selected.name} /></label>
        <div className="form-two-col"><label>Date of birth<input name="dob" type="date" required defaultValue={selected.dob} /></label><label>Gender<select name="gender" defaultValue={selected.gender}><option>Female</option><option>Male</option><option>Other</option></select></label></div>
        <div className="form-two-col"><label>Grade<select name="grade" defaultValue={selected.grade}>{Array.from(new Set(studentData.map((item) => item.grade))).map((item) => <option key={item}>{item}</option>)}</select></label><label>Section<select name="section" defaultValue={selected.section}><option>A</option><option>B</option><option>C</option></select></label></div>
        <div className="form-two-col"><label>Blood group<input name="blood" maxLength={5} defaultValue={selected.blood} /></label><label>Enrollment date<input name="enrolled" type="date" required defaultValue={selected.enrolled} /></label></div>
        <div className="form-two-col"><label>Guardian name<input name="guardian" defaultValue={selected.parent === 'No guardian on file' ? '' : selected.parent} /></label><label>Guardian phone<input name="phone" type="tel" defaultValue={selected.phone} /></label></div>
        <div className="form-two-col"><label>Alternate phone<input name="alternatePhone" type="tel" defaultValue={selected.guardianAlternatePhone} /></label><label>Occupation<input name="occupation" defaultValue={selected.guardianOccupation} /></label></div>
        <label>Home address<textarea name="address" defaultValue={selected.guardianAddress} /></label>
        <div className="form-two-col"><label>Medical notes<textarea name="medical" defaultValue={selected.condition === 'None reported' ? '' : selected.condition} /></label><label>Allergies<textarea name="allergies" defaultValue={selected.allergies === 'None reported' ? '' : selected.allergies} /></label></div>
        {error && <p role="alert">{error}</p>}
        <div className="form-actions"><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button type="submit">Save changes</Button></div>
      </form> : <>
        <div className="modal-tabs">{['Personal & academic', 'Parent / guardian', 'Emergency & health'].map((name) => <button className={tab === name ? 'modal-tab-active' : ''} key={name} onClick={() => setTab(name)}>{name}</button>)}</div>
        <div className="profile-fields">{tab === 'Personal & academic' ? <>
          <InfoField label="Full name" value={selected.name} /><InfoField label="Student ID" value={selected.id} /><InfoField label="Date of birth" value={selected.dob} /><InfoField label="Gender" value={selected.gender} /><InfoField label="Grade & section" value={`${selected.grade} · ${selected.section}`} /><InfoField label="Enrollment date" value={selected.enrolled} />
        </> : tab === 'Parent / guardian' ? <>
          <InfoField label="Primary guardian" value={selected.parent} /><InfoField label="Relationship" value="Parent" /><InfoField label="Primary contact" value={selected.phone} /><InfoField label="Alternate contact" value={selected.guardianAlternatePhone || 'Not provided'} /><InfoField label="Occupation" value={selected.guardianOccupation || 'Not provided'} /><InfoField label="Home address" value={selected.guardianAddress || 'Not provided'} wide />
        </> : <>
          <InfoField label="Blood group" value={selected.blood} /><InfoField label="Medical conditions" value={selected.condition} /><InfoField label="Known allergies" value={selected.allergies || 'None reported'} /><InfoField label="Emergency contact" value={selected.phone} /><InfoField label="Emergency contact name" value={selected.parent} />
        </>}</div>
      </>}
    </Modal>}
    {showAddForm && <Modal title="Add student" onClose={() => setShowAddForm(false)}><form className="entry-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const fullName = String(form.get('name') ?? '').trim().split(/\s+/)
      const [first_name, ...last] = fullName
      try {
        const student = await api.createStudent({
          first_name,
          last_name: last.join(' ') || 'Student',
          date_of_birth: String(form.get('dob')),
          gender: String(form.get('gender')).toUpperCase() as 'FEMALE' | 'MALE' | 'OTHER',
          blood_group: String(form.get('blood')),
          grade: String(form.get('grade')),
          section: String(form.get('section')),
          enrolled_at: String(form.get('enrolled')),
          guardian_name: String(form.get('guardian')),
          guardian_phone: String(form.get('phone')),
        })
        setStudentData((current) => [...current, student])
        setShowAddForm(false)
        setToast(`${student.name} was added to the database.`)
      } catch (reason) {
        setError(apiError(reason))
      }
    }}>
      <label>Full name<input name="name" required minLength={2} placeholder="Student name" /></label>
      <div className="form-two-col"><label>Date of birth<input name="dob" type="date" required /></label><label>Gender<select name="gender"><option>Female</option><option>Male</option><option>Other</option></select></label></div>
      <div className="form-two-col"><label>Grade<select name="grade">{Array.from(new Set(studentData.map((item) => item.grade))).map((item) => <option key={item}>{item}</option>)}</select></label><label>Section<select name="section"><option>A</option><option>B</option><option>C</option></select></label></div>
      <div className="form-two-col"><label>Blood group<input name="blood" maxLength={5} /></label><label>Enrollment date<input name="enrolled" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label></div>
      <div className="form-two-col"><label>Guardian name<input name="guardian" /></label><label>Guardian phone<input name="phone" type="tel" /></label></div>
      <div className="form-actions"><Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button><Button type="submit">Save student</Button></div>
    </form></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}

function InfoField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`info-field ${wide ? 'field-wide' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}
