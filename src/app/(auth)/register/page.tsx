'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const responseText = await res.text()
      let data: { error?: string } | null = null
      if (responseText) {
        try {
          data = JSON.parse(responseText) as { error?: string }
        } catch {
          data = null
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Gagal mendaftar')
      }

      router.push('/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-[-7rem] h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 right-[-5rem] h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl shadow-blue-950/10 lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-7 text-white sm:px-10 sm:py-9 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-11">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 -z-10 h-80 w-80 rounded-full border-[40px] border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-80 w-80 rounded-full bg-sky-300/20 blur-2xl" />

          <Link href="/login" className="inline-flex w-fit items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-blue-600">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold shadow-inner ring-1 ring-white/20">◈</span>
            <span className="text-xl font-extrabold tracking-tight">DuitKu</span>
          </Link>

          <div className="mt-9 max-w-lg lg:mt-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-blue-50 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-200" />
              Mulai langkah finansialmu
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.7rem]">
              Satu tempat untuk memahami keuanganmu.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/90 sm:text-base sm:leading-7">
              Buat akun DuitKu dan mulai catat pemasukan serta pengeluaran dengan lebih teratur.
            </p>

            <div className="mt-7 hidden space-y-3 sm:block">
              {[
                ['↗', 'Catat transaksi harian'],
                ['▥', 'Pantau arus kas bulanan'],
                ['◷', 'Lihat riwayat kapan saja'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-sm font-medium text-white/95">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-sm ring-1 ring-white/10">{icon}</span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 hidden text-xs text-blue-100/80 lg:block">
            Akun baru dimulai dengan akses pengguna biasa.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-bold text-blue-600">Buat akun gratis</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Mulai dari sini.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Isi username dan password untuk membuat akun DuitKu.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">♙</span>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Pilih username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">▣</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-24 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Buat password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute inset-y-0 right-3 flex items-center rounded-md px-2 text-xs font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {loading ? 'Memproses...' : 'Buat akun'}
              </button>

              <p className="pt-2 text-center text-sm text-slate-500">
                Sudah punya akun?{' '}
                <Link href="/login" className="font-bold text-blue-700 decoration-2 underline-offset-4 hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
              <span aria-hidden="true" className="text-blue-500">◈</span>
              DuitKu · Kelola keuangan dengan lebih mudah
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}