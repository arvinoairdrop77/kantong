'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import LogoutButton from '../logout-button'

type TransactionType = 'income' | 'expense' | 'transfer'
type Period = 'all' | 'this_month' | 'last_month'
type Tab = 'dashboard' | 'transactions' | 'budgets' | 'savings' | 'analytics' | 'users' | 'monitoring'
type UserRole = 'user' | 'admin'

type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  contributions?: SavingsContribution[]
}

type SavingsContribution = {
  transactionId: string
  amount: number
}

type Transaction = {
  id: string
  type: TransactionType
  amount: number
  category: string
  note: string
  date: string
}

type MonitoredTransaction = Transaction & {
  username: string
}

type SessionUser = {
  id: string
  username: string
  role: UserRole
}

type ManagedUser = SessionUser & {
  createdAt: string
}

function isManagedUser(value: unknown): value is ManagedUser {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'username' in value &&
    typeof value.username === 'string' &&
    'role' in value &&
    (value.role === 'user' || value.role === 'admin') &&
    'createdAt' in value &&
    typeof value.createdAt === 'string',
  )
}

function isMonitoredTransaction(value: unknown): value is {
  id: string
  type: TransactionType
  amount: number | string
  category: string
  note: string | null
  date: string
  username: string
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'type' in value &&
    (value.type === 'income' || value.type === 'expense' || value.type === 'transfer') &&
    'amount' in value &&
    (typeof value.amount === 'number' || typeof value.amount === 'string') &&
    Number.isFinite(Number(value.amount)) &&
    'category' in value &&
    typeof value.category === 'string' &&
    'note' in value &&
    (typeof value.note === 'string' || value.note === null) &&
    'date' in value &&
    typeof value.date === 'string' &&
    'username' in value &&
    typeof value.username === 'string',
  )
}

type Category = {
  id: string
  name: string
  icon: string
  color: string
}

const EXPENSE_CATEGORIES: Category[] = [
  { id: 'makanan', name: 'Makan & Minum', icon: '🍜', color: '#f97316' },
  { id: 'transportasi', name: 'Transportasi', icon: '🚗', color: '#3b82f6' },
  { id: 'belanja', name: 'Belanja', icon: '🛍️', color: '#ec4899' },
  { id: 'tagihan', name: 'Tagihan', icon: '⚡', color: '#eab308' },
  { id: 'hiburan', name: 'Hiburan', icon: '🎬', color: '#8b5cf6' },
  { id: 'kesehatan', name: 'Kesehatan', icon: '💊', color: '#ef4444' },
]

const INCOME_CATEGORIES: Category[] = [
  { id: 'gaji', name: 'Gaji', icon: '💼', color: '#10b981' },
  { id: 'freelance', name: 'Bonus / Proyek', icon: '💻', color: '#14b8a6' },
  { id: 'investasi', name: 'Investasi', icon: '📈', color: '#6366f1' },
  { id: 'lainnya', name: 'Lainnya', icon: '🎁', color: '#84cc16' },
]

const SAVINGS_CATEGORY: Category = {
  id: 'tabungan',
  name: 'Tabungan',
  icon: '🏦',
  color: '#6366f1',
}

const DEFAULT_BUDGETS: Record<string, number> = {
  makanan: 2_000_000,
  transportasi: 1_000_000,
  belanja: 1_500_000,
  tagihan: 2_000_000,
  hiburan: 800_000,
  kesehatan: 750_000,
}

const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000, 500_000]
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, SAVINGS_CATEGORY]
const LOCAL_BUDGETS_KEY = 'dompetku_budgets_v1'
const LOCAL_SAVINGS_KEY = 'duitku_savings_goals_v1'
const LOCAL_THEME_KEY = 'dompetku_theme'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isSavingsGoal(value: unknown): value is SavingsGoal {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'targetAmount' in value &&
    typeof value.targetAmount === 'number' &&
    Number.isSafeInteger(value.targetAmount) &&
    value.targetAmount > 0 &&
    'savedAmount' in value &&
    typeof value.savedAmount === 'number' &&
    Number.isSafeInteger(value.savedAmount) &&
    value.savedAmount >= 0 &&
    (!('contributions' in value) ||
      (Array.isArray(value.contributions) && value.contributions.every((contribution) => (
        contribution &&
        typeof contribution === 'object' &&
        'transactionId' in contribution &&
        typeof contribution.transactionId === 'string' &&
        'amount' in contribution &&
        typeof contribution.amount === 'number' &&
        Number.isSafeInteger(contribution.amount) &&
        contribution.amount > 0
      )))),
  )
}

function formatTransactionDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
}

function getCategory(type: TransactionType, id: string) {
  if (type === 'transfer' && id === SAVINGS_CATEGORY.id) return SAVINGS_CATEGORY
  return [...(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)].find(
    (category) => category.id === id,
  ) ?? {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    icon: '•',
    color: '#64748b',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
}

async function loadTransactions(): Promise<Transaction[]> {
  const response = await fetch('/api/transactions')
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Sesi login berakhir. Silakan masuk kembali.' : 'Gagal memuat transaksi.')
  }

  const result: unknown = await response.json()
  if (!Array.isArray(result)) throw new Error('Data transaksi dari server tidak valid.')

  const rows = result as Array<{
    id: string
    type: TransactionType
    amount: number | string
    category: string
    note: string | null
    date: string
  }>
  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    note: row.note ?? '',
    date: row.date.slice(0, 10),
  }))
}

async function loadMonitoredTransactions(userId: string): Promise<MonitoredTransaction[]> {
  const response = await fetch(`/api/admin/transactions?userId=${encodeURIComponent(userId)}`)
  const result: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = result && typeof result === 'object' && 'error' in result
      ? String(result.error)
      : 'Gagal memuat riwayat transaksi pengguna.'
    throw new Error(message)
  }
  if (!Array.isArray(result) || !result.every(isMonitoredTransaction)) {
    throw new Error('Data pemantauan dari server tidak valid.')
  }

  return result.map((row) => ({
    ...row,
    amount: Number(row.amount),
    note: row.note ?? '',
    date: row.date.slice(0, 10),
  }))
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [isRoleSaving, setIsRoleSaving] = useState<string | null>(null)
  const [userManagementError, setUserManagementError] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monitoringUserId, setMonitoringUserId] = useState('')
  const [monitoringTransactions, setMonitoringTransactions] = useState<MonitoredTransaction[]>([])
  const [isMonitoringTransactionsLoading, setIsMonitoringTransactionsLoading] = useState(false)
  const [monitoringError, setMonitoringError] = useState('')
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS)
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({})
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [savingsDraft, setSavingsDraft] = useState({ name: '', targetAmount: '', savedAmount: '0' })
  const [editingSavingsGoalId, setEditingSavingsGoalId] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    category: EXPENSE_CATEGORIES[0].id,
    savingsGoalId: '',
    note: '',
    date: '',
  })
  const [period, setPeriod] = useState<Period>('this_month')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      setTransactions(await loadTransactions())
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (
      activeTab !== 'monitoring' ||
      currentUser?.role !== 'admin' ||
      isUsersLoading ||
      userManagementError ||
      !monitoringUserId
    ) return

    let active = true
    loadMonitoredTransactions(monitoringUserId)
      .then((result) => {
        if (active) setMonitoringTransactions(result)
      })
      .catch((error: unknown) => {
        if (active) setMonitoringError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsMonitoringTransactionsLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeTab, currentUser?.role, isUsersLoading, monitoringUserId, userManagementError])

  useEffect(() => {
    let active = true
    fetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error('Gagal memuat informasi akun.')
        const result: unknown = await response.json()
        if (
          !result ||
          typeof result !== 'object' ||
          !('id' in result) ||
          !('username' in result) ||
          !('role' in result) ||
          typeof result.id !== 'string' ||
          typeof result.username !== 'string' ||
          (result.role !== 'user' && result.role !== 'admin')
        ) {
          throw new Error('Informasi akun tidak valid.')
        }
        if (active) {
          setCurrentUser({
            id: result.id,
            username: result.username,
            role: result.role,
          })
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error))
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    loadTransactions()
      .then((result) => {
        if (active) setTransactions(result)
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedBudgets = window.localStorage.getItem(LOCAL_BUDGETS_KEY)
        if (savedBudgets) {
          const parsed: unknown = JSON.parse(savedBudgets)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const saved = Object.fromEntries(
              Object.entries(parsed).filter((entry): entry is [string, number] =>
                typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0,
              ),
            )
            setBudgets({ ...DEFAULT_BUDGETS, ...saved })
          }
        }

        const savedTheme = window.localStorage.getItem(LOCAL_THEME_KEY)
        setIsDark(savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
      } catch (error: unknown) {
        console.warn('Gagal memuat preferensi DuitKu dari browser.', error)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const userId = currentUser?.id
    if (!userId) return

    const timer = window.setTimeout(() => {
      try {
        const savedGoals = window.localStorage.getItem(`${LOCAL_SAVINGS_KEY}_${userId}`)
        if (savedGoals) {
          const parsed: unknown = JSON.parse(savedGoals)
          if (!Array.isArray(parsed) || !parsed.every(isSavingsGoal)) {
            throw new Error('Data target tabungan yang tersimpan tidak valid.')
          }
          setSavingsGoals(parsed)
        } else {
          setSavingsGoals([])
        }
      } catch (error: unknown) {
        setErrorMessage(`Gagal memuat target tabungan: ${getErrorMessage(error)}`)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentUser?.id])

  const now = new Date()
  const thisMonth = monthKey(now)
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const periodTransactions = period === 'this_month'
    ? transactions.filter((item) => item.date.startsWith(thisMonth))
    : period === 'last_month'
      ? transactions.filter((item) => item.date.startsWith(lastMonth))
      : transactions

  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)
  const periodIncome = periodTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)
  const periodExpense = periodTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)
  const netCashflow = periodIncome - periodExpense
  const savingsRatio = periodIncome > 0
    ? Math.max(0, Math.round((netCashflow / periodIncome) * 100))
    : 0

  const totalSavingsTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalSavedAmount = savingsGoals.reduce((sum, goal) => sum + goal.savedAmount, 0)
  const totalSavingsProgress = totalSavingsTarget > 0
    ? Math.min(100, Math.round((totalSavedAmount / totalSavingsTarget) * 100))
    : 0

  const query = search.trim().toLocaleLowerCase('id-ID')
  const filteredTransactions = [...periodTransactions]
    .filter((item) => typeFilter === 'all' || item.type === typeFilter)
    .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
    .filter((item) => {
      if (!query) return true
      const category = getCategory(item.type, item.category).name
      return `${item.note} ${category}`.toLocaleLowerCase('id-ID').includes(query)
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const monthlyCashflow = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = monthKey(date)
    const rows = transactions.filter((item) => item.date.startsWith(key))
    return {
      key,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
      income: rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
      expense: rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
    }
  })

  const values = new Map<string, number>()
  periodTransactions.filter((item) => item.type === 'expense').forEach((item) => {
    values.set(item.category, (values.get(item.category) ?? 0) + item.amount)
  })
  const expenseByCategory = [...values.entries()]
    .map(([id, amount]) => ({ ...getCategory('expense', id), amount }))
    .sort((a, b) => b.amount - a.amount)

  const monitorableUsers = users.filter((user) => user.role === 'user')
  const selectedMonitoredUser = monitorableUsers.find((user) => user.id === monitoringUserId)
  const monitoredPeriodTransactions = period === 'this_month'
    ? monitoringTransactions.filter((item) => item.date.startsWith(thisMonth))
    : period === 'last_month'
      ? monitoringTransactions.filter((item) => item.date.startsWith(lastMonth))
      : monitoringTransactions
  const monitoredIncome = monitoredPeriodTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)
  const monitoredExpense = monitoredPeriodTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0)
  const monitoredMonthlyCashflow = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = monthKey(date)
    const rows = monitoringTransactions.filter((item) => item.date.startsWith(key))
    return {
      key,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
      income: rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
      expense: rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
    }
  })
  const monitoredMaxCashflow = Math.max(
    1,
    ...monitoredMonthlyCashflow.flatMap((item) => [item.income, item.expense]),
  )
  const monitoredCategoryValues = new Map<string, number>()
  monitoredPeriodTransactions.filter((item) => item.type === 'expense').forEach((item) => {
    monitoredCategoryValues.set(
      item.category,
      (monitoredCategoryValues.get(item.category) ?? 0) + item.amount,
    )
  })
  const monitoredExpenseByCategory = [...monitoredCategoryValues.entries()]
    .map(([id, amount]) => ({ ...getCategory('expense', id), amount }))
    .sort((a, b) => b.amount - a.amount)
  const monitoredTransactionsForPeriod = [...monitoredPeriodTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))

  const maxCashflow = Math.max(1, ...monthlyCashflow.flatMap((item) => [item.income, item.expense]))
  const donutTotal = expenseByCategory.reduce((sum, category) => sum + category.amount, 0)
  let donutPosition = 0
  const donutGradient = donutTotal > 0
    ? `conic-gradient(${expenseByCategory.map((category) => {
      const start = donutPosition
      donutPosition += (category.amount / donutTotal) * 100
      return `${category.color} ${start}% ${donutPosition}%`
    }).join(', ')})`
    : 'conic-gradient(#e2e8f0 0% 100%)'

  const tabTitle: Record<Tab, string> = {
    dashboard: 'Ringkasan Keuangan',
    transactions: 'Riwayat Transaksi',
    budgets: 'Target Anggaran',
    savings: 'Tabungan',
    analytics: 'Analitik & Laporan',
    users: 'Manajemen Pengguna',
    monitoring: 'Pemantauan User',
  }
  const periodLabel: Record<Period, string> = {
    all: 'Semua Waktu',
    this_month: 'Bulan Ini',
    last_month: 'Bulan Lalu',
  }
  const activeCategories = form.type === 'income'
    ? INCOME_CATEGORIES
    : form.type === 'transfer'
      ? [SAVINGS_CATEGORY]
      : [...EXPENSE_CATEGORIES, SAVINGS_CATEGORY]

  const handleTypeChange = (type: TransactionType) => {
    setForm((current) => ({
      ...current,
      type,
      category: type === 'income'
        ? INCOME_CATEGORIES[0].id
        : type === 'transfer'
          ? SAVINGS_CATEGORY.id
          : EXPENSE_CATEGORIES[0].id,
      savingsGoalId: type === 'transfer' ? savingsGoals[0]?.id ?? '' : '',
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(form.amount.replace(/\D/g, ''))
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setErrorMessage('Masukkan nominal transaksi yang valid.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')
    try {
      const selectedSavingsGoal = form.type === 'transfer'
        ? savingsGoals.find((goal) => goal.id === form.savingsGoalId)
        : undefined
      if (form.type === 'transfer' && !selectedSavingsGoal) {
        throw new Error(savingsGoals.length === 0
          ? 'Buat target tabungan dulu sebelum mencatat setoran.'
          : 'Pilih target tabungan yang akan menerima setoran.')
      }
      if (form.type === 'transfer' && !currentUser) {
        throw new Error('Informasi akun belum siap. Coba lagi sebentar.')
      }
      if (selectedSavingsGoal && !Number.isSafeInteger(selectedSavingsGoal.savedAmount + amount)) {
        throw new Error('Nominal setoran terlalu besar untuk target tabungan ini.')
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          amount,
          category: form.category,
          note: form.note.trim() || (
            selectedSavingsGoal
              ? `Setoran: ${selectedSavingsGoal.name}`
              : getCategory(form.type, form.category).name
          ),
          date: form.date || dateInputValue(new Date()),
        }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result
          ? String(result.error)
          : 'Gagal menyimpan transaksi.'
        throw new Error(message)
      }

      let savingsProgressError = ''
      if (selectedSavingsGoal) {
        const transactionId = result && typeof result === 'object' && 'id' in result && typeof result.id === 'string'
          ? result.id
          : ''
        if (!transactionId) {
          savingsProgressError = 'Transfer tercatat, tetapi ID transaksinya tidak valid sehingga progres tabungan belum diperbarui.'
        } else if (!currentUser) {
          savingsProgressError = 'Transfer tercatat, tetapi informasi akun belum siap untuk memperbarui progres tabungan.'
        } else {
          const updatedGoals = savingsGoals.map((goal) => goal.id === selectedSavingsGoal.id
            ? {
              ...goal,
              savedAmount: goal.savedAmount + amount,
              contributions: [
                ...(goal.contributions ?? []),
                { transactionId, amount },
              ],
            }
            : goal)
          try {
            window.localStorage.setItem(
              `${LOCAL_SAVINGS_KEY}_${currentUser.id}`,
              JSON.stringify(updatedGoals),
            )
            setSavingsGoals(updatedGoals)
          } catch (error: unknown) {
            savingsProgressError = `Transfer tercatat, tetapi progres tabungan gagal diperbarui: ${getErrorMessage(error)}`
          }
        }
      }

      setForm((current) => ({
        ...current,
        amount: '',
        note: '',
        date: dateInputValue(new Date()),
      }))
      setStatusMessage(selectedSavingsGoal
        ? `Setoran berhasil dicatat untuk ${selectedSavingsGoal.name}.`
        : `${form.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil disimpan.`)
      await refreshTransactions()
      if (savingsProgressError) setErrorMessage(savingsProgressError)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return

    setErrorMessage('')
    setStatusMessage('')
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Gagal menghapus transaksi.')

      let savingsProgressError = ''
      const updatedGoals = savingsGoals.map((goal) => {
        const contribution = goal.contributions?.find((item) => item.transactionId === id)
        if (!contribution) return goal
        return {
          ...goal,
          savedAmount: Math.max(0, goal.savedAmount - contribution.amount),
          contributions: goal.contributions?.filter((item) => item.transactionId !== id) ?? [],
        }
      })
      if (updatedGoals.some((goal, index) => goal !== savingsGoals[index])) {
        if (!currentUser) {
          savingsProgressError = 'Transaksi dihapus, tetapi informasi akun belum siap untuk memperbarui target tabungan.'
        } else {
          try {
            window.localStorage.setItem(
              `${LOCAL_SAVINGS_KEY}_${currentUser.id}`,
              JSON.stringify(updatedGoals),
            )
            setSavingsGoals(updatedGoals)
          } catch (error: unknown) {
            savingsProgressError = `Transaksi dihapus, tetapi progres tabungan gagal diperbarui: ${getErrorMessage(error)}`
          }
        }
      }

      setStatusMessage('Transaksi berhasil dihapus.')
      await refreshTransactions()
      if (savingsProgressError) setErrorMessage(savingsProgressError)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  const loadUsers = async () => {
    setIsUsersLoading(true)
    setUserManagementError('')
    setMonitoringError('')

    try {
      const response = await fetch('/api/admin/users')
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result
          ? String(result.error)
          : 'Gagal memuat pengguna.'
        throw new Error(message)
      }
      if (!Array.isArray(result) || !result.every(isManagedUser)) {
        throw new Error('Data pengguna dari server tidak valid.')
      }
      setUsers(result)
      const regularUsers = result.filter((user) => user.role === 'user')
      setMonitoringUserId((current) => (
        regularUsers.some((user) => user.id === current)
          ? current
          : regularUsers[0]?.id ?? ''
      ))
      setIsMonitoringTransactionsLoading(regularUsers.length > 0)
    } catch (error: unknown) {
      setUserManagementError(getErrorMessage(error))
      setIsMonitoringTransactionsLoading(false)
    } finally {
      setIsUsersLoading(false)
    }
  }

  const updateUserRole = async (userId: string, role: UserRole) => {
    setIsRoleSaving(userId)
    setUserManagementError('')

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result
          ? String(result.error)
          : 'Gagal memperbarui role.'
        throw new Error(message)
      }
      if (!isManagedUser(result)) throw new Error('Respons perubahan role tidak valid.')
      setUsers((current) => current.map((user) => (
        user.id === userId ? result : user
      )))
    } catch (error: unknown) {
      setUserManagementError(getErrorMessage(error))
    } finally {
      setIsRoleSaving(null)
    }
  }

  const saveBudgets = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updatedBudgets = { ...budgets }
    Object.entries(budgetDraft).forEach(([category, value]) => {
      const parsed = Number(value.replace(/\D/g, '')) || 0
      updatedBudgets[category] = parsed
    })

    try {
      window.localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(updatedBudgets))
      setBudgets(updatedBudgets)
      setIsBudgetModalOpen(false)
      setStatusMessage('Target anggaran berhasil diperbarui.')
      setErrorMessage('')
    } catch (error: unknown) {
      setErrorMessage(`Gagal menyimpan anggaran di browser: ${getErrorMessage(error)}`)
    }
  }

  const saveSavingsGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = savingsDraft.name.trim()
    const targetAmount = Number(savingsDraft.targetAmount.replace(/\D/g, ''))
    const savedAmount = Number(savingsDraft.savedAmount.replace(/\D/g, '')) || 0

    if (!name || !Number.isSafeInteger(targetAmount) || targetAmount <= 0 || !Number.isSafeInteger(savedAmount)) {
      setErrorMessage('Isi nama target dan nominal tabungan yang valid.')
      return
    }
    if (!currentUser) {
      setErrorMessage('Informasi akun belum siap. Coba lagi sebentar.')
      return
    }

    const goal: SavingsGoal = {
      id: editingSavingsGoalId ?? crypto.randomUUID(),
      name,
      targetAmount,
      savedAmount,
      contributions: savingsGoals.find((item) => item.id === editingSavingsGoalId)?.contributions ?? [],
    }
    const updatedGoals = editingSavingsGoalId
      ? savingsGoals.map((item) => item.id === editingSavingsGoalId ? goal : item)
      : [...savingsGoals, goal]

    try {
      window.localStorage.setItem(
        `${LOCAL_SAVINGS_KEY}_${currentUser.id}`,
        JSON.stringify(updatedGoals),
      )
      setSavingsGoals(updatedGoals)
      setSavingsDraft({ name: '', targetAmount: '', savedAmount: '0' })
      setEditingSavingsGoalId(null)
      setStatusMessage(editingSavingsGoalId ? 'Target tabungan berhasil diperbarui.' : 'Target tabungan berhasil ditambahkan.')
      setErrorMessage('')
    } catch (error: unknown) {
      setErrorMessage(`Gagal menyimpan target tabungan: ${getErrorMessage(error)}`)
    }
  }

  const editSavingsGoal = (goal: SavingsGoal) => {
    setSavingsDraft({
      name: goal.name,
      targetAmount: new Intl.NumberFormat('id-ID').format(goal.targetAmount),
      savedAmount: new Intl.NumberFormat('id-ID').format(goal.savedAmount),
    })
    setEditingSavingsGoalId(goal.id)
    setErrorMessage('')
  }

  const deleteSavingsGoal = (id: string) => {
    const goal = savingsGoals.find((item) => item.id === id)
    if (!goal || !window.confirm(`Hapus target tabungan "${goal.name}"?`)) return
    if (!currentUser) {
      setErrorMessage('Informasi akun belum siap. Coba lagi sebentar.')
      return
    }

    const updatedGoals = savingsGoals.filter((item) => item.id !== id)
    try {
      window.localStorage.setItem(
        `${LOCAL_SAVINGS_KEY}_${currentUser.id}`,
        JSON.stringify(updatedGoals),
      )
      setSavingsGoals(updatedGoals)
      if (editingSavingsGoalId === id) {
        setSavingsDraft({ name: '', targetAmount: '', savedAmount: '0' })
        setEditingSavingsGoalId(null)
      }
      setStatusMessage('Target tabungan berhasil dihapus.')
      setErrorMessage('')
    } catch (error: unknown) {
      setErrorMessage(`Gagal menghapus target tabungan: ${getErrorMessage(error)}`)
    }
  }

  const cancelSavingsEdit = () => {
    setSavingsDraft({ name: '', targetAmount: '', savedAmount: '0' })
    setEditingSavingsGoalId(null)
  }

  const toggleTheme = () => {
    const nextIsDark = !isDark
    setIsDark(nextIsDark)
    try {
      window.localStorage.setItem(LOCAL_THEME_KEY, nextIsDark ? 'dark' : 'light')
    } catch (error: unknown) {
      console.warn('Gagal menyimpan tema DuitKu di browser.', error)
    }
  }

  const showQuickEntry = () => {
    setActiveTab('dashboard')
    setIsSidebarOpen(false)
    window.setTimeout(() => document.getElementById('quick-amount')?.focus(), 0)
  }

  const openBudgetEditor = () => {
    setBudgetDraft(Object.fromEntries(
      EXPENSE_CATEGORIES.map((category) => [
        category.id,
        budgets[category.id] ? String(budgets[category.id]) : '',
      ]),
    ))
    setIsBudgetModalOpen(true)
  }

  const visibleTabs: Tab[] = [
    'dashboard',
    'transactions',
    'budgets',
    'savings',
    'analytics',
    ...(currentUser?.role === 'admin' ? ['monitoring' as const, 'users' as const] : []),
  ]

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-blue-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-blue-100 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div>
            <div className="flex h-16 items-center gap-3 border-b border-blue-100 px-6 dark:border-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 text-lg text-white shadow-md shadow-blue-500/20">◈</span>
              <span className="text-xl font-extrabold tracking-tight">DuitKu</span>
              <button type="button" className="ml-auto rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Tutup menu">×</button>
            </div>
            <nav className="space-y-1.5 p-4" aria-label="Navigasi dashboard">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Menu utama</p>
              {visibleTabs.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    setIsSidebarOpen(false)
                    if (tab === 'users' || tab === 'monitoring') void loadUsers()
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  <span className="w-5 text-center" aria-hidden="true">
                    {tab === 'dashboard' ? '▦' : tab === 'transactions' ? '↔' : tab === 'budgets' ? '◴' : tab === 'savings' ? '◉' : tab === 'analytics' ? '▥' : tab === 'monitoring' ? '⌕' : '♙'}
                  </span>
                  {tabTitle[tab]}
                </button>
              ))}
            </nav>
          </div>
          <div className="space-y-3 border-t border-blue-100 p-4 dark:border-slate-800">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-1 flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-300">Status data</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Tersinkron
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">Transaksi tersimpan di akun Anda.</p>
            </div>
            {currentUser && (
              <LogoutButton username={currentUser.username} role={currentUser.role} />
            )}
          </div>
        </aside>

        <div className="min-h-screen lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-blue-100 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" aria-label="Buka menu">☰</button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold sm:text-xl">{tabTitle[activeTab]}</h1>
                <p className="hidden text-xs capitalize text-slate-500 dark:text-slate-400 sm:block">
                  {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                aria-label="Filter periode"
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                className="max-w-36 rounded-xl border-0 bg-blue-50 px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 sm:max-w-none"
              >
                <option value="all">Semua Waktu</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_month">Bulan Lalu</option>
              </select>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
                className="rounded-xl bg-blue-50 p-2.5 text-slate-600 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {isDark ? '☀' : '☾'}
              </button>
              <button type="button" onClick={showQuickEntry} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 sm:text-sm">
                <span aria-hidden="true">ϟ</span><span className="hidden sm:inline">Catat Cepat</span><span className="sm:hidden">Catat</span>
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            {errorMessage && (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage('')} className="font-semibold" aria-label="Tutup pesan error">×</button>
              </div>
            )}
            {statusMessage && (
              <div role="status" className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span>{statusMessage}</span>
                <button type="button" onClick={() => setStatusMessage('')} className="font-semibold" aria-label="Tutup notifikasi">×</button>
              </div>
            )}

            {activeTab === 'monitoring' && currentUser?.role === 'admin' && (
              <section className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-bold">Pantau riwayat pengguna</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pilih akun user untuk melihat riwayat dan ringkasan transaksinya. Data admin tidak ditampilkan.
                    </p>
                  </div>
                  {userManagementError && (
                    <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                      {userManagementError}
                    </p>
                  )}
                  {isUsersLoading ? (
                    <p className="text-sm text-slate-500">Memuat daftar pengguna...</p>
                  ) : monitorableUsers.length === 0 ? (
                    <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Belum ada pengguna dengan role User.
                    </p>
                  ) : (
                    <label className="block max-w-md">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Pilih pengguna</span>
                      <select
                        value={monitoringUserId}
                        onChange={(event) => {
                          setMonitoringError('')
                          setIsMonitoringTransactionsLoading(true)
                          setMonitoringUserId(event.target.value)
                        }}
                        className="w-full rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                      >
                        {monitorableUsers.map((user) => (
                          <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {selectedMonitoredUser && !userManagementError && (
                  <>
                    {monitoringError && (
                      <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                        Gagal memuat riwayat {selectedMonitoredUser.username}: {monitoringError}
                      </p>
                    )}
                    {isMonitoringTransactionsLoading ? (
                      <div role="status" className="rounded-2xl border border-blue-100 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                        Memuat transaksi {selectedMonitoredUser.username}...
                      </div>
                    ) : !monitoringError && (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {[
                            { label: 'Pemasukan', amount: monitoredIncome, color: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Pengeluaran', amount: monitoredExpense, color: 'text-rose-600 dark:text-rose-400' },
                            { label: 'Saldo bersih', amount: monitoredIncome - monitoredExpense, color: 'text-blue-700 dark:text-blue-300' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label} · {periodLabel[period]}</p>
                              <p className={`mt-2 truncate text-xl font-extrabold tabular-nums ${item.color}`}>{formatRupiah(item.amount)}</p>
                            </div>
                          ))}
                          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Jumlah transaksi · {periodLabel[period]}</p>
                            <p className="mt-2 text-xl font-extrabold tabular-nums">{monitoredPeriodTransactions.length}</p>
                          </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-3">
                          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                            <div className="mb-5">
                              <h2 className="font-bold">Arus kas {selectedMonitoredUser.username}</h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Pemasukan dan pengeluaran 6 bulan terakhir</p>
                            </div>
                            <div className="flex min-h-56 items-end justify-around gap-3 border-b border-blue-100 pb-2 dark:border-slate-800 sm:gap-5">
                              {monitoredMonthlyCashflow.map((month) => (
                                <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                  <div className="flex h-44 w-full items-end justify-center gap-1 sm:gap-2">
                                    <div title={`Pemasukan ${formatRupiah(month.income)}`} className="max-w-7 flex-1 rounded-t-md bg-emerald-500" style={{ height: `${Math.max(2, (month.income / monitoredMaxCashflow) * 100)}%` }} />
                                    <div title={`Pengeluaran ${formatRupiah(month.expense)}`} className="max-w-7 flex-1 rounded-t-md bg-rose-500" style={{ height: `${Math.max(2, (month.expense / monitoredMaxCashflow) * 100)}%` }} />
                                  </div>
                                  <span className="text-[11px] text-slate-500">{month.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex justify-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
                              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Pemasukan</span>
                              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Pengeluaran</span>
                            </div>
                          </section>

                          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="mb-4">
                              <h2 className="font-bold">Pengeluaran per kategori</h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{periodLabel[period]}</p>
                            </div>
                            <div className="space-y-3">
                              {monitoredExpenseByCategory.length === 0 ? (
                                <p className="py-4 text-center text-xs text-slate-400">Belum ada pengeluaran di periode ini.</p>
                              ) : monitoredExpenseByCategory.map((category) => (
                                <div key={category.id}>
                                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                    <span className="flex min-w-0 items-center gap-2 truncate">
                                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                                      {category.name}
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums">{formatRupiah(category.amount)}</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className="h-full rounded-full" style={{ width: `${(category.amount / monitoredExpense) * 100}%`, backgroundColor: category.color }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>

                        <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="border-b border-blue-100 p-5 dark:border-slate-800 sm:p-6">
                            <h2 className="font-bold">Riwayat transaksi {selectedMonitoredUser.username}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {monitoredTransactionsForPeriod.length} transaksi · {periodLabel[period]}
                            </p>
                          </div>
                          {monitoredTransactionsForPeriod.length === 0 ? (
                            <p className="p-8 text-center text-sm text-slate-500">Tidak ada transaksi pada periode ini.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-blue-100 bg-blue-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                                    <th className="px-5 py-3.5">Transaksi</th>
                                    <th className="px-4 py-3.5">Kategori</th>
                                    <th className="px-4 py-3.5">Tanggal</th>
                                    <th className="px-5 py-3.5 text-right">Nominal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/70">
                                  {monitoredTransactionsForPeriod.map((transaction) => {
                                    const category = getCategory(transaction.type, transaction.category)
                                    return (
                                      <tr key={transaction.id} className="hover:bg-blue-50/70 dark:hover:bg-slate-800/40">
                                        <td className="px-5 py-3.5">
                                          <div className="flex items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-slate-800">{category.icon}</span>
                                            <span className="max-w-64 truncate text-xs font-medium sm:text-sm">{transaction.note || category.name}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{category.name}</td>
                                        <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{formatTransactionDate(transaction.date)}</td>
                                        <td className={`px-5 py-3.5 text-right text-xs font-bold tabular-nums sm:text-sm ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : transaction.type === 'transfer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                          {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '↗' : '−'} {formatRupiah(transaction.amount)}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      </>
                    )}
                  </>
                )}
              </section>
            )}

            {activeTab === 'users' && currentUser?.role === 'admin' && (
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col justify-between gap-3 border-b border-blue-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:p-6">
                  <div>
                    <h2 className="font-bold">Manajemen pengguna</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Atur izin akses. Pengguna baru otomatis mendapat role User.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {users.length} pengguna
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadUsers()}
                      disabled={isUsersLoading}
                      className="rounded-xl border border-blue-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isUsersLoading ? 'Memuat...' : 'Muat ulang'}
                    </button>
                  </div>
                </div>

                {userManagementError && (
                  <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 sm:mx-6">
                    {userManagementError}
                  </p>
                )}

                {isUsersLoading ? (
                  <p className="p-8 text-center text-sm text-slate-500">Memuat daftar pengguna...</p>
                ) : users.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">Belum ada data pengguna.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-blue-100 bg-blue-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                          <th className="px-5 py-3.5">Pengguna</th>
                          <th className="px-4 py-3.5">Terdaftar</th>
                          <th className="px-5 py-3.5 text-right">Role / Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50 text-sm dark:divide-slate-800/70">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-4">
                              <div className="font-semibold">{user.username}</div>
                              {user.id === currentUser.id && (
                                <span className="text-[11px] text-slate-400">Akun kamu</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                              {formatTransactionDate(user.createdAt)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <select
                                aria-label={`Role untuk ${user.username}`}
                                value={user.role}
                                disabled={user.id === currentUser.id || isRoleSaving === user.id}
                                onChange={(event) => {
                                  const role = event.target.value
                                  if (role === 'user' || role === 'admin') {
                                    void updateUserRole(user.id, role)
                                  }
                                }}
                                className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="user">User biasa</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'dashboard' && (
              <section id="quick-entry" className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative grid items-start gap-7 lg:grid-cols-12">
                  <div className="space-y-5 lg:col-span-7">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Input instan
                        </span>
                        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Mau catat transaksi apa hari ini?</h2>
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-blue-50 p-1 dark:bg-slate-800">
                        {(['expense', 'income'] as const).map((type) => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => handleTypeChange(type)}
                            className={`rounded-xl px-2.5 py-2 text-xs font-bold transition sm:px-3.5 sm:text-sm ${form.type === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                            {type === 'income' ? '↙ Pemasukan' : '↗ Pengeluaran'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="mb-1 flex items-center justify-between">
                          <label htmlFor="quick-amount" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nominal transaksi</label>
                          <button type="button" onClick={() => setForm((current) => ({ ...current, amount: '' }))} className="text-[11px] font-medium text-slate-400 hover:text-rose-500">Hapus nominal</button>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-slate-400 sm:text-2xl">Rp</span>
                          <input
                            id="quick-amount"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            required
                            value={form.amount}
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, '')
                              setForm((current) => ({
                                ...current,
                                amount: digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '',
                              }))
                            }}
                            placeholder="0"
                            className="w-full border-0 bg-transparent p-0 text-3xl font-extrabold tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-slate-600 sm:text-4xl"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-blue-100 pt-3 dark:border-slate-700/60">
                          <span className="mr-1 text-[11px] font-medium text-slate-400">Tambah cepat:</span>
                          {QUICK_AMOUNTS.map((amount) => (
                            <button
                              type="button"
                              key={amount}
                              onClick={() => {
                                const current = Number(form.amount.replace(/\D/g, '')) || 0
                                setForm((value) => ({ ...value, amount: new Intl.NumberFormat('id-ID').format(current + amount) }))
                              }}
                              className="rounded-lg border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              +{amount >= 1_000_000 ? `${amount / 1_000_000}jt` : `${amount / 1_000}rb`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <fieldset>
                        <legend className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Pilih kategori</legend>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {activeCategories.map((category) => (
                            <button
                              type="button"
                              key={category.id}
                              aria-pressed={form.category === category.id}
                              onClick={() => {
                                if (category.id === SAVINGS_CATEGORY.id) {
                                  handleTypeChange('transfer')
                                  return
                                }
                                setForm((current) => ({ ...current, category: category.id }))
                              }}
                              className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition ${form.category === category.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-500/15' : 'border-blue-100 bg-white hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800'}`}
                            >
                              <span className="text-xl" aria-hidden="true">{category.icon}</span>
                              <span className="w-full truncate text-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">{category.name}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      {form.type === 'transfer' && (
                        <div>
                          <label htmlFor="savings-goal-select" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Masukkan ke target tabungan
                          </label>
                          {savingsGoals.length > 0 ? (
                            <select
                              id="savings-goal-select"
                              required
                              value={form.savingsGoalId}
                              onChange={(event) => setForm((current) => ({ ...current, savingsGoalId: event.target.value }))}
                              className="w-full rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <option value="" disabled>Pilih target tabungan</option>
                              {savingsGoals.map((goal) => (
                                <option key={goal.id} value={goal.id}>
                                  {goal.name} · target {formatRupiah(goal.targetAmount)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 sm:flex-row sm:items-center">
                              <span>Buat target dulu sebelum mencatat setoran.</span>
                              <button type="button" onClick={() => setActiveTab('savings')} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
                                Buat target tabungan
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <label htmlFor="transaction-note" className="sr-only">Catatan</label>
                          <input
                            id="transaction-note"
                            type="text"
                            value={form.note}
                            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                            placeholder={form.type === 'transfer' ? 'Catatan setoran (opsional)' : 'Catatan singkat (opsional)'}
                            className="w-full rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label htmlFor="transaction-date" className="sr-only">Tanggal</label>
                          <input
                            id="transaction-date"
                            type="date"
                            required
                            value={form.date || dateInputValue(now)}
                            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                            className="w-full rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <button
                            type="submit"
                            disabled={isSaving || (form.type === 'transfer' && (!form.savingsGoalId || savingsGoals.length === 0))}
                            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? 'Menyimpan...' : form.type === 'transfer' ? '✓ Simpan Setoran' : '✓ Simpan Catatan'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-3.5 lg:col-span-5 lg:border-l lg:border-slate-100 lg:pl-7 dark:lg:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ringkasan dompet</span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{periodLabel[period]}</span>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg dark:border-emerald-800/40 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-900">
                      <p className="mb-2 text-xs font-medium text-slate-300">Total saldo saat ini</p>
                      <p className="mb-2 text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{formatRupiah(totalIncome - totalExpense)}</p>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span className="text-emerald-400">▣ Tersimpan di akun</span>
                        <span className="truncate tabular-nums">{netCashflow >= 0 ? 'Surplus' : 'Defisit'}: {formatRupiah(Math.abs(netCashflow))}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">↗ Pemasukan</p>
                        <p className="truncate text-base font-bold tabular-nums sm:text-lg">{formatRupiah(periodIncome)}</p>
                      </div>
                      <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/10">
                        <p className="mb-1 text-xs font-semibold text-rose-700 dark:text-rose-400">↘ Pengeluaran</p>
                        <p className="truncate text-base font-bold tabular-nums sm:text-lg">{formatRupiah(periodExpense)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Rasio tabungan</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{savingsRatio}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, savingsRatio)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {(activeTab === 'dashboard' || activeTab === 'analytics') && (
              <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="flex flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-2">
                  <div className="mb-5">
                    <h2 className="font-bold">Arus kas</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pemasukan dan pengeluaran 6 bulan terakhir</p>
                  </div>
                  <div className="flex min-h-56 flex-1 items-end justify-around gap-3 border-b border-blue-100 pb-2 dark:border-slate-800 sm:gap-5">
                    {monthlyCashflow.map((month) => (
                      <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex h-44 w-full items-end justify-center gap-1 sm:gap-2">
                          <div title={`Pemasukan ${formatRupiah(month.income)}`} className="max-w-7 flex-1 rounded-t-md bg-emerald-500 transition-all" style={{ height: `${Math.max(2, (month.income / maxCashflow) * 100)}%` }} />
                          <div title={`Pengeluaran ${formatRupiah(month.expense)}`} className="max-w-7 flex-1 rounded-t-md bg-rose-500 transition-all" style={{ height: `${Math.max(2, (month.expense / maxCashflow) * 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500">{month.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Pemasukan</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Pengeluaran</span>
                  </div>
                </div>

                <div className="flex flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-bold">Rincian pengeluaran</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Berdasarkan kategori · {periodLabel[period]}</p>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center gap-5">
                    <div className="relative h-40 w-40 rounded-full" style={{ background: donutGradient }}>
                      <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-900">
                        <span className="text-[10px] text-slate-500">Total keluar</span>
                        <span className="max-w-28 truncate text-sm font-bold">{formatRupiah(donutTotal)}</span>
                      </div>
                    </div>
                    <div className="max-h-36 w-full space-y-2 overflow-y-auto pr-1">
                      {expenseByCategory.length === 0 ? (
                        <p className="py-2 text-center text-xs text-slate-400">Belum ada pengeluaran di periode ini.</p>
                      ) : expenseByCategory.map((category) => (
                        <div key={category.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2 truncate text-slate-600 dark:text-slate-300">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">{formatRupiah(category.amount)} <span className="text-slate-400">{Math.round((category.amount / donutTotal) * 100)}%</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {(activeTab === 'dashboard' || activeTab === 'budgets') && (
              <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-bold">Target anggaran bulanan</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pantau batas pengeluaran per kategori.</p>
                  </div>
                  <button type="button" onClick={openBudgetEditor} className="self-start rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:self-auto">
                    ⚙ Atur batas anggaran
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {EXPENSE_CATEGORIES.filter((category) => (budgets[category.id] ?? 0) > 0).map((category) => {
                    const spent = periodTransactions
                      .filter((item) => item.type === 'expense' && item.category === category.id)
                      .reduce((sum, item) => sum + item.amount, 0)
                    const limit = budgets[category.id]
                    const percentage = Math.round((spent / limit) * 100)
                    const color = percentage >= 100 ? 'bg-rose-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    const badge = percentage >= 100
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                      : percentage >= 75
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    return (
                      <div key={category.id} className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-lg dark:bg-slate-800">{category.icon}</span>
                            <div className="min-w-0">
                              <h3 className="truncate text-xs font-semibold">{category.name}</h3>
                              <span className="text-[11px] text-slate-400">Batas: {formatRupiah(limit)}</span>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                            {percentage >= 100 ? 'Melebihi batas' : percentage >= 75 ? 'Hampir batas' : 'Aman'}
                          </span>
                        </div>
                        <div className="mb-1.5 flex justify-between text-xs tabular-nums">
                          <span className="font-bold">{formatRupiah(spent)}</span>
                          <span className="text-slate-500">{percentage}%</span>
                        </div>
                        <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percentage)}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {spent <= limit ? <>Sisa anggaran: <strong>{formatRupiah(limit - spent)}</strong></> : <>Melebihi: <strong className="text-rose-600 dark:text-rose-400">{formatRupiah(spent - limit)}</strong></>}
                        </p>
                      </div>
                    )
                  })}
                  {EXPENSE_CATEGORIES.every((category) => (budgets[category.id] ?? 0) <= 0) && (
                    <p className="col-span-full rounded-xl border border-dashed border-blue-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Belum ada target anggaran. Atur batas kategori untuk mulai memantau pengeluaran.</p>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'savings' && (
              <section className="space-y-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div>
                  <h2 className="font-bold">Target tabungan</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Buat target dan perbarui jumlah yang sudah terkumpul secara manual.
                  </p>
                </div>

                <form onSubmit={saveSavingsGoal} className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="savings-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nama target</label>
                    <input
                      id="savings-name"
                      type="text"
                      required
                      maxLength={60}
                      value={savingsDraft.name}
                      onChange={(event) => setSavingsDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Contoh: Dana liburan"
                      className="w-full rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="savings-target" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Nominal target</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                      <input
                        id="savings-target"
                        type="text"
                        inputMode="numeric"
                        required
                        value={savingsDraft.targetAmount}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '')
                          setSavingsDraft((current) => ({
                            ...current,
                            targetAmount: digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '',
                          }))
                        }}
                        placeholder="0"
                        className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="savings-saved" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Sudah terkumpul</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                      <input
                        id="savings-saved"
                        type="text"
                        inputMode="numeric"
                        value={savingsDraft.savedAmount}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '')
                          setSavingsDraft((current) => ({
                            ...current,
                            savedAmount: digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '',
                          }))
                        }}
                        placeholder="0"
                        className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
                    {editingSavingsGoalId && (
                      <button type="button" onClick={cancelSavingsEdit} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
                        Batal edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!currentUser}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {editingSavingsGoalId ? 'Simpan perubahan' : 'Tambah target'}
                    </button>
                  </div>
                </form>

                {savingsGoals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-blue-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    Belum ada target tabungan. Isi formulir di atas untuk mulai.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {savingsGoals.map((goal) => {
                      const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                      const isComplete = goal.savedAmount >= goal.targetAmount
                      return (
                        <article key={goal.id} className="rounded-2xl border border-blue-100 p-4 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold">{goal.name}</h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Target {formatRupiah(goal.targetAmount)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${isComplete ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'}`}>
                              {isComplete ? 'Tercapai' : `${progress}%`}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold tabular-nums">{formatRupiah(goal.savedAmount)} terkumpul</span>
                            <span className="text-slate-500 dark:text-slate-400">{formatRupiah(Math.max(0, goal.targetAmount - goal.savedAmount))} lagi</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => editSavingsGoal(goal)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800">
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteSavingsGoal(goal.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                              Hapus
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'savings' && (
              <section className="space-y-5">
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:p-6">
                  <div>
                    <h2 className="font-bold">Ringkasan tabungan</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ringkasan target dan jumlah tabungan yang sudah terkumpul.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Target keseluruhan</p>
                    <p className="mt-2 truncate text-xl font-extrabold tabular-nums">{formatRupiah(totalSavingsTarget)}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total terkumpul</p>
                    <p className="mt-2 truncate text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(totalSavedAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Progres keseluruhan</p>
                    <p className="mt-2 text-xl font-extrabold tabular-nums text-blue-700 dark:text-blue-300">{totalSavingsProgress}%</p>
                  </div>
                </div>

              </section>
            )}

            {(activeTab === 'dashboard' || activeTab === 'transactions') && (
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-4 border-b border-blue-100 p-5 dark:border-slate-800 sm:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-bold">Riwayat transaksi</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Pemasukan dan pengeluaran yang tercatat.</p>
                    </div>
                    <div className="inline-flex self-start rounded-xl bg-blue-50 p-1 dark:bg-slate-800">
                      {(['all', 'income', 'expense', 'transfer'] as const).map((filter) => (
                        <button
                          type="button"
                          key={filter}
                          onClick={() => setTypeFilter(filter)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${typeFilter === filter ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          {filter === 'all' ? 'Semua' : filter === 'income' ? 'Pemasukan' : filter === 'transfer' ? 'Tabungan' : 'Pengeluaran'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari catatan atau kategori..."
                      aria-label="Cari transaksi"
                      className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 sm:col-span-2"
                    />
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      aria-label="Filter kategori"
                      className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="all">Semua kategori</option>
                      {ALL_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                </div>

                {isLoading ? (
                  <p className="p-8 text-center text-sm text-slate-500">Memuat transaksi...</p>
                ) : filteredTransactions.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">▤</span>
                    <h3 className="mb-1 text-sm font-semibold">Belum ada transaksi ditemukan</h3>
                    <p className="mx-auto mb-4 max-w-xs text-xs text-slate-500 dark:text-slate-400">Coba ubah filter atau catat transaksi baru.</p>
                    <button type="button" onClick={showQuickEntry} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">ϟ Catat sekarang</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-blue-100 bg-blue-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
                          <th className="px-5 py-3.5">Transaksi</th>
                          <th className="px-4 py-3.5">Kategori</th>
                          <th className="px-4 py-3.5">Tanggal</th>
                          <th className="px-5 py-3.5 text-right">Nominal</th>
                          <th className="w-16 px-4 py-3.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/70">
                        {filteredTransactions.map((transaction) => {
                          const category = getCategory(transaction.type, transaction.category)
                          return (
                            <tr key={transaction.id} className="transition-colors hover:bg-blue-50/70 dark:hover:bg-slate-800/40">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-slate-800">{category.icon}</span>
                                  <span className="max-w-64 truncate text-xs font-medium sm:text-sm">{transaction.note || category.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">{category.name}</td>
                              <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{formatTransactionDate(transaction.date)}</td>
                              <td className={`px-5 py-3.5 text-right text-xs font-bold tabular-nums sm:text-sm ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : transaction.type === 'transfer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '↗' : '−'} {formatRupiah(transaction.amount)}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button type="button" onClick={() => void handleDelete(transaction.id)} title="Hapus transaksi" aria-label={`Hapus ${transaction.note || category.name}`} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400">⌫</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>

        {isBudgetModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsBudgetModalOpen(false)
            }}
          >
            <div role="dialog" aria-modal="true" aria-labelledby="budget-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4 dark:border-slate-800">
                <h2 id="budget-title" className="font-bold">Atur anggaran bulanan</h2>
                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Tutup">×</button>
              </div>
              <form onSubmit={saveBudgets} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
                {EXPENSE_CATEGORIES.map((category) => (
                  <div key={category.id}>
                    <label htmlFor={`budget-${category.id}`} className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{category.icon}</span>{category.name}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                      <input
                        id={`budget-${category.id}`}
                        type="text"
                        inputMode="numeric"
                        value={budgetDraft[category.id] ?? ''}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '')
                          setBudgetDraft((current) => ({
                            ...current,
                            [category.id]: digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '',
                          }))
                        }}
                        placeholder="0"
                        className="w-full rounded-xl border border-blue-100 bg-blue-50 py-2 pl-9 pr-3 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-2 border-t border-blue-100 pt-4 dark:border-slate-800">
                  <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
                  <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700">Simpan anggaran</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
