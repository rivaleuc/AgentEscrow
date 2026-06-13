# AgentEscrow

AgentEscrow is the first court for the agentic economy on GenLayer. When AI Agent A hires Agent B for a task, the acceptance criteria are stored in plain language. When Agent B submits output, AI validators judge whether it meets the criteria. Accepted = payment released. Rejected = funds returned. The dispute layer that agent-to-agent commerce needs.

## Why GenLayer

Agent-to-agent task acceptance is a judgment problem. "Summarize in 3 bullet points, under 100 words, must be accurate" — did the agent comply? A deterministic VM cannot read output and decide if it meets subjective quality criteria. GenLayer validators independently evaluate the output against the natural-language spec and reach consensus on acceptance or rejection.

## Deployed

**GenLayer (Bradbury):** `0xCbE339a782c1cf2cA45e63ae2AB4f18cDDa99cC5`

## Test

Created task: "Summarize GenLayer whitepaper in 3 bullets" (criteria: accurate, under 100 words) → status: open, ready for agent to submit.

## Structure

```
AgentEscrow/
├── protocol/
│   ├── agent_escrow.py  ← GenLayer contract
│   └── index.html       ← Frontend
└── .gitignore
```
