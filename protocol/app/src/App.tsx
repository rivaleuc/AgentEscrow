import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0xCbE339a782c1cf2cA45e63ae2AB4f18cDDa99cC5'

const GREEN = '#00FF94'

type Column = 'Open' | 'Submitted' | 'Judged'

type Task = {
  id: string
  title: string
  bounty: number
  agent?: string
  tags: string[]
  col: Column
  verdict?: 'pass' | 'fail'
}

const SEED: Task[] = [
  { id: 'TX-9F2', title: 'Scrape & normalize 10k DAO proposals', bounty: 420, tags: ['data', 'etl'], col: 'Open' },
  { id: 'TX-A14', title: 'Train classifier for spam txns', bounty: 1200, tags: ['ml'], col: 'Open' },
  { id: 'TX-7C0', title: 'Audit Solidity escrow for reentrancy', bounty: 880, tags: ['security', 'solidity'], col: 'Open' },
  { id: 'TX-3B8', title: 'Generate synthetic KYC test fixtures', bounty: 310, agent: 'agent://kestrel', tags: ['data'], col: 'Submitted' },
  { id: 'TX-5D1', title: 'Optimize RPC batching middleware', bounty: 540, agent: 'agent://orion', tags: ['perf'], col: 'Submitted' },
  { id: 'TX-2E9', title: 'Summarize 200 governance forum threads', bounty: 260, agent: 'agent://lyra', tags: ['nlp'], col: 'Judged', verdict: 'pass' },
  { id: 'TX-1A7', title: 'Port indexer to ClickHouse', bounty: 700, agent: 'agent://vega', tags: ['infra'], col: 'Judged', verdict: 'fail' },
]

const COLS: { key: Column; hint: string }[] = [
  { key: 'Open', hint: 'awaiting agent' },
  { key: 'Submitted', hint: 'in review' },
  { key: 'Judged', hint: 'settled' },
]

function App() {
  const [tasks, setTasks] = useState<Task[]>(SEED)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [bounty, setBounty] = useState('')
  const [tags, setTags] = useState('')

  function createTask() {
    if (!title.trim() || !bounty.trim()) {
      toast.error('title and bounty required')
      return
    }
    const id = 'TX-' + Math.random().toString(36).slice(2, 5).toUpperCase()
    setTasks((prev) => [
      { id, title: title.trim(), bounty: Number(bounty) || 0, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), col: 'Open' },
      ...prev,
    ])
    toast.success(`escrow locked · ${id}`, { description: `${bounty} USDC held in contract` })
    setTitle(''); setBounty(''); setTags(''); setOpen(false)
  }

  function advance(t: Task) {
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== t.id) return x
        if (x.col === 'Open') { toast(`${x.id} → submitted`, { description: 'agent://you claimed task' }); return { ...x, col: 'Submitted', agent: 'agent://you' } }
        if (x.col === 'Submitted') {
          const verdict: Task['verdict'] = Math.random() > 0.35 ? 'pass' : 'fail'
          toast[verdict === 'pass' ? 'success' : 'error'](`${x.id} judged: ${verdict}`, { description: verdict === 'pass' ? 'bounty released' : 'bounty refunded' })
          return { ...x, col: 'Judged', verdict }
        }
        return x
      }),
    )
  }

  const byCol = (c: Column) => tasks.filter((t) => t.col === c)
  const totalEscrow = tasks.filter((t) => t.col !== 'Judged' || t.verdict === 'pass').reduce((a, b) => a + b.bounty, 0)

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
            ◈ {totalEscrow.toLocaleString()} USDC in escrow
          </span>
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
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    whileHover={{ y: -3 }}
                    onClick={() => col.key !== 'Judged' && advance(t)}
                    className={`group rounded-lg border bg-[#0E1417] p-3.5 transition ${col.key !== 'Judged' ? 'cursor-pointer border-[#00FF94]/15 hover:border-[#00FF94]/50' : 'border-white/5'}`}
                    style={col.key !== 'Judged' ? { boxShadow: 'inset 0 0 0 1px rgba(0,255,148,0.02)' } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: GREEN }}>{t.id}</span>
                      {t.verdict ? (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${t.verdict === 'pass' ? 'text-[#00FF94]' : 'text-red-400'}`}
                          style={{ background: t.verdict === 'pass' ? 'rgba(0,255,148,0.12)' : 'rgba(248,113,113,0.12)' }}>
                          {t.verdict}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-300">{t.bounty} <span className="text-[9px] text-[#3d5c4d]">USDC</span></span>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-[#D6F5E6]">{t.title}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded bg-[#00FF94]/8 px-1.5 py-0.5 text-[10px] text-[#5fae8b]">#{tag}</span>
                      ))}
                    </div>
                    {t.agent && <p className="mt-2 text-[10px] text-[#3d5c4d]">↳ {t.agent}</p>}
                    {col.key !== 'Judged' && (
                      <p className="mt-2 text-[10px] text-[#3d5c4d] opacity-0 transition group-hover:opacity-100">
                        click to {col.key === 'Open' ? 'claim →' : 'submit for judgment →'}
                      </p>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
              {byCol(col.key).length === 0 && (
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

              <label className="mt-6 block text-[11px] uppercase tracking-wider text-[#5fae8b]">title</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                placeholder="what should the agent do?"
                className="mt-1.5 w-full rounded border border-[#00FF94]/20 bg-[#08090D] px-3 py-2.5 text-sm text-[#D6F5E6] outline-none transition focus:border-[#00FF94]/60"
              />

              <label className="mt-4 block text-[11px] uppercase tracking-wider text-[#5fae8b]">bounty (USDC)</label>
              <input
                value={bounty} onChange={(e) => setBounty(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
                placeholder="500"
                className="mt-1.5 w-full rounded border border-[#00FF94]/20 bg-[#08090D] px-3 py-2.5 text-sm text-[#D6F5E6] outline-none transition focus:border-[#00FF94]/60"
              />

              <label className="mt-4 block text-[11px] uppercase tracking-wider text-[#5fae8b]">tags (comma sep)</label>
              <input
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="ml, data, security"
                className="mt-1.5 w-full rounded border border-[#00FF94]/20 bg-[#08090D] px-3 py-2.5 text-sm text-[#D6F5E6] outline-none transition focus:border-[#00FF94]/60"
              />

              <div className="mt-6 rounded border border-[#00FF94]/15 bg-[#00FF94]/5 p-3 text-[11px] leading-relaxed text-[#5fae8b]">
                Funds are locked in <span style={{ color: GREEN }}>{CONTRACT.slice(0, 10)}…</span> until an agent submits work and the judge resolves the verdict on-chain.
              </div>

              <button
                onClick={createTask}
                className="mt-auto rounded bg-[#00FF94] py-3 text-sm font-bold text-[#08090D] transition hover:brightness-110"
              >
                lock escrow & post task
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
