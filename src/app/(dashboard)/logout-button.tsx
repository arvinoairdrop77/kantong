'use client'

import { useRouter } from 'next/navigation'

type LogoutButtonProps = {
  username: string
  role: 'admin' | 'user'
}

export default function LogoutButton({ username, role }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <details className="group relative">
      <summary
        aria-label={`Buka menu akun ${username}`}
        className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/70 [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold uppercase text-white">
          {username.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{username}</span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">Profil akun</span>
        </span>
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          {role}
        </span>
        <span aria-hidden="true" className="text-sm text-slate-400">⌃</span>
      </summary>

      <div className="absolute bottom-full left-0 right-0 z-[60] mb-2 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-blue-50 px-4 py-3 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Masuk sebagai</p>
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{username}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          ↪ Keluar
        </button>
      </div>
    </details>
  )
}