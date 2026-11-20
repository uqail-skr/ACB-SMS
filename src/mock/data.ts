import type { Movement, Staff, Student } from '../types'

const firstNames = ['Aarav', 'Mia', 'Noah', 'Sofia', 'Ethan', 'Aisha', 'Lucas', 'Zara', 'Oliver', 'Ivy', 'Leo', 'Amara', 'James', 'Ella', 'Arjun']
const lastNames = ['Sharma', 'Patel', 'Wilson', 'Reed', 'Chen', 'Khan', 'Morgan', 'Carter', 'Brooks', 'Singh', 'Bennett', 'Foster', 'Hayes', 'Cole', 'Mehta']

export const students: Student[] = firstNames.map((name, i) => ({
  id: `NS-${String(2401 + i).padStart(4, '0')}`,
  name: `${name} ${lastNames[i]}`,
  grade: `Grade ${Math.floor(i / 3) + 5}`,
  section: ['A', 'B', 'C'][i % 3],
  gender: i % 2 ? 'Female' : 'Male',
  blood: ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-'][i % 6],
  dob: `${String((i % 27) + 1).padStart(2, '0')} / ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i % 6]} / 201${i % 5 + 2}`,
  enrolled: `${['Jan', 'Mar', 'Jun', 'Aug'][i % 4]} ${2021 + i % 4}`,
  parent: `${lastNames[i]} ${['Sharma', 'Patel', 'Wilson', 'Reed'][i % 4]}`,
  phone: `+1 (555) ${String(120 + i).padStart(3, '0')}-${String(3000 + i * 19).slice(-4)}`,
  attendance: [98, 96, 94, 91, 89, 87, 97, 93, 90, 85, 96, 92, 88, 95, 91][i],
  avatar: name.slice(0, 1) + lastNames[i].slice(0, 1),
  condition: i % 5 === 0 ? 'Seasonal allergies' : 'None reported',
}))

const staffNames = ['Olivia Bennett', 'Liam Foster', 'Ava Mitchell', 'Mason Clarke', 'Isabella James', 'Ethan Brooks', 'Amelia Parker', 'Lucas Turner', 'Sophia Collins', 'Noah Edwards', 'Charlotte Hughes', 'James Walker', 'Mia Thompson', 'Benjamin Scott', 'Harper Green']
const designations = ['Mathematics Teacher', 'English Teacher', 'Science Teacher', 'Grade Coordinator', 'History Teacher', 'Physical Education', 'Office Administrator', 'School Nurse', 'IT Support', 'Librarian', 'Art Teacher', 'Admissions Officer', 'School Counselor', 'Facilities Manager', 'Music Teacher']
export const staff: Staff[] = staffNames.map((name, i) => ({
  id: `ST-${String(1001 + i)}`,
  name,
  role: designations[i],
  department: i % 2 ? 'Academics' : 'Administration',
  type: i === 6 || i === 7 || i === 8 || i === 9 || i === 11 || i === 13 ? 'Non-Academic' : 'Teacher',
  email: `${name.toLowerCase().replace(' ', '.')}@northstarschool.edu`,
  phone: `+1 (555) ${String(230 + i)}-${String(4800 + i * 13).slice(-4)}`,
  since: `${2020 + i % 5}`,
  avatar: name.split(' ').map((part) => part[0]).join(''),
}))

export const movements: Movement[] = [
  { id: 'MV-2401', name: 'Mia Wilson', category: 'Student', direction: 'Inward', time: '08:02 AM', purpose: 'School arrival', status: 'Cleared' },
  { id: 'MV-2402', name: 'Olivia Bennett', category: 'Staff', direction: 'Inward', time: '08:04 AM', purpose: 'Staff check-in', status: 'Cleared' },
  { id: 'MV-2403', name: 'Samuel Reed', category: 'Visitor', direction: 'Inward', time: '08:14 AM', purpose: 'Parent meeting', status: 'Authorized' },
  { id: 'MV-2404', name: 'Noah Chen', category: 'Student', direction: 'Outward', time: '09:21 AM', purpose: 'Medical appointment', status: 'Authorized' },
  { id: 'MV-2405', name: 'Aisha Khan', category: 'Student', direction: 'Inward', time: '08:10 AM', purpose: 'School arrival', status: 'Cleared' },
  { id: 'MV-2406', name: 'Liam Foster', category: 'Staff', direction: 'Inward', time: '08:16 AM', purpose: 'Staff check-in', status: 'Cleared' },
  { id: 'MV-2407', name: 'Priya Shah', category: 'Visitor', direction: 'Inward', time: '09:32 AM', purpose: 'Admissions inquiry', status: 'Pending' },
  { id: 'MV-2408', name: 'Lucas Morgan', category: 'Student', direction: 'Outward', time: '10:05 AM', purpose: 'Early departure', status: 'Authorized' },
  { id: 'MV-2409', name: 'Zara Carter', category: 'Student', direction: 'Inward', time: '08:08 AM', purpose: 'School arrival', status: 'Cleared' },
  { id: 'MV-2410', name: 'Mason Clarke', category: 'Staff', direction: 'Outward', time: '10:12 AM', purpose: 'Official errand', status: 'Authorized' },
  { id: 'MV-2411', name: 'Ella Brooks', category: 'Student', direction: 'Inward', time: '08:19 AM', purpose: 'School arrival', status: 'Cleared' },
  { id: 'MV-2412', name: 'David Park', category: 'Visitor', direction: 'Outward', time: '10:24 AM', purpose: 'Vendor delivery', status: 'Cleared' },
  { id: 'MV-2413', name: 'Arjun Mehta', category: 'Student', direction: 'Inward', time: '08:21 AM', purpose: 'School arrival', status: 'Cleared' },
]

export const attendanceWeek = [
  { day: 'Mon', present: 92, absent: 8 }, { day: 'Tue', present: 96, absent: 4 },
  { day: 'Wed', present: 89, absent: 11 }, { day: 'Thu', present: 94, absent: 6 },
  { day: 'Fri', present: 97, absent: 3 }, { day: 'Sat', present: 91, absent: 9 },
]

export const gradeDistribution = [
  { grade: 'A', count: 186, fill: '#3e74df' }, { grade: 'B', count: 245, fill: '#79a0f1' },
  { grade: 'C', count: 168, fill: '#a9c2f7' }, { grade: 'D', count: 72, fill: '#d1def8' },
  { grade: 'F', count: 24, fill: '#efaaa6' },
]
