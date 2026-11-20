import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth, roles } from '../context/AuthContext'
import type { Role } from '../types'

const loginSchema = z.object({
  email: z.string().email('Enter a valid school email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
type LoginValues = z.infer<typeof loginSchema>

const demos: { role: Role; icon: typeof Users; tint: string; name: string; email: string }[] = [
  { role: 'Principal', icon: ShieldCheck, tint: 'blue', name: 'Sarah Chen', email: 'sarah.chen@northstarschool.edu' },
  { role: 'Office Staff', icon: Users, tint: 'purple', name: 'Jordan Taylor', email: 'jordan.taylor@northstarschool.edu' },
  { role: 'Teacher', icon: GraduationCap, tint: 'green', name: 'Olivia Bennett', email: 'olivia.bennett@northstarschool.edu' },
  { role: 'Parent', icon: Users, tint: 'amber', name: 'James Wilson', email: 'james.wilson@example.com' },
  { role: 'Student', icon: BookOpen, tint: 'pink', name: 'Ava Wilson', email: 'ava.wilson@northstarschool.edu' },
  { role: 'Security Guard', icon: ShieldCheck, tint: 'slate', name: 'Marcus Reed', email: 'marcus.reed@northstarschool.edu' },
]

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const loginAs = (role: Role) => { signIn(role); navigate('/', { replace: true }) }
  const onSubmit = (values: LoginValues) => {
    const matched = demos.find((demo) => demo.email === values.email)
    if (matched) loginAs(matched.role)
    else loginAs('Principal')
  }
  return <main className="login-page">
    <div className="login-brand"><span className="brand-mark"><GraduationCap size={21} /></span><strong>northstar</strong><span>LEARNING SYSTEM</span></div>
    <div className="login-layout">
      <section className="login-intro"><span className="login-eyebrow"><i /> YOUR SCHOOL, IN SYNC</span><h1>Every day,<br />a little more <em>inspired.</em></h1><p>One calm, connected space for your entire school community. Welcome back to Northstar.</p><div className="login-art"><div className="art-sun" /><div className="art-window"><div /><div /><div /><div /></div><div className="art-book"><BookOpen size={35} /></div><div className="art-dot art-dot-one" /><div className="art-dot art-dot-two" /><div className="art-caption">a bright future starts here</div></div><div className="login-trust"><div className="trust-avatars"><span>SC</span><span>OB</span><span>JW</span><span>+</span></div><span>Trusted by <strong>2,000+</strong> students and families</span></div></section>
      <section className="login-form-panel"><div className="login-form-heading"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Use your school email address to continue.</p></div><form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate><label>Email address<input type="email" placeholder="you@northstarschool.edu" autoComplete="email" {...register('email')} />{errors.email && <small className="form-error">{errors.email.message}</small>}</label><label>Password<input type="password" placeholder="Enter your password" autoComplete="current-password" {...register('password')} />{errors.password && <small className="form-error">{errors.password.message}</small>}</label><button className="forgot-password" type="button">Forgot password?</button><button className="button button-primary login-submit" type="submit">Sign in <ArrowRight size={16} /></button></form><div className="demo-divider"><span /> OR TRY A DEMO ACCOUNT <span /></div><div className="demo-heading"><strong>Jump right in</strong><span>No password needed for demos</span></div><div className="demo-grid">{roles.map((role) => { const demo = demos.find((item) => item.role === role)!; const Icon = demo.icon; return <button className="demo-role" key={role} onClick={() => loginAs(role)}><span className={`demo-icon ${demo.tint}`}><Icon size={17} /></span><span><strong>{role}</strong><small>{demo.name}</small></span><ArrowRight size={14} /></button> })}</div><div className="login-privacy">By continuing, you agree to Northstar's <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</div></section>
    </div><footer className="login-footer"><span>© 2025 Northstar Academy</span><span>Secure school access <ShieldCheck size={14} /></span></footer>
  </main>
}
