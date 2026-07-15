import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/hooks/useLocale'

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  return { question: `What is ${a} + ${b}?`, answer: a + b }
}

export default function RegisterPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const captcha = useMemo(generateCaptcha, [])
  const [form, setForm] = useState({ name: '', email: '', password: '', captcha: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (parseInt(form.captcha) !== captcha.answer) {
      setError('Incorrect answer — try again.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: form.name,
      })
    }
    setLoading(false)
    navigate('/home', { replace: true })
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 bg-bg">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="text-5xl mb-3">🎬</p>
          <h1 className="text-2xl font-bold text-white">SV Recommend</h1>
          <p className="text-slate-400 text-sm mt-1">{t('register')}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input className="input-base" type="text" placeholder={t('fullName')}
            value={form.name} onChange={set('name')} required />
          <input className="input-base" type="email" placeholder={t('email')}
            value={form.email} onChange={set('email')} required autoComplete="email" />
          <input className="input-base" type="password" placeholder={t('password')}
            value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />

          <div className="card-surface p-4 space-y-2">
            <p className="text-slate-400 text-sm">{t('captchaLabel')}: <span className="text-white font-medium">{captcha.question}</span></p>
            <input className="input-base" type="number" placeholder="Your answer"
              value={form.captcha} onChange={set('captcha')} required />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-accent w-full disabled:opacity-50">
            {loading ? '…' : t('register')}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm">
          {t('haveAccount')}{' '}
          <Link to="/login" className="text-accent font-medium">{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
