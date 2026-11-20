import { useState, type ReactNode } from 'react'
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>
}

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick} disabled={disabled}>{children}</button>
}

export function StatCard({ label, value, delta, icon, tone = 'blue' }: { label: string; value: string; delta?: ReactNode; icon: ReactNode; tone?: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{delta && <div className="stat-delta">{delta}</div>}</div>
}

export function Avatar({ initials, size = 'normal' }: { initials: string; size?: 'normal' | 'small' }) {
  return <div className={`avatar ${size === 'small' ? 'avatar-small' : ''}`}>{initials}</div>
}

export function StatusBadge({ children }: { children: string }) {
  const type = children.toLowerCase().replace(/ /g, '-')
  return <span className={`badge badge-${type}`}>{children}</span>
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-box"><Search size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label?: string }) {
  return <label className="select-wrap">{label && <span>{label}</span>}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></label>
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</section></div>
}

export function TablePagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  return <div className="pagination"><span>Showing <strong>{Math.min(10, total)} of {total}</strong> records</span><div className="pagination-actions"><button aria-label="Previous page" onClick={() => onChange(Math.max(1, current - 1))}><ChevronLeft size={16} /></button><span className="page-current">{current}</span><button aria-label="Next page" onClick={() => onChange(current + 1)}><ChevronRight size={16} /></button></div></div>
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast"><span className="toast-check">✓</span><span>{message}</span><button onClick={onClose} aria-label="Dismiss notification"><X size={15} /></button></div>
}

export function Notifications() {
  const [open, setOpen] = useState(false)
  return <div className="notification-anchor"><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setOpen(!open)}><Bell size={18} /><i /></button>{open && <div className="notification-popover"><strong>Notifications</strong><p><span className="notification-dot" />3 mark submissions need review</p><p><span className="notification-dot amber-dot" />New visitor awaiting approval</p><p><span className="notification-dot green-dot" />Attendance report is ready</p><button className="popover-link" onClick={() => setOpen(false)}>Mark all as read</button></div>}</div>
}

export function ExportButton({ label = 'Export' }: { label?: string }) {
  return <Button variant="secondary" onClick={() => window.print()}><Download size={15} />{label}</Button>
}
