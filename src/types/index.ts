export type Role = 'Principal' | 'Office Staff' | 'Teacher' | 'Parent' | 'Student' | 'Security Guard'

export interface Student {
  id: string
  name: string
  grade: string
  section: string
  gender: 'Female' | 'Male' | 'Other'
  blood: string
  dob: string
  enrolled: string
  parent: string
  phone: string
  attendance: number
  avatar: string
  condition: string
  allergies?: string
  guardianAlternatePhone?: string
  guardianOccupation?: string
  guardianAddress?: string
  status?: string
}

export interface Staff {
  id: string
  name: string
  role: string
  department: string
  type: 'Teacher' | 'Non-Academic'
  email: string
  phone: string
  since: string
  avatar: string
  status?: string
}

export interface Movement {
  id: string
  recordId?: string
  name: string
  category: 'Student' | 'Staff' | 'Visitor'
  direction: 'Inward' | 'Outward'
  time: string
  purpose: string
  status: 'Cleared' | 'Pending' | 'Authorized'
}
