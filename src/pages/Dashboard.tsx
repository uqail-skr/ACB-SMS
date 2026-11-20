import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarCheck, Clock3, DoorOpen, GraduationCap, MoreHorizontal, Shield, Users, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, apiError, type DashboardData, type ReportData } from '../api'
import { useAuth } from '../context/AuthContext'
import { Avatar, Button, PageHeading, StatCard, StatusBadge } from '../components/Shared'
import type { Student } from '../types'

export function Dashboard() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.dashboard().then(setData).catch((reason: unknown) => setError(apiError(reason)))
  }, [])
  const studentView = role === 'Parent' || role === 'Student'
  const teacherView = role === 'Teacher'
  const guardView = role === 'Security Guard'

  return <div>
    <PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} title={`Good morning, ${role === 'Principal' ? 'Sarah' : role === 'Teacher' ? 'Olivia' : role === 'Security Guard' ? 'Marcus' : role === 'Parent' ? 'James' : role === 'Student' ? 'Ava' : 'Jordan'} 👋`} description={studentView ? 'Here’s a look at your learning journey this term.' : 'Here’s what’s happening across your school today.'} action={<Button variant="secondary" onClick={() => window.print()}><span>↧</span> Download report</Button>} />
    {error && <div className="empty-state" role="alert">Dashboard data could not be loaded: {error}</div>}
    {data && (studentView ? <StudentDashboard parent={role === 'Parent'} /> : teacherView ? <TeacherDashboard /> : guardView ? <GuardDashboard data={data} onOpenGate={() => navigate('/gate-register')} /> : <AdminDashboard role={role} data={data} onOpenGate={() => navigate('/gate-register')} />)}
    {!data && !error && <p>Loading dashboard data…</p>}
  </div>
}

function AdminDashboard({ role, data, onOpenGate }: { role: string; data: DashboardData; onOpenGate: () => void }) {
  const gradeTotal = data.gradeDistribution.reduce((total, item) => total + item.count, 0)
  return <div className="dashboard-grid">
    <section className="stat-grid">
      <StatCard label="Total students" value={data.students.toLocaleString()} delta="Active enrollment" icon={<Users size={19} />} />
      <StatCard label="Total staff" value={data.staff.toLocaleString()} delta="Active staff records" icon={<GraduationCap size={19} />} tone="purple" />
      <StatCard label="Today's attendance" value={`${data.attendancePercent}%`} delta="Based on latest recorded date" icon={<CalendarCheck size={19} />} tone="green" />
      <StatCard label="Campus right now" value={data.campusCount.toLocaleString()} delta={`${data.entries} inward · ${data.exits} outward`} icon={<DoorOpen size={19} />} tone="amber" />
    </section>
    <section className="chart-card attendance-chart"><div className="card-heading"><div><h2>Attendance overview</h2><p>Daily attendance across recorded dates</p></div><button className="text-button">Recent records <span>⌄</span></button></div><div className="chart-summary"><strong>{data.attendancePercent}%</strong><small>latest recorded attendance</small></div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.attendanceWeek} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8a94a5', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8a94a5', fontSize: 10 }} /><Tooltip cursor={{ fill: '#f5f7fb' }} /><Bar dataKey="present" name="Present %" fill="#4778e7" radius={[4, 4, 0, 0]} barSize={24} /><Bar dataKey="absent" name="Absent %" fill="#dce6fa" radius={[4, 4, 0, 0]} barSize={24} /></BarChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-blue" />Present</span><span><i className="legend-light" />Absent</span></div></section>
    <section className="chart-card grade-chart"><div className="card-heading"><div><h2>Grade distribution</h2><p>Student performance, mid-term</p></div><button className="more-button"><MoreHorizontal size={19} /></button></div><div className="pie-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.gradeDistribution} dataKey="count" nameKey="grade" innerRadius={66} outerRadius={88} paddingAngle={3} stroke="none">{data.gradeDistribution.map((item) => <Cell key={item.grade} fill={item.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pie-center"><strong>{gradeTotal}</strong><span>assessments</span></div></div><div className="grade-legend">{data.gradeDistribution.map((item) => <div key={item.grade}><i style={{ backgroundColor: item.fill }} /><span>Grade {item.grade}</span><strong>{item.count}</strong></div>)}</div></section>
    <section className="panel audit-panel"><div className="card-heading"><div><h2>{role === 'Principal' ? 'Recent activity' : 'Today at a glance'}</h2><p>Latest updates from around the school</p></div><button className="text-button" onClick={onOpenGate}>View all <ArrowRight size={14} /></button></div><div className="activity-list">{data.movements.slice(0, 4).map((movement, index) => <div className="activity-row" key={movement.id}><Avatar initials={movement.name.split(' ').map((part) => part[0]).join('')} size="small" /><div className="activity-copy"><strong>{movement.name}</strong><span>logged {movement.direction.toLowerCase()} {movement.category.toLowerCase()} movement · {movement.purpose}</span></div><time>{movement.time}</time><i className={`activity-dot ${['blue', 'green', 'purple', 'amber'][index]}`} /></div>)}</div></section>
    <section className="panel arrivals-panel"><div className="card-heading"><div><h2>Latest gate activity</h2><p>Live campus movement</p></div><button className="more-button" onClick={onOpenGate}><MoreHorizontal size={19} /></button></div>{data.movements.slice(0, 4).map((movement) => <div className="mini-movement" key={movement.id}><span className={`movement-arrow ${movement.direction.toLowerCase()}`}>{movement.direction === 'Inward' ? '↙' : '↗'}</span><div><strong>{movement.name}</strong><span>{movement.category} · {movement.direction}</span></div><time>{movement.time}</time></div>)}<button className="panel-link" onClick={onOpenGate}>View gate register <ArrowRight size={14} /></button></section>
  </div>
}

function TeacherDashboard() {
  const navigate = useNavigate()
  return <div className="dashboard-grid">
    <section className="stat-grid">
      <StatCard label="Classes today" value="4" delta="Next class · Grade 8A, 11:15 AM" icon={<BookOpen size={19} />} />
      <StatCard label="Students in my classes" value="126" delta="Across 4 sections" icon={<Users size={19} />} tone="purple" />
      <StatCard label="Attendance to submit" value="1" delta="Grade 8A · due by 12:00 PM" icon={<CalendarCheck size={19} />} tone="amber" />
      <StatCard label="Marks to complete" value="2" delta="Mid-term · Grade 7 & 8" icon={<Clock3 size={19} />} tone="green" />
    </section>
    <section className="panel schedule-panel"><div className="card-heading"><div><h2>My classes today</h2><p>Academic schedule</p></div><button className="text-button" onClick={() => navigate('/gradebook')}>Open gradebook <ArrowRight size={14} /></button></div>{[['08:30', '09:15', 'Grade 7A', 'Mathematics', 'Room 204', 'done'], ['09:30', '10:15', 'Grade 8B', 'Mathematics', 'Room 204', 'done'], ['11:15', '12:00', 'Grade 8A', 'Mathematics', 'Room 204', 'next'], ['01:15', '02:00', 'Grade 9A', 'Mathematics', 'Room 204', 'upcoming']].map(([start, end, grade, subject, room, status]) => <div className={`class-row ${status}`} key={start}><div className="class-time">{start}<span>{end}</span></div><i className="class-line" /><div className="class-details"><strong>{grade} <span>·</span> {subject}</strong><span>{room} <span>·</span> 32 students</span></div><div className="class-status">{status === 'done' ? <StatusBadge>Completed</StatusBadge> : status === 'next' ? <Button onClick={() => navigate('/attendance')}>Take attendance</Button> : <span className="muted-status">Upcoming</span>}</div></div>)}</section>
    <section className="panel tasks-panel"><div className="card-heading"><div><h2>Quick tasks</h2><p>Keep your classes up to date</p></div></div><button className="task-card" onClick={() => navigate('/attendance')}><span className="task-icon blue"><CalendarCheck size={18} /></span><span><strong>Submit attendance</strong><small>Record today's attendance</small></span><ArrowRight size={16} /></button><button className="task-card" onClick={() => navigate('/gradebook')}><span className="task-icon purple"><BookOpen size={18} /></span><span><strong>Complete assessment marks</strong><small>Open the gradebook</small></span><ArrowRight size={16} /></button><button className="task-card" onClick={() => navigate('/reports')}><span className="task-icon green"><ClipboardList size={18} /></span><span><strong>Review report comments</strong><small>Open student reports</small></span><ArrowRight size={16} /></button></section>
    <section className="panel class-list-panel"><div className="card-heading"><div><h2>Class snapshot</h2><p>Attendance by homeroom today</p></div></div>{['Grade 7A', 'Grade 8A', 'Grade 8B', 'Grade 9A'].map((grade, i) => <div className="snapshot-row" key={grade}><span>{grade}</span><div className="progress-track"><div style={{ width: `${[97, 88, 100, 94][i]}%` }} /></div><strong>{[97, 88, 100, 94][i]}%</strong></div>)}</section>
  </div>
}

function GuardDashboard({ data, onOpenGate }: { data: DashboardData; onOpenGate: () => void }) {
  return <div className="dashboard-grid">
    <section className="stat-grid">
      <StatCard label="Currently on campus" value={data.campusCount.toLocaleString()} delta="Based on latest gate movements" icon={<Users size={19} />} />
      <StatCard label="Entries today" value={data.entries.toLocaleString()} delta="Latest movement date" icon={<ArrowDownRight size={19} />} tone="green" />
      <StatCard label="Exits today" value={data.exits.toLocaleString()} delta="Latest movement date" icon={<ArrowUpRight size={19} />} tone="amber" />
      <StatCard label="Awaiting approval" value={data.pendingMovements.toLocaleString()} delta="Pending gate movements" icon={<Shield size={19} />} tone="purple" />
    </section>
    <section className="panel guard-actions"><div className="card-heading"><div><h2>Quick entry</h2><p>Log a campus movement</p></div><span className="live-pill"><i /> Live</span></div><p className="guard-hint">Choose an action to start a new gate register entry.</p><div className="gate-action-grid"><button className="gate-action inward-action" onClick={onOpenGate}><span>↙</span><strong>Log an arrival</strong><small>Record an inward entry</small><ArrowRight size={16} /></button><button className="gate-action outward-action" onClick={onOpenGate}><span>↗</span><strong>Log a departure</strong><small>Record an outward exit</small><ArrowRight size={16} /></button></div></section>
    <section className="panel gate-live"><div className="card-heading"><div><h2>Live campus traffic</h2><p>Most recent movements at the main gate</p></div><span className="live-pill"><i /> Updating</span></div>{data.movements.slice(0, 7).map((item) => <div className="mini-movement" key={item.id}><span className={`movement-arrow ${item.direction.toLowerCase()}`}>{item.direction === 'Inward' ? '↙' : '↗'}</span><div><strong>{item.name}</strong><span>{item.category} · {item.purpose}</span></div><StatusBadge>{item.direction}</StatusBadge><time>{item.time}</time></div>)}</section>
    <section className="panel guard-notice"><div className="notice-shield"><Shield size={20} /></div><div><strong>Campus safety is looking good</strong><span>All visitor check-ins are being tracked. Keep your register up to date throughout the day.</span></div></section>
  </div>
}

function StudentDashboard({ parent }: { parent: boolean }) {
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState('')
  const term = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}-MIDTERM`
  useEffect(() => {
    api.students().then((items) => {
      const selected = parent
        ? items.find((item) => item.parent !== 'No guardian on file') ?? items[0]
        : items[0]
      if (selected) setStudent(selected)
    }).catch((reason: unknown) => setError(apiError(reason)))
  }, [parent])
  useEffect(() => {
    if (student) api.report(student.id, term).then(setReport).catch((reason: unknown) => setError(apiError(reason)))
  }, [student, term])
  const average = report?.rows.length
    ? Math.round(report.rows.reduce((total, item) => total + item.average, 0) / report.rows.length)
    : 0
  const averageGrade = average >= 90 ? 'A' : average >= 80 ? 'B+' : average >= 70 ? 'B' : 'C'
  return <div className="dashboard-grid">
    {error && <div className="empty-state" role="alert">Student dashboard data could not be loaded: {error}</div>}
    <section className="student-welcome panel"><div className="student-welcome-main"><div className="student-illustration"><GraduationCap size={46} /></div><div><span className="welcome-label">{parent ? 'YOUR CHILD' : 'MY PROFILE'}</span><h2>{student?.name ?? 'Loading student…'}</h2><p>{student ? `${student.grade} · ${student.section} · Student ID ${student.id}` : 'Student profile from the database'}</p></div></div><div className="welcome-term"><span>ACADEMIC YEAR</span><strong>{report?.academic_year ?? 'Loading…'}</strong><span className="term-pill">Mid-term</span></div></section>
    <section className="student-stat-row">
      <div className="student-metric"><span className="metric-title">Attendance rate</span><div className="gauge-wrap"><div className="gauge"><div className="gauge-inner"><strong>{student?.attendance ?? 0}%</strong><span>recorded attendance</span></div></div><span className="gauge-note"><i /> From attendance records</span></div></div>
      <div className="student-metric marks-metric"><span className="metric-title">Academic average</span><strong className="average-grade">{averageGrade} <small>{average}%</small></strong><div className="mini-bars">{(report?.rows ?? []).map((item) => <i key={item.name} style={{ height: `${Math.min(100, item.average)}%` }} />)}</div><span className="gauge-note"><i /> From assessment records</span></div>
    </section>
    <section className="panel recent-marks"><div className="card-heading"><div><h2>Recent assessment results</h2><p>Mid-term · {report?.academic_year ?? 'Loading…'}</p></div><button className="text-button" onClick={() => navigate('/reports')}>View report card <ArrowRight size={14} /></button></div>{(report?.rows ?? []).map((item) => <div className="mark-row" key={item.name}><span className="subject-swatch" /><strong>{item.name}</strong><div className="mark-progress"><i style={{ width: `${item.average}%` }} /></div><strong>{item.average}<small>/ 100</small></strong><span className="grade-chip">{item.grade}</span></div>)}</section>
    <section className="panel announcements"><div className="card-heading"><div><h2>School announcements</h2><p>News and updates for your family</p></div><span className="announcement-count">2 new</span></div>{[['OCT 24', 'Science Fair — Save the date', 'Join us for an afternoon of student projects and experiments.', 'blue'], ['OCT 18', 'Parent–teacher conference sign-up', 'Book your preferred time slot before October 28.', 'amber'], ['OCT 15', 'Library hours extended', 'The school library is now open until 4:30 PM.', 'green']].map(([date, title, copy, tone]) => <div className="announcement-row" key={title}><span className={`announcement-date ${tone}`}>{date}</span><div><strong>{title}</strong><p>{copy}</p></div></div>)}</section>
  </div>
}
