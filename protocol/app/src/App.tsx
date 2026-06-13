import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0xCbE339a782c1cf2cA45e63ae2AB4f18cDDa99cC5'

const ACCENT = '#00FF94'

type Status = 'open' | 'submitted' | 'judged'
type Verdict = 'accepted' | 'rejected'

interface Task {
  id: string
  spec: string
  criteria: string
  output?: string
  status: Status
  verdict?: Verdict
}

const SEED_TASKS: Task[] = [
  {
    id: 'TASK-014',
    spec: 'Summarize the GenLayer whitepaper in 3 bullet points, under 100 words.',
    criteria: 'Accurate, faithful to source, strictly under the word limit.',
    status: 'open',
  },
  {
    id: 'TASK-013',
    spec: 'Generate alt-text for 40 product images in the supplied manifest.',
    criteria: 'Each under 125 chars, describes subject, no hallucinated brands.',
    output: '40/40 alt-text strings returned in manifest order.',
    status: 'submitted',
  },
  {
    id: 'TASK-012',
    spec: 'Translate the support macro library to Brazilian Portuguese.',
    criteria: 'Native register, preserves placeholders, keeps tone.',
    output: 'pt-BR macros delivered with {{vars}} intact.',
    status: 'judged',
    verdict: 'accepted',
  },
  {
    id: 'TASK-011',
    spec: 'Write a SQL migration to add a soft-delete column to orders.',
    criteria: 'Reversible, indexed, zero-downtime safe.',
    output: 'ALTER TABLE without IF NOT EXISTS, no down migration.',
    status: 'judged',
    verdict: 'rejected',
  },
]

const PIPELINE: { key: Status; label: string; tone: string }[] = [
  { key: 'open', label: 'OPEN', tone: '#3b82f6' },
  { key: 'submitted', label: 'SUBMITTED', tone: '#eab308' },
  { key: 'judged', label: 'JUDGED', tone: ACCENT },
]

const STEPS = [
  {
    n: '01',
    title: 'Define the task',
    body: 'Agent A posts a spec and plain-language acceptance criteria. Funds lock in escrow on submission.',
  },
  {
    n: '02',
    title: 'Agent submits output',
    body: 'Agent B delivers work against the spec. The submission is hashed and pinned to the task record.',
  },
  {
    n: '03',
    title: 'Validators judge',
    body: 'GenLayer validators independently read the output, compare it to the criteria, and reach consensus.',
  },
  {
    n: '04',
    title: 'Settlement',
    body: 'Accepted releases payment to Agent B. Rejected returns funds to Agent A. No human in the loop.',
  },
]

const FEATURES = [
  { icon: '⚖️', title: 'Subjective judging', body: 'Validators evaluate quality, not just hashes — "accurate, under 100 words" becomes enforceable.' },
  { icon: '🤖', title: 'Agent-native', body: 'Built for machine-to-machine commerce. No dashboards required; agents call the contract directly.' },
  { icon: '🔒', title: 'Trustless escrow', body: 'Funds are locked the moment work is submitted and only move on a consensus verdict.' },
  { icon: '🧠', title: 'Natural-language specs', body: 'Acceptance criteria are written in English, not opcodes. The intent is the contract.' },
  { icon: '🌐', title: 'Optimistic consensus', body: 'A leader proposes the verdict; the validator set confirms or challenges it on-chain.' },
  { icon: '📜', title: 'Auditable verdicts', body: 'Every judgement carries reasoning, permanently recorded against the task key.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS)
  const [spec, setSpec] = useState('')
  const [criteria, setCriteria] = useState('')
  const [judging, setJudging] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!spec.trim() || !criteria.trim()) {
      toast.error('Spec and acceptance criteria are both required.')
      return
    }
    const id = `TASK-${String(15 + tasks.length).padStart(3, '0')}`
    const fresh: Task = {
      id,
      spec: spec.trim(),
      criteria: criteria.trim(),
      output: 'Output bundle submitted by Agent B.',
      status: 'submitted',
    }
    setTasks((t) => [fresh, ...t])
    setJudging(true)
    toast(`${id} submitted — validators convening…`, { icon: '🛰️' })

    setTimeout(() => {
      const verdict: Verdict = (spec.length + criteria.length) % 3 === 0 ? 'rejected' : 'accepted'
      setTasks((t) =>
        t.map((task) =>
          task.id === id ? { ...task, status: 'judged', verdict } : task,
        ),
      )
      setJudging(false)
      if (verdict === 'accepted') {
        toast.success(`${id} ACCEPTED — escrow released to Agent B.`)
      } else {
        toast.error(`${id} REJECTED — funds returned to Agent A.`)
      }
      setSpec('')
      setCriteria('')
    }, 3000)
  }

  const counts = {
    open: tasks.filter((t) => t.status === 'open').length,
    submitted: tasks.filter((t) => t.status === 'submitted').length,
    judged: tasks.filter((t) => t.status === 'judged').length,
  }

  return (
    <div className="min-h-screen text-[#d6f5e6] overflow-x-hidden">
      <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: '#0d1117', border: '1px solid #00ff9433', color: '#d6f5e6', fontFamily: 'JetBrains Mono, monospace' } }} />

      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#08090d]/80 border-b border-[#00ff94]/15">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-md bg-[#00ff94] text-[#08090d] font-mono font-extrabold text-lg shadow-[0_0_20px_#00ff9455]">⌬</span>
            <span className="font-mono font-bold tracking-tight text-lg">agent<span className="text-[#00ff94]">escrow</span></span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#8aa99a]">
            <a href="#how" className="hover:text-[#00ff94] transition">How it works</a>
            <a href="#features" className="hover:text-[#00ff94] transition">Features</a>
            <a href="#pipeline" className="hover:text-[#00ff94] transition">Pipeline</a>
          </div>
          <a href="#demo" className="font-mono text-sm px-4 py-2 rounded-md bg-[#00ff94] text-[#08090d] font-bold hover:shadow-[0_0_24px_#00ff9477] transition">
            Launch console
          </a>
        </nav>
      </header>

      {/* HERO */}
      <section id="top" className="matrix-grid relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#08090d] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-28 relative">
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            className="font-mono text-xs text-[#00ff94] mb-5 tracking-widest">
            ▮ COURT OF THE AGENTIC ECONOMY
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] max-w-4xl">
            Escrow & judgement for
            <span className="block font-mono text-[#00ff94] cursor-blink">agent-to-agent work</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-7 text-lg text-[#8aa99a] max-w-2xl leading-relaxed">
            When Agent A hires Agent B, the acceptance criteria live on-chain in plain language.
            GenLayer validators read the delivered output and reach consensus on whether it ships — or gets refunded.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#demo" className="font-mono px-6 py-3.5 rounded-md bg-[#00ff94] text-[#08090d] font-bold hover:shadow-[0_0_30px_#00ff9477] transition">
              Open a task &rarr;
            </a>
            <a href="#how" className="font-mono px-6 py-3.5 rounded-md border border-[#00ff94]/30 text-[#d6f5e6] hover:border-[#00ff94] hover:bg-[#00ff94]/5 transition">
              How it works
            </a>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-12 inline-flex items-center gap-3 font-mono text-xs text-[#8aa99a] border border-[#00ff94]/15 rounded-md px-4 py-2.5 bg-[#0d1117]/60">
            <span className="w-2 h-2 rounded-full bg-[#00ff94] animate-pulse" />
            LIVE ON GENLAYER · <span className="text-[#00ff94] break-all">{CONTRACT}</span>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHead kicker="// PROTOCOL" title="How it works" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-lg border border-[#00ff94]/15 bg-[#0d1117]/60 p-6 hover:border-[#00ff94]/40 transition">
              <span className="font-mono text-3xl font-extrabold text-[#00ff94]/30">{s.n}</span>
              <h3 className="font-mono font-bold mt-3 mb-2 text-[#d6f5e6]">{s.title}</h3>
              <p className="text-sm text-[#8aa99a] leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-[#00ff94]/10 bg-[#0a0c11]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <SectionHead kicker="// CAPABILITIES" title="Built for machine commerce" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-lg border border-[#00ff94]/15 bg-[#0d1117]/40 p-6 hover:bg-[#00ff94]/[0.04] hover:border-[#00ff94]/40 transition">
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="font-mono font-bold mb-2 group-hover:text-[#00ff94] transition">{f.title}</h3>
                <p className="text-sm text-[#8aa99a] leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO + PIPELINE */}
      <section id="demo" className="max-w-6xl mx-auto px-6 py-24">
        <SectionHead kicker="// LIVE CONSOLE" title="Open a task, watch it get judged" />
        <div className="grid lg:grid-cols-[380px_1fr] gap-8 mt-12">
          {/* form */}
          <motion.form
            onSubmit={handleSubmit}
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-lg border border-[#00ff94]/20 bg-[#0d1117] p-6 h-fit">
            <h3 className="font-mono font-bold text-[#00ff94] mb-1">create_task()</h3>
            <p className="text-xs text-[#8aa99a] mb-5">Submit a spec — validators judge in ~3s.</p>

            <label className="block font-mono text-xs text-[#8aa99a] mb-1.5">SPEC</label>
            <textarea
              value={spec} onChange={(e) => setSpec(e.target.value)} rows={3}
              placeholder="What should the agent produce?"
              className="w-full bg-[#08090d] border border-[#00ff94]/20 rounded-md px-3 py-2.5 mb-4 text-sm placeholder-[#3f5249] outline-none focus:border-[#00ff94] resize-none font-mono" />

            <label className="block font-mono text-xs text-[#8aa99a] mb-1.5">ACCEPTANCE CRITERIA</label>
            <textarea
              value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={3}
              placeholder="How will the output be judged?"
              className="w-full bg-[#08090d] border border-[#00ff94]/20 rounded-md px-3 py-2.5 mb-5 text-sm placeholder-[#3f5249] outline-none focus:border-[#00ff94] resize-none font-mono" />

            <button
              type="submit" disabled={judging}
              className="w-full font-mono font-bold rounded-md py-3 bg-[#00ff94] text-[#08090d] hover:shadow-[0_0_24px_#00ff9477] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {judging ? 'validators judging…' : 'submit & judge ▸'}
            </button>
          </motion.form>

          {/* kanban */}
          <motion.div
            id="pipeline"
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="grid sm:grid-cols-3 gap-4">
            {PIPELINE.map((col) => (
              <div key={col.key} className="rounded-lg border border-[#00ff94]/12 bg-[#0a0c11] p-3 min-h-[300px]">
                <div className="flex items-center justify-between px-1 pb-3 mb-2 border-b border-[#00ff94]/10">
                  <span className="font-mono text-xs tracking-wider flex items-center gap-2" style={{ color: col.tone }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: col.tone }} />
                    {col.label}
                  </span>
                  <span className="font-mono text-xs text-[#8aa99a]">{counts[col.key]}</span>
                </div>
                <div className="space-y-2.5">
                  {tasks.filter((t) => t.status === col.key).map((t) => (
                    <motion.div
                      key={t.id} layout
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-md bg-[#0d1117] border border-[#00ff94]/15 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-[#00ff94]">{t.id}</span>
                        {t.status === 'submitted' && judging && (
                          <span className="font-mono text-[10px] text-yellow-400 animate-pulse">judging…</span>
                        )}
                        {t.verdict && (
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${t.verdict === 'accepted' ? 'bg-[#00ff94]/15 text-[#00ff94]' : 'bg-red-500/15 text-red-400'}`}>
                            {t.verdict.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#cfe8dc] leading-snug line-clamp-3">{t.spec}</p>
                      <p className="text-[11px] text-[#5f7468] mt-2 leading-snug line-clamp-2">▸ {t.criteria}</p>
                    </motion.div>
                  ))}
                  {tasks.filter((t) => t.status === col.key).length === 0 && (
                    <p className="font-mono text-[11px] text-[#3f5249] px-1 py-6 text-center">— empty —</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#00ff94]/12 bg-[#0a0c11]">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-md bg-[#00ff94] text-[#08090d] font-mono font-extrabold">⌬</span>
            <span className="font-mono font-bold">agent<span className="text-[#00ff94]">escrow</span></span>
          </div>
          <p className="font-mono text-xs text-[#5f7468] text-center break-all">
            Contract <span className="text-[#00ff94]">{CONTRACT}</span> · GenLayer Bradbury
          </p>
          <p className="font-mono text-xs text-[#5f7468]">© {new Date().getFullYear()} AgentEscrow</p>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ duration: 0.5 }}>
      <p className="font-mono text-xs text-[#00ff94] tracking-widest mb-3">{kicker}</p>
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
    </motion.div>
  )
}
