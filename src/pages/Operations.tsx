import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Clock3, Download, Plus, Search, ShieldCheck } from 'lucide-react'
import { api, apiError, downloadCsv, type AttendanceRow } from '../api'
import type { Movement } from '../types'
import { Avatar, Button, Modal, PageHeading, SearchBox, Select, StatusBadge, Toast } from '../components/Shared'
import { useAuth } from '../context/AuthContext'

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused'

export function AttendancePage() {
  const { role } = useAuth()
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [statuses, setStatuses] = useState<Record<string, AttendanceRow['status']>>({})
  const [grade, setGrade] = useState('Grade 7 A')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    api.attendance(date, grade).then((records) => {
      setRows(records)
      setStatuses(Object.fromEntries(records.map((record) => [record.id, record.status])))
      setError('')
    }).catch((reason: unknown) => setError(apiError(reason)))
  }, [date, grade])
  const canEdit = role === 'Teacher' || role === 'Office Staff' || role === 'Principal'
  const visibleRows = rows.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()))
  const present = Object.values(statuses).filter((status) => status === 'PRESENT').length
  const absent = Object.values(statuses).filter((status) => status === 'ABSENT').length
  const late = Object.values(statuses).filter((status) => status === 'LATE').length
  const setStatus = async (id: string, value: AttendanceStatus) => {
    const previous = statuses[id]
    const next = value.toUpperCase() as AttendanceRow['status']
    setStatuses((current) => ({ ...current, [id]: next }))
    try {
      await api.saveAttendance(date, [{ student_number: id, status: next }])
    } catch (reason) {
      setStatuses((current) => ({ ...current, [id]: previous }))
      setError(apiError(reason))
    }
  }
  const saveAll = async () => {
    try {
      await api.saveAttendance(date, rows.map((row) => ({ student_number: row.id, status: statuses[row.id] ?? 'PRESENT' })))
      setToast('Attendance saved to the database.')
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }
  return <div>
    <PageHeading eyebrow="DAILY RECORDS" title="Class attendance" description="Record and review daily student attendance." action={<Button variant="secondary" onClick={() => downloadCsv(`attendance-${date}.csv`, [['Student ID', 'Student', 'Grade', 'Section', 'Status'], ...rows.map((row) => [row.id, row.name, row.grade, row.section, (statuses[row.id] ?? 'PRESENT').toLowerCase()])])}><Download size={15} /> Export report</Button>} />
    <div className="attendance-controls panel"><div className="attendance-control-group"><label className="field-label">CLASS</label><Select value={grade} onChange={setGrade} options={['Grade 5 A', 'Grade 5 B', 'Grade 6 A', 'Grade 6 B', 'Grade 7 A', 'Grade 7 B', 'Grade 8 A', 'Grade 8 B', 'Grade 9 A', 'Grade 9 B']} /></div><div className="attendance-control-group"><label className="field-label">DATE</label><input className="input-control" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="attendance-totals"><span className="attendance-count present-count"><i /> {present} Present</span><span className="attendance-count absent-count"><i /> {absent} Absent</span><span className="attendance-count late-count"><i /> {late} Late</span></div><SearchBox value={query} onChange={setQuery} placeholder="Find a student..." /></div>
    {error && <div className="empty-state" role="alert">Attendance could not be saved or loaded: {error}</div>}
    <section className="panel data-panel attendance-panel"><div className="data-toolbar"><div><h2>Attendance register <span className="count-pill">{visibleRows.length} students</span></h2><p>Changes are saved to the database as you mark each student.</p></div><span className="saved-label"><i /> Database-backed</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>GRADE</th><th>STATUS</th><th>MARK AS</th></tr></thead><tbody>{visibleRows.map((student) => <tr key={student.id}><td><div className="table-person"><Avatar initials={student.avatar} size="small" /><div><strong>{student.name}</strong><span>Roll no. {student.id.slice(-2)}</span></div></div></td><td className="id-cell">{student.id}</td><td>{student.grade} · {student.section}</td><td><StatusBadge>{(statuses[student.id] ?? 'PRESENT').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</StatusBadge></td><td>{canEdit ? <div className="status-toggle">{(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map((status) => <button key={status} title={`Mark ${status}`} aria-label={`Mark ${student.name} ${status}`} className={`${status.toLowerCase()} ${(statuses[student.id] ?? 'PRESENT') === status.toUpperCase() ? 'status-selected' : ''}`} onClick={() => void setStatus(student.id, status)}>{status === 'Present' ? <Check size={14} /> : status === 'Late' ? <Clock3 size={14} /> : status === 'Absent' ? 'A' : 'E'}</button>)}</div> : <span className="muted-status">Read only</span>}</td></tr>)}</tbody></table>{visibleRows.length === 0 && <div className="empty-state"><strong>{rows.length ? 'No students match this search' : 'No students in this class'}</strong><span>{rows.length ? 'Try another student name.' : 'Check the class selection and database.'}</span></div>}</div><div className="attendance-footer"><span>Selected date: {date}</span>{canEdit && <Button onClick={() => void saveAll()}>Save attendance <Check size={15} /></Button>}</div></section>
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}

export function GatePage() {
  const { role } = useAuth()
  const [entries, setEntries] = useState<Movement[]>([])
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('All movements')
  const [formDirection, setFormDirection] = useState<'Inward' | 'Outward'>('Inward')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    api.movements().then(setEntries).catch((reason: unknown) => setError(apiError(reason)))
  }, [])
  const canEdit = role === 'Security Guard' || role === 'Office Staff' || role === 'Principal'
  const filtered = useMemo(() => entries.filter((item) => `${item.name} ${item.id} ${item.purpose}`.toLowerCase().includes(search.toLowerCase()) && (direction === 'All movements' || item.direction === direction)), [entries, search, direction])
  const submitEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    if (!name) return
    try {
      const newEntry = await api.createMovement({
        person_name: name,
        category: String(form.get('category')) as Movement['category'],
        direction: formDirection.toUpperCase() as 'INWARD' | 'OUTWARD',
        purpose: String(form.get('purpose')),
        status: formDirection === 'Outward' && form.get('approval') !== 'yes' ? 'PENDING' : formDirection === 'Outward' ? 'AUTHORIZED' : 'CLEARED',
        reference: String(form.get('reference') || '').trim() || undefined,
      })
      setEntries((current) => [newEntry, ...current])
      setShowForm(false)
      setToast(`${formDirection} movement saved to the database.`)
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }
  const approveMovement = async (item: Movement) => {
    if (!item.recordId) return
    try {
      const updated = await api.updateMovementStatus(item.recordId, 'AUTHORIZED')
      setEntries((current) => current.map((entry) => entry.recordId === updated.recordId ? updated : entry))
      setToast(`${item.name}'s movement was authorized.`)
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }
  const todayEntries = entries.filter((item) => item.direction === 'Inward').length
  const todayExits = entries.filter((item) => item.direction === 'Outward').length
  const latestMovementByPerson = new Map<string, Movement>()
  for (const entry of [...entries].reverse()) latestMovementByPerson.set(entry.name, entry)
  const onCampus = Array.from(latestMovementByPerson.values()).filter((item) => item.direction === 'Inward').length
  return <div>
    <PageHeading eyebrow="CAMPUS SAFETY" title="Gate register" description="Track arrivals and departures across your campus." action={canEdit ? <Button onClick={() => { setFormDirection('Inward'); setShowForm(true) }}><Plus size={16} /> New entry</Button> : undefined} />
    <div className="gate-kpi-row"><div className="gate-kpi"><span className="gate-kpi-icon inward"><ArrowDownLeft size={18} /></span><div><span>Inward movements</span><strong>{todayEntries}</strong></div><small>Recorded</small></div><div className="gate-kpi"><span className="gate-kpi-icon outward"><ArrowUpRight size={18} /></span><div><span>Outward movements</span><strong>{todayExits}</strong></div><small>Recorded</small></div><div className="gate-kpi"><span className="gate-kpi-icon on-campus"><ShieldCheck size={18} /></span><div><span>Last known on campus</span><strong>{onCampus}</strong></div><small className="live-pill"><i /> Live</small></div><div className="gate-kpi"><span className="gate-kpi-icon awaiting"><Clock3 size={18} /></span><div><span>Awaiting approval</span><strong>{entries.filter((item) => item.status === 'Pending').length}</strong></div><small>Requires attention</small></div></div>
    <div className="gate-quick-row"><div><h2>Movement log</h2><p>All activity recorded at the school gates today.</p></div>{canEdit && <div className="quick-actions"><Button variant="secondary" onClick={() => { setFormDirection('Inward'); setShowForm(true) }}><ArrowDownLeft size={15} /> Log arrival</Button><Button variant="secondary" onClick={() => { setFormDirection('Outward'); setShowForm(true) }}><ArrowUpRight size={15} /> Log departure</Button></div>}</div>
    {error && <div className="empty-state" role="alert">Gate movements could not be loaded or saved: {error}</div>}
    <section className="panel data-panel"><div className="data-toolbar"><div><h2>Movement log <span className="count-pill">{filtered.length}</span></h2><p>{new Date().toLocaleDateString()} <span className="live-dot-inline">· Database-backed</span></p></div><div className="toolbar-actions"><SearchBox value={search} onChange={setSearch} placeholder="Search name or reference..." /><Select value={direction} onChange={setDirection} options={['All movements', 'Inward', 'Outward']} /></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>REFERENCE</th><th>PERSON</th><th>CATEGORY</th><th>DIRECTION</th><th>TIME</th><th>PURPOSE / DESTINATION</th><th>APPROVAL</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td className="id-cell">{item.id}</td><td><div className="table-person"><Avatar initials={item.name.split(' ').map((part) => part[0]).join('')} size="small" /><div><strong>{item.name}</strong><span>{item.category === 'Student' ? 'Student' : item.category === 'Staff' ? 'Staff member' : 'Visitor'}</span></div></div></td><td>{item.category}</td><td><span className={`direction-label ${item.direction.toLowerCase()}`}>{item.direction === 'Inward' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{item.direction}</span></td><td>{item.time}</td><td>{item.purpose}</td><td><div className="toolbar-actions"><StatusBadge>{item.status}</StatusBadge>{canEdit && item.status === 'Pending' && item.recordId && <Button variant="secondary" onClick={() => void approveMovement(item)}>Approve</Button>}</div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><strong>No movements found</strong><span>Try another name or movement type.</span></div>}</div></section>
    {showForm && <Modal title={`Log ${formDirection.toLowerCase()} movement`} onClose={() => setShowForm(false)}><form className="entry-form" onSubmit={submitEntry}>
      <div className="form-two-col"><label>Person's name<input name="name" required placeholder="Enter full name" /></label><label>Category<select name="category"><option>Student</option><option>Staff</option><option>Visitor</option></select></label></div>
      <div className="form-two-col"><label>{formDirection === 'Inward' ? 'Reference ID' : 'Student / staff ID'}<input name="reference" placeholder="e.g. NS-2401" /></label><label>{formDirection === 'Inward' ? 'Arrival time' : 'Departure time'}<input name="time" type="time" defaultValue="10:45" /></label></div>
      <label>{formDirection === 'Inward' ? 'Entry purpose' : 'Destination / reason'}<input name="purpose" required placeholder={formDirection === 'Inward' ? 'School arrival, parent meeting...' : 'Early departure, appointment...'} /></label>
      {formDirection === 'Outward' && <label className="approval-check"><input type="checkbox" name="approval" value="yes" /> Early departure authorization approved</label>}
      <div className="form-actions"><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit">Save entry</Button></div>
    </form></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}
