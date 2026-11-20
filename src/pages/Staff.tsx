import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LayoutGrid, List, Mail, MoreHorizontal, Phone, Plus, Search, Users } from 'lucide-react'
import { api, apiError } from '../api'
import { Avatar, Button, Modal, PageHeading, SearchBox, StatusBadge, Toast } from '../components/Shared'
import type { Staff } from '../types'
import type { StaffInput, StaffUpdateInput } from '../api'

export function StaffPage() {
  const [staffData, setStaffData] = useState<Staff[]>([])
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [toast, setToast] = useState('')
  const [category, setCategory] = useState<'Teacher' | 'Non-Academic'>('Teacher')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  useEffect(() => {
    api.staff().then(setStaffData).catch((reason: unknown) => setError(apiError(reason)))
  }, [])
  const filtered = useMemo(() => staffData.filter((person) => person.type === category && `${person.name} ${person.id} ${person.role}`.toLowerCase().includes(query.toLowerCase())), [staffData, category, query])
  const teachersCount = staffData.filter((person) => person.type === 'Teacher').length
  const otherCount = staffData.filter((person) => person.type === 'Non-Academic').length
  const saveStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('name') ?? '').trim().split(/\s+/)
    const [first_name, ...last] = fullName
    const input: StaffInput = {
      first_name,
      last_name: last.join(' ') || 'Staff',
      designation: String(form.get('designation')),
      department: String(form.get('department')),
      type: String(form.get('type')) === 'Teacher' ? 'TEACHING' : 'NON_ACADEMIC',
      email: String(form.get('email')),
      phone: String(form.get('phone')),
      hired_at: String(form.get('hired')),
    }
    try {
      const person = selectedStaff
        ? await api.updateStaff(selectedStaff.id, { ...input, status: String(form.get('status')) as StaffUpdateInput['status'] })
        : await api.createStaff(input)
      setStaffData((current) => selectedStaff
        ? current.map((item) => item.id === person.id ? person : item)
        : [...current, person])
      setShowAddForm(false)
      setSelectedStaff(null)
      setToast(`${person.name} was ${selectedStaff ? 'updated in' : 'added to'} the database.`)
      setError('')
    } catch (reason) {
      setError(apiError(reason))
    }
  }
  return <div>
    <PageHeading eyebrow="PEOPLE & RECORDS" title="Staff directory" description="The people who make Northstar a great place to learn." action={<Button onClick={() => setShowAddForm(true)}><Plus size={16} /> Add staff member</Button>} />
    <div className="staff-top-stats"><div><span className="staff-stat-icon"><Users size={18} /></span><div><strong>{staffData.length}</strong><span>Total staff members</span></div></div><div><span className="staff-stat-icon purple"><Users size={18} /></span><div><strong>{teachersCount}</strong><span>Teaching staff</span></div></div><div><span className="staff-stat-icon green"><Users size={18} /></span><div><strong>{otherCount}</strong><span>Non-academic staff</span></div></div><div className="staff-online"><i /> Staff directory from database</div></div>
    {error && <div className="empty-state" role="alert">Could not load staff: {error}</div>}
    <section className="panel staff-panel">
      <div className="staff-toolbar"><div className="staff-tabs"><button className={category === 'Teacher' ? 'staff-tab-active' : ''} onClick={() => setCategory('Teacher')}>Teachers <span>{teachersCount}</span></button><button className={category === 'Non-Academic' ? 'staff-tab-active' : ''} onClick={() => setCategory('Non-Academic')}>Non-academic staff <span>{otherCount}</span></button></div><div className="toolbar-actions"><SearchBox value={query} onChange={setQuery} placeholder="Search name, ID, role..." /><div className="view-toggle"><button aria-label="Grid view" onClick={() => setView('grid')} className={view === 'grid' ? 'view-selected' : ''}><LayoutGrid size={16} /></button><button aria-label="Table view" onClick={() => setView('table')} className={view === 'table' ? 'view-selected' : ''}><List size={17} /></button></div></div></div>
      {view === 'grid' ? <div className="staff-grid">{filtered.map((person) => <article className="staff-card" key={person.id}><div className="staff-card-top"><Avatar initials={person.avatar} /><button className="more-button" aria-label={`Edit ${person.name}`} onClick={() => setSelectedStaff(person)}><MoreHorizontal size={19} /></button></div><h3>{person.name}</h3><span className="staff-role">{person.role}</span><div className="staff-card-meta"><span>{person.id}</span><StatusBadge>{person.status ?? 'Active'}</StatusBadge></div><div className="staff-card-contact"><span><Mail size={14} />{person.email}</span><span><Phone size={14} />{person.phone}</span></div><div className="staff-card-footer"><span>{person.department}</span><span>Since {person.since}</span></div></article>)}</div> : <div className="table-scroll"><table className="data-table staff-table"><thead><tr><th>STAFF MEMBER</th><th>STAFF ID</th><th>DESIGNATION</th><th>DEPARTMENT</th><th>CONTACT</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((person) => <tr key={person.id}><td><div className="table-person"><Avatar initials={person.avatar} size="small" /><div><strong>{person.name}</strong><span>{person.email}</span></div></div></td><td className="id-cell">{person.id}</td><td>{person.role}</td><td>{person.department}</td><td>{person.phone}</td><td><StatusBadge>{person.status ?? 'Active'}</StatusBadge></td><td><Button variant="secondary" onClick={() => setSelectedStaff(person)}>Edit</Button></td></tr>)}</tbody></table></div>}
      {filtered.length === 0 && <div className="empty-state"><Search size={22} /><strong>No staff found</strong><span>Try another search or staff category.</span></div>}
    </section>
    {(showAddForm || selectedStaff) && <Modal title={selectedStaff ? 'Edit staff member' : 'Add staff member'} onClose={() => { setShowAddForm(false); setSelectedStaff(null) }}><form className="entry-form" onSubmit={saveStaff}>
      <label>Full name<input name="name" required minLength={2} placeholder="Staff member name" defaultValue={selectedStaff?.name ?? ''} /></label>
      <label>Designation<input name="designation" required placeholder="e.g. Mathematics Teacher" defaultValue={selectedStaff?.role ?? ''} /></label>
      <div className="form-two-col"><label>Department<input name="department" required defaultValue={selectedStaff?.department ?? 'Academics'} /></label><label>Category<select name="type" defaultValue={selectedStaff?.type ?? 'Teacher'}><option>Teacher</option><option>Non-Academic</option></select></label></div>
      <div className="form-two-col"><label>Email<input name="email" type="email" required defaultValue={selectedStaff?.email ?? ''} /></label><label>Phone<input name="phone" type="tel" required defaultValue={selectedStaff?.phone ?? ''} /></label></div>
      <label>Hire date<input name="hired" type="date" required defaultValue={selectedStaff ? `${selectedStaff.since}-01-01` : new Date().toISOString().slice(0, 10)} /></label>
      {selectedStaff && <label>Employment status<select name="status" defaultValue={selectedStaff.status?.toUpperCase() ?? 'ACTIVE'}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></label>}
      <div className="form-actions"><Button variant="secondary" onClick={() => { setShowAddForm(false); setSelectedStaff(null) }}>Cancel</Button><Button type="submit">{selectedStaff ? 'Save changes' : 'Save staff member'}</Button></div>
    </form></Modal>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </div>
}
