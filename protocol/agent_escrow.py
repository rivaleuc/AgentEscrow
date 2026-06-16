# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

class AgentEscrow(gl.Contract):
    tasks: TreeMap[str, str]
    task_count: u256

    def __init__(self):
        self.task_count = u256(0)

    @gl.public.write
    def create_task(self, spec: str, acceptance_criteria: str) -> str:
        key = str(int(self.task_count))
        task = {"creator": str(gl.message.sender_address), "spec": str(spec).strip()[:2000], "criteria": str(acceptance_criteria).strip()[:1000], "output": "", "status": "open", "verdict": ""}
        self.tasks[key] = json.dumps(task)
        self.task_count += u256(1)
        return key

    @gl.public.write
    def submit_output(self, task_key: str, output: str) -> None:
        task_key = str(task_key)
        if task_key not in self.tasks: raise Exception("unknown")
        task = json.loads(self.tasks[task_key])
        if task["status"] != "open": raise Exception("not open")
        task["output"] = str(output).strip()[:3000]; task["status"] = "submitted"
        self.tasks[task_key] = json.dumps(task)

    @gl.public.write
    def judge_output(self, task_key: str) -> None:
        task_key = str(task_key)
        if task_key not in self.tasks: raise Exception("unknown")
        task = json.loads(self.tasks[task_key])
        if task["status"] != "submitted": raise Exception("not submitted")
        verdict = self._judge(task)
        task["status"] = "judged"; task["verdict"] = verdict["verdict"]; task["passed"] = verdict["passed"]
        self.tasks[task_key] = json.dumps(task)

    def _judge(self, task):
        def leader_fn() -> str:
            prompt = f"""Judge if AI agent output meets acceptance criteria.\nSPEC: {task['spec']}\nCRITERIA: {task['criteria']}\nOUTPUT: {task['output']}\n\nReply JSON: {{"verdict": "accepted"/"rejected", "reasoning": "<brief>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            data = raw if isinstance(raw, dict) else json.loads(str(raw).strip())
            verdict = str(data.get("verdict", "")).strip().lower()
            reasoning = str(data.get("reasoning", "")).strip()
            # Deterministic anchor derived by the leader: passed is a pure function of verdict.
            passed = (verdict == "accepted")
            return json.dumps({"verdict": verdict, "passed": passed, "reasoning": reasoning})
        def validator_fn(r) -> bool:
            if not isinstance(r, gl.vm.Return): return False
            try:
                data = json.loads(r.calldata)
            except Exception:
                return False
            verdict = data.get("verdict")
            passed = data.get("passed")
            reasoning = data.get("reasoning")
            # enum check
            if verdict not in ("accepted", "rejected"): return False
            # bool guard (reject int/str truthy values masquerading as bool)
            if not isinstance(passed, bool): return False
            # cross-field invariant: passed must equal the deterministic verdict mapping
            if passed != (verdict == "accepted"): return False
            # reasoning must be present (length range), no free-form text comparison
            if not isinstance(reasoning, str) or len(reasoning.strip()) < 8: return False
            return True
        return json.loads(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))

    @gl.public.view
    def get_task(self, key: str) -> dict:
        key = str(key)
        if key not in self.tasks: return {"exists": False}
        return json.loads(self.tasks[key])

    @gl.public.view
    def stats(self) -> dict:
        return {"total_tasks": int(self.task_count)}
