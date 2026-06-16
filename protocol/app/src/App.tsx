import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { read, write, CONTRACT, connectWallet, isWalletConnected } from './genlayer'

const GREEN = '#00FF94'

type Column = 'Open' | 'Submitted' | 'Judged'

type Task = {
  key: string
  id: string
  spec: string
  criteria: string
  output?: string
  status: string
  col: Column
  verdict?: 'pass' | 'fail'
}

function verdictOf(v: any): 'pass' | 'fail' | undefined {
  if (v == null || v === '') return undefined
  const s = String(v).toLowerCase()
  if (s.includes('accept') || s.includes('pass') || s.includes('approv') || s === 'true') return 'pass'
  if (s.includes('reject') || s.includes('fail') || s === 'false') return 'fail'
  return undefined
}

function statusToCol(status: any, verdict: 'pass' | 'fail' | undefined): Column {
  const s = String(status ?? '').toLowerCase()
  if (verdict || s.includes('judg') || s.includes('accept') || s.includes('reject') || s.includes('resolv') || s.includes('settl') || s.includes('done')) return 'Judged'
  if (s.includes('submit') || s.includes('review') || s.includes('pending')) return 'Submitted'
  return 'Open'
}

function mapTask(key: string, t: any): Task {
  const verdict = verdictOf(t?.verdict)
  return {
    key,
    id: 'TX-' + key,
    spec: String(t?.spec ?? `task-${key}`),
    criteria: String(t?.criteria ?? ''),
    output: t?.output != null && String(t.output) ? String(t.output) : undefined,
    status: String(t?.status ?? 'open'),
    col: statusToCol(t?.status, verdict),
    verdict,
  }
}

const COLS: { key: Column; hint: string }[] = [
  { key: 'Open', hint: 'awaiting agent' },
  { key: 'Submitted', hint: 'in review' },
  { key: 'Judged', hint: 'settled' },
]

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [open, setOpen] = useState(false)
  const [spec, setSpec] = useState('')
  const [criteria, setCriteria] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<string | null>(null)

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  async function handleConnect() {
    try {
      const addr = await connectWallet()
      setWallet(addr)
      toast.success(`wallet ${isWalletConnected() ? 'connected' : 'linked'} · ${shortAddr(addr)}`)
    } catch (e: any) {
      toast.error('wallet connection failed', { description: String(e?.message ?? e) })
    }
  }

  async function loadTasks() {
    try {
      const s: any = await read('stats')
      const total = Number(s?.total_tasks ?? 0)
      const arr: Task[] = []
      for (let i = 0; i < total; i++) {
        const key = String(i)
        try {
          const t: any = await read('get_task', [key])
          if (t) arr.push(mapTask(key, t))
        } catch {
          /* skip */
        }
      }
      setTasks(arr)
    } catch (e: any) {
      toast.error('Failed to load tasks', { description: String(e?.message ?? e) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createTask() {
    if (!spec.trim() || !criteria.trim()) {
      toast.error('spec and acceptance criteria required')
      return
    }
    setCreating(true)
    const tId = toast.loading('posting task on-chain… (30–60s)')
    try {
      await write('create_task', [spec.trim(), criteria.trim()])
      await read('stats')
      await loadTasks()
      toast.success('task posted on-chain', { id: tId })
      setSpec('')
      setCriteria('')
      setOpen(false)
    } catch (e: any) {
      toast.error('create failed', { id: tId, description: String(e?.message ?? e) })
    } finally {
      setCreating(false)
    }
  }

  async function submitOutput(t: Task) {
    if (busy) return
    const output = window.prompt(`Paste agent deliverable for ${t.id}:`)
    if (output === null) return
    if (!output.trim()) {
      toast.error('output required')
      return
    }
    setBusy(t.key)
    const tId = toast.loading(`submitting output for ${t.id} on-chain… (30–60s)`)
    try {
      await write('submit_output', [t.key, output.trim()])
      await loadTasks()
      toast.success(`${t.id} → submitted`, { id: tId, description: 'agent://you submitted work' })
    } catch (e: any) {
      toast.error('submit failed', { id: tId, description: String(e?.message ?? e) })
    } finally {
      setBusy(null)
    }
  }

  async function judge(t: Task) {
    if (busy) return
    setBusy(t.key)
    const tId = toast.loading(`judge resolving ${t.id} on-chain… (30–60s)`)
    try {
      await write('judge_output', [t.key])
      const r: any = await read('get_task', [t.key])
      const verdict = verdictOf(r?.verdict)
      setTasks((prev) =>
        prev.map((x) =>
          x.key === t.key
            ? { ...x, col: 'Judged', verdict, status: String(r?.status ?? 'judged'), output: r?.output != null && String(r.output) ? String(r.output) : x.output }
            : x,
        ),
      )
      toast[verdict === 'fail' ? 'error' : 'success'](`${t.id} judged: ${verdict ?? 'resolved'}`, {
        id: tId,
        description: verdict === 'fail' ? 'verdict: rejected — recorded on-chain' : 'verdict: accepted — recorded on-chain',
      })
    } catch (e: any) {
      toast.error('judge failed', { id: tId, description: String(e?.message ?? e) })
    } finally {
      setBusy(null)
    }
  }

  function onCardClick(t: Task) {
    if (t.col === 'Open') submitOutput(t)
    else if (t.col === 'Submitted') judge(t)
  }

  const byCol = (c: Column) => tasks.filter((t) => t.col === c)
  const totalTasks = useMemo(() => tasks.length, [tasks])

  return (
    <div className="matrix-grid min-h-screen font-mono" style={{ background: '#08090D', color: '#D6F5E6' }}>
      <Toaster position="top-center" theme="dark" />

      {/* TOOLBAR */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[#00FF94]/15 bg-[#08090D]/90 px-5 py-3.5 backdrop-blur">
        <span className="text-sm font-bold tracking-tight" style={{ color: GREEN }}>
          agent_escrow<span className="cursor-blink" />
        </span>
        <span className="hidden text-[11px] text-[#3d5c4d] sm:inline">// trustless task settlement</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded border border-[#00FF94]/20 bg-[#00FF94]/5 px-2.5 py-1 text-[11px] md:inline" style={{ color: GREEN }}>
            ◈ {totalTasks} task{totalTasks === 1 ? '' : 's'} on-chain
          </span>
          <button
            onClick={handleConnect}
            className="rounded border border-[#00FF94]/40 bg-[#00FF94]/5 px-3.5 py-1.5 text-xs font-bold transition hover:bg-[#00FF94]/15"
            style={{ color: GREEN }}
          >
            {wallet ? `◉ ${shortAddr(wallet)}` : 'connect wallet'}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="rounded border border-[#00FF94]/40 bg-[#00FF94]/10 px-3.5 py-1.5 text-xs font-bold transition hover:bg-[#00FF94]/20"
            style={{ color: GREEN }}
          >
            + new task
          </button>
        </div>
      </header>

      <div className="px-5 pb-3 pt-2">
        <code className="text-[10px] text-[#3d5c4d]">contract {CONTRACT}</code>
      </div>

      {/* BOARD */}
      <main className="grid grid-cols-1 gap-4 px-5 pb-10 md:grid-cols-3">
        {COLS.map((col) => (
          <section key={col.key} className="flex flex-col rounded-xl border border-[#00FF94]/12 bg-[#0B0F12]/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: GREEN }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
                {col.key.toUpperCase()}
                <span className="text-[10px] font-normal text-[#3d5c4d]">/ {col.hint}</span>
              </h2>
              <span className="rounded bg-[#00FF94]/10 px-2 py-0.5 text-[11px]" style={{ color: GREEN }}>{byCol(col.key).length}</span>
            </div>
            <div className="flex min-h-[120px] flex-col gap-3">
              <AnimatePresence>
                {byCol(col.key).map((t) => (
                  <motion.article
                    key={t.key}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => col.key !== 'Judged' && busy !== t.key && onCardClick(t)}
                    className={`group rounded-lg border bg-[#0E1417] p-3.5 transition ${col.key !== 'Judged' ? 'cursor-pointer border-[#00FF94]/15 hover:border-[#00FF94]/50' : 'border-white/5'} ${busy === t.key ? 'opacity-60' : ''}`}
                    style={col.key !== 'Judged' ? { boxShadow: 'inset 0 0 0 1px rgba(0,255,148,0.02)' } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: GREEN }}>{t.id}</span>
                      {t.verdict ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${t.verdict === 'pass' ? 'text-[#00FF94]' : 'text-red-400'}`}
                          style={{ background: t.verdict === 'pass' ? 'rgba(0,255,148,0.12)' : 'rgba(248,113,113,0.12)' }}>
                          {t.verdict === 'pass' ? 'accepted' : 'rejected'}
                        </span>
                      ) : (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300" style={{ background: 'rgba(252,211,77,0.10)' }}>
                          {t.col}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-[#D6F5E6]">{t.spec}</p>
                    {t.criteria && (
                      <p className="mt-2 text-[10px] leading-snug text-[#5fae8b]">
                        <span className="text-[#3d5c4d]">accept: </span>{t.criteria}
                      </p>
                    )}
                    {t.output && (
                      <p className="mt-2 line-clamp-3 rounded bg-[#00FF94]/5 px-2 py-1 text-[10px] leading-snug text-[#9fe7c4]">
                        ↳ {t.output}
                      </p>
                    )}
                    {col.key !== 'Judged' && (
                      <p className="mt-2 text-[10px] text-[#3d5c4d] opacity-0 transition group-hover:opacity-100">
                        {busy === t.key ? 'working on-chain…' : `click to ${col.key === 'Open' ? 'submit output →' : 'summon judge →'}`}
                      </p>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
              {loading && byCol(col.key).length === 0 && (
                <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-[#00FF94]/10 py-8 text-[11px] text-[#3d5c4d]">
                  ◌ syncing…
                </div>
              )}
              {!loading && byCol(col.key).length === 0 && (
                <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-[#00FF94]/10 py-8 text-[11px] text-[#3d5c4d]">
                  ∅ empty
                </div>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* SLIDE-OVER PANEL */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-[#00FF94]/25 bg-[#0B0F12] p-6 font-mono"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: GREEN }}>$ create_task --escrow</h3>
                <button onClick={() => setOpen(false)} className="text-[#3d5c4d] hover:text-[#D6F5E6]">[esc]</button>
              </div>

              <label className="mt-6 block text-[11px] uppercase tracking-wider text-[#5fae8b]">task spec</label>
              <textarea
                value={spec} onChange={(e) => setSpec(e.target.value)} autoFocus rows={3}
                placeholder="what should the agent do?"
                className="mt-1.5 w-full resize-none rounded border border-[#00FF94]/20 bg-[#08090D] px-3 py-2.5 text-sm text-[#D6F5E6] outline-none transition focus:border-[#00FF94]/60"
              />

              <label className="mt-4 block text-[11px] uppercase tracking-wider text-[#5fae8b]">acceptance criteria</label>
              <textarea
                value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={3}
                placeholder="how the AI judge decides accept / reject"
                className="mt-1.5 w-full resize-none rounded border border-[#00FF94]/20 bg-[#08090D] px-3 py-2.5 text-sm text-[#D6F5E6] outline-none transition focus:border-[#00FF94]/60"
              />

              <div className="mt-6 rounded border border-[#00FF94]/15 bg-[#00FF94]/5 p-3 text-[11px] leading-relaxed text-[#5fae8b]">
                The task spec & acceptance criteria are recorded in <span style={{ color: GREEN }}>{CONTRACT.slice(0, 10)}…</span>. An agent submits work, then the AI judge resolves an accept / reject verdict on-chain via GenLayer consensus.
              </div>

              <button
                onClick={createTask}
                disabled={creating}
                className="mt-auto rounded bg-[#00FF94] py-3 text-sm font-bold text-[#08090D] transition hover:brightness-110 disabled:opacity-50"
              >
                {creating ? 'posting task on-chain…' : 'post task'}
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
