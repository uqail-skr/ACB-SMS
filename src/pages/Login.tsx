import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { apiError } from '../api'
import { useAuth } from '../context/AuthContext'

const loginSchema = z.object({
  username: z.string().min(3, 'Enter your username.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signIn, sessionError } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const onSubmit = async (values: LoginValues) => {
    setAuthError('')
    try {
      await signIn(values.username, values.password)
      navigate('/', { replace: true })
    } catch (error) {
      setAuthError(apiError(error))
    }
  }
  return <main className="login-page">
    <div className="login-brand"><span className="brand-mark"><GraduationCap size={21} /></span><strong>northstar</strong><span>LEARNING SYSTEM</span></div>
    <div className="login-layout">
      <section className="login-intro"><span className="login-eyebrow"><i /> YOUR SCHOOL, IN SYNC</span><h1>Every day,<br />a little more <em>inspired.</em></h1><p>One calm, connected space for your entire school community. Welcome back to Northstar.</p><div className="login-art"><div className="art-sun" /><div className="art-window"><div /><div /><div /><div /></div><div className="art-book"><BookOpen size={35} /></div><div className="art-dot art-dot-one" /><div className="art-dot art-dot-two" /><div className="art-caption">a bright future starts here</div></div><div className="login-trust"><div className="trust-avatars"><span>SC</span><span>OB</span><span>JW</span><span>+</span></div><span>Trusted by <strong>2,000+</strong> students and families</span></div></section>
      <section className="login-form-panel"><div className="login-form-heading"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Enter the username and password provided by your school.</p></div><form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate><label>Username<input type="text" placeholder="Your username" autoComplete="username" {...register('username')} />{errors.username && <small className="form-error">{errors.username.message}</small>}</label><label>Password<input type="password" placeholder="Enter your password" autoComplete="current-password" {...register('password')} />{errors.password && <small className="form-error">{errors.password.message}</small>}</label>{sessionError && <small className="form-error" role="alert">Could not verify your saved session: {sessionError}</small>}{authError && <small className="form-error" role="alert">{authError}</small>}<button className="button button-primary login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button></form><div className="login-help">Need an account? Ask your school administrator to create one.</div><div className="login-privacy">By continuing, you agree to Northstar's <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</div></section>
    </div><footer className="login-footer"><span>© 2025 Northstar Academy</span><span>Secure school access <ShieldCheck size={14} /></span></footer>
  </main>
}
