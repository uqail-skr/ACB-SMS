import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, BookOpen, Check, FileText, MessageSquare, Printer, Save, Search, Sparkles } from 'lucide-react'
import { api, apiError, downloadCsv, type GradebookRecord } from '../api'
import { useAuth } from '../context/AuthContext'
import { Avatar, Button, PageHeading, SearchBox, Select, Toast } from '../components/Shared'
import type { Student } from '../types'

const subjects = ['Mathematics', 'English Language', 'General Science', 'Social Studies', 'Art & Design', 'Computer Science', 'Physical Education', 'Music', 'Civic Studies', 'World Languages']
export function GradebookPage() {
  const { role } = useAuth()
  const [className, setClassName] = useState('Grade 7A')
  const [subject, setSubject] = useState('Mathematics')
  const [assessment, setAssessment] = useState('Mid-term')
  const [marks, setMarks] = useState<GradebookRecord[]>([])
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const readOnly = role !== 'Teacher'
  const [, selectedGrade = 'Grade 7', selectedSection = 'A'] = className.match(/^(Grade \d+)([A-Z])$/) ?? []
  useEffect(() => {
    setDirty(false)
    api.gradebook(selectedGrade, selectedSection, subject)
      .then(({ records }) => { setMarks(records); setError('') })
      .catch((reason: unknown) => setError(apiError(reason)))
  }, [selectedGrade, selectedSection, subject])
  useEffect(() => {
    if (!dirty || readOnly) return
    const timer = window.setTimeout(() => {
      setSaving(true)
      api.saveGradebook(selectedGrade, selectedSection, subject, marks)
        .then(() => { setDirty(false); setError('') })
        .catch((reason: unknown) => setError(apiError(reason)))
        .finally(() => setSaving(false))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [dirty, marks, readOnly, selectedGrade, selectedSection, subject])
  const filtered = useMemo(() => marks.filter((mark) => mark.name.toLowerCase().includes(query.toLowerCase())), [marks, query])
  const updateMark = (id: string, key: 'midterm' | 'yearly', value: number) => {
    setMarks((current) => current.map((mark) => mark.id === id ? { ...mark, [key]: Math.min(100, Math.max(0, value)) } : mark))
    setDirty(true)
  }
  const updateRemark = (id: string, remark: string) => {
    setMarks((current) => current.map((mark) => mark.id === id ? { ...mark, remark } : mark))
    setDirty(true)
  }
  const saveNow = async (message: string) => {
    setSaving(true)
    try {
      await api.saveGradebook(selectedGrade, selectedSection, subject, marks)
      setDirty(false)
      setError('')
      setToast(message)
    } catch (reason) {
      setError(apiError(reason))
    } finally {
      setSaving(false)
    }
  }
  return <div>
    <PageHeading eyebrow="ACADEMIC TOOLS" title="Gradebook" description="Enter, review, and manage student assessment results." action={<Button variant="secondary" onClick={() => downloadCsv(`gradebook-${selectedGrade}-${selectedSection}-${subject.toLowerCase().replace(/ /g, '-')}.csv`, [['Student ID', 'Student', 'Grade', 'Section', 'Mid-term', 'Yearly', 'Remark'], ...marks.map((mark) => [mark.id, mark.name, mark.grade, mark.section, String(mark.midterm), String(mark.yearly), mark.remark])])}><ArrowDownToLine size={15} /> Export marks</Button>} />
    <section className="gradebook-selector panel"><div><span className="selector-icon"><BookOpen size={18} /></span><div><span className="field-label">CLASS & SUBJECT</span><strong>Choose your class</strong></div></div><Select value={className} onChange={(value) => { setDirty(false); setClassName(value) }} options={['Grade 5A', 'Grade 5B', 'Grade 6A', 'Grade 6B', 'Grade 7A', 'Grade 7B', 'Grade 8A', 'Grade 8B', 'Grade 9A', 'Grade 9B']} /><Select value={subject} onChange={(value) => { setDirty(false); setSubject(value) }} options={subjects} /><div className="selector-divider" /><div className="assessment-select"><button className={assessment === 'Mid-term' ? 'assessment-active' : ''} onClick={() => setAssessment('Mid-term')}>Mid-term</button><button className={assessment === 'Yearly' ? 'assessment-active' : ''} onClick={() => setAssessment('Yearly')}>Yearly</button></div></section>
    {error && <div className="empty-state" role="alert">Gradebook could not load or save: {error}</div>}
    <section className="panel data-panel gradebook-panel"><div className="data-toolbar"><div><h2>{subject} <span className="count-pill">{className}</span></h2><p>{assessment} assessment · Academic year 2026–2027</p></div><div className="toolbar-actions"><SearchBox value={query} onChange={setQuery} placeholder="Find student..." /><span className="saved-label"><i /> {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved to database'}</span></div></div><div className="table-scroll"><table className="data-table grade-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS</th><th>MID-TERM <span className="max-score">/ 100</span></th><th>YEARLY <span className="max-score">/ 100</span></th><th>OVERALL GRADE</th><th>TEACHER REMARK</th></tr></thead><tbody>{filtered.map((mark) => { const overall = Math.round((mark.midterm + mark.yearly) / 2); return <tr key={mark.id}><td><div className="table-person"><Avatar initials={mark.name.split(' ').map((part) => part[0]).join('')} size="small" /><div><strong>{mark.name}</strong><span>Roll no. {mark.id.slice(-2)}</span></div></div></td><td className="id-cell">{mark.id}</td><td>{mark.grade} · {mark.section}</td><td><input aria-label={`${mark.name} mid-term mark`} className="mark-input" type="number" min="0" max="100" disabled={readOnly} value={mark.midterm} onChange={(event) => updateMark(mark.id, 'midterm', Number(event.target.value))} /></td><td><input aria-label={`${mark.name} yearly mark`} className="mark-input" type="number" min="0" max="100" disabled={readOnly} value={mark.yearly} onChange={(event) => updateMark(mark.id, 'yearly', Number(event.target.value))} /></td><td><span className={`grade-chip ${overall < 50 ? 'grade-fail' : ''}`}>{overall >= 90 ? 'A' : overall >= 80 ? 'B+' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'F'}</span><span className="overall-score">{overall}%</span></td><td><input className="remark-input" aria-label={`${mark.name} teacher remark`} placeholder="Add a remark..." value={mark.remark} disabled={readOnly} onChange={(event) => updateRemark(mark.id, event.target.value)} /></td></tr> })}</tbody></table>{filtered.length === 0 && <div className="empty-state"><Search size={22} /><strong>{marks.length ? 'No students found' : 'No gradebook records found'}</strong><span>{marks.length ? 'Try a different search.' : 'This class and subject may not have an assessment assigned.'}</span></div>}</div><div className="gradebook-footer"><span>{readOnly ? 'View-only access · Marks are managed by the subject teacher.' : 'Edits are saved automatically to the database.'}</span><div>{!readOnly && <><Button variant="secondary" onClick={() => void saveNow('Draft saved to the database.') }><Save size={15} /> Save draft</Button><Button onClick={() => void saveNow('Marks saved to the database.') }><Check size={15} /> Submit marks</Button></>}</div></div></section>
    <div className="gradebook-note"><Sparkles size={16} /><span><strong>Tip:</strong> Enter marks from 0 to 100. Overall grades are calculated from both assessments.</span></div>
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}

export function ReportsPage() {
  const { role } = useAuth()
  const [studentData, setStudentData] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('All subjects')
  const [toast, setToast] = useState('')
  const [comments, setComments] = useState('')
  const [principalComments, setPrincipalComments] = useState('')
  const [reportData, setReportData] = useState<Awaited<ReturnType<typeof api.report>> | null>(null)
  const [error, setError] = useState('')
  const term = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}-MIDTERM`
  useEffect(() => {
    api.students().then((items) => {
      setStudentData(items)
      setStudentId((current) => current || items[0]?.id || '')
    }).catch((reason: unknown) => setError(apiError(reason)))
  }, [])
  useEffect(() => {
    if (!studentId) return
    api.report(studentId, term).then((data) => {
      setReportData(data)
      setComments(data.teacher_comment)
      setPrincipalComments(data.principal_comment)
      setError('')
    }).catch((reason: unknown) => setError(apiError(reason)))
  }, [studentId, term])
  const student = reportData?.student
  const reportRows = (reportData?.rows ?? []).filter((item) => subject === 'All subjects' || item.name === subject)
  const total = reportRows.length ? Math.round(reportRows.reduce((sum, item) => sum + item.average, 0) / reportRows.length) : 0
  const saveComments = async () => {
    try {
      await api.saveReportComments(studentId, term, comments, principalComments)
      setToast('Report comments saved to the database.')
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }
  if (!student || !reportData) {
    return <div><PageHeading eyebrow="ACADEMIC TOOLS" title="Report cards" description="Explore academic progress and generate student report cards." />{error ? <div className="empty-state" role="alert">Could not load report data: {error}</div> : <p>Loading report data from the database…</p>}</div>
  }
  return <div>
    <PageHeading eyebrow="ACADEMIC TOOLS" title="Report cards" description="Explore academic progress and generate student report cards." action={<Button variant="secondary" onClick={() => window.print()}><Printer size={15} /> Export as PDF</Button>} />
    <section className="report-controls panel"><div><span className="selector-icon"><FileText size={17} /></span><div><span className="field-label">REPORT PREVIEW</span><strong>Mid-term report · {reportData.academic_year}</strong></div></div><Select value={studentId} onChange={setStudentId} options={studentData.map((item) => item.id)} /><Select value={subject} onChange={setSubject} options={['All subjects', ...reportData.rows.map((item) => item.name)]} /></section>
    <div className="report-layout"><article className="report-card panel">
      <div className="report-brand"><span className="report-logo"><BookOpen size={20} /></span><div><strong>NORTHSTAR ACADEMY</strong><span>EXCELLENCE IN EVERY JOURNEY</span></div><div className="report-term"><span>OFFICIAL REPORT CARD</span><strong>MIDTERM · {reportData.academic_year}</strong></div></div>
      <div className="report-student-header"><div><span>STUDENT</span><h2>{student.name}</h2><p>{student.id} <i>·</i> {student.grade} · Section {student.section}</p></div><div><span>CLASS TEACHER</span><strong>{reportData.teacher}</strong><p>Academic year {reportData.academic_year}</p></div></div>
      <div className="report-score-strip"><div><span>OVERALL AVERAGE</span><strong>{total}<small>%</small></strong></div><div><span>FINAL GRADE</span><strong className="report-grade">{total >= 90 ? 'A' : total >= 80 ? 'B+' : 'B'}</strong></div><div><span>CLASS RANK</span><strong>04<small> / 32</small></strong></div><div><span>ATTENDANCE</span><strong>{student.attendance}<small>%</small></strong></div></div>
      <h3 className="report-section-heading">ACADEMIC PERFORMANCE <span>Marks out of 100</span></h3>
      <div className="table-scroll"><table className="report-table"><thead><tr><th>SUBJECT</th><th>MID-TERM</th><th>YEARLY</th><th>CLASS AVG.</th><th>TOTAL</th><th>GRADE</th></tr></thead><tbody>{reportRows.map((row) => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.mid}</td><td>{row.yearly}</td><td className="table-muted">{row.classAverage}</td><td><strong>{row.average}</strong></td><td><span className="grade-chip">{row.grade}</span></td></tr>)}</tbody></table></div>
      <div className="report-comment-grid"><div><div className="comment-title"><MessageSquare size={15} /> TEACHER'S REMARK</div><p>{comments || 'No teacher remark has been added yet.'}</p><strong className="signature">{reportData.teacher} <span>Class Teacher</span></strong></div><div><div className="comment-title"><MessageSquare size={15} /> PRINCIPAL'S REMARK</div><p>{principalComments || 'No principal remark has been added yet.'}</p><strong className="signature">Principal <span>Northstar Academy</span></strong></div></div>
      <div className="report-footer"><span>Northstar Academy · Springfield, Illinois</span><span>Generated {new Date().toLocaleDateString()}</span></div>
    </article>
    <aside className="report-side"><section className="panel report-summary"><div className="card-heading"><div><h2>At a glance</h2><p>Mid-term summary</p></div></div><div className="summary-grade"><span>Overall grade</span><strong>{total >= 90 ? 'A' : total >= 80 ? 'B+' : total >= 70 ? 'B' : 'C'}</strong><small>{total >= 80 ? 'Strong progress' : 'Keep working steadily'}</small></div><div className="summary-line"><span>Subjects passed</span><strong>{reportRows.filter((item) => item.average >= 50).length} / {reportRows.length}</strong></div><div className="summary-line"><span>Class rank</span><strong>{reportData.class_rank ? `${reportData.class_rank} of ${reportData.class_size}` : `Not ranked of ${reportData.class_size}`}</strong></div><div className="summary-line"><span>Attendance</span><strong>{student.attendance}%</strong></div><button className="outline-wide" onClick={() => window.print()}><ArrowDownToLine size={15} /> Download report card</button></section>
    <section className="panel report-comment-editor"><div className="card-heading"><div><h2>Teacher comments</h2><p>Visible on the official report</p></div></div><textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Write a comment about this student..." disabled={role !== 'Teacher' && role !== 'Principal'} />{role === 'Principal' && <textarea value={principalComments} onChange={(event) => setPrincipalComments(event.target.value)} placeholder="Principal's report comment..." />}{error && <p role="alert">{error}</p>}<Button onClick={() => void saveComments()} disabled={role !== 'Teacher' && role !== 'Principal'}><Check size={15} /> Save comments</Button></section></aside></div>
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}
