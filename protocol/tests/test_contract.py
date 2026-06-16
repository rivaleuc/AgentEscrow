import json


def _prompt(gl_mod, ret):
    gl_mod.nondet.exec_prompt = lambda *a, **k: ret


def _judged(contract, gl_mod, ret):
    _prompt(gl_mod, ret)
    k = contract.create_task("build a parser", "must parse JSON")
    contract.submit_output(k, "here is the output")
    contract.judge_output(k)
    return contract.get_task(k)


def test_anchor_accepted(contract, gl_mod):
    t = _judged(contract, gl_mod, {"verdict": "accepted", "reasoning": "meets all criteria"})
    assert t["verdict"] == "accepted"
    assert t["passed"] is True


def test_anchor_rejected(contract, gl_mod):
    t = _judged(contract, gl_mod, {"verdict": "rejected", "reasoning": "missing required fields"})
    assert t["verdict"] == "rejected"
    assert t["passed"] is False


def test_validator_rejects_bad_inputs(contract, gl_mod):
    _judged(contract, gl_mod, {"verdict": "accepted", "reasoning": "good enough here"})
    v = gl_mod.vm._last_validator
    R = gl_mod.vm.Return
    assert v(object()) is False
    assert v(R("not valid json")) is False
    # bad enum value
    assert v(R(json.dumps({"verdict": "maybe", "passed": False, "reasoning": "xxxxxxxx"}))) is False
    # passed is not a real bool (int guard)
    assert v(R(json.dumps({"verdict": "accepted", "passed": 1, "reasoning": "xxxxxxxx"}))) is False
    # cross-field invariant broken
    assert v(R(json.dumps({"verdict": "accepted", "passed": False, "reasoning": "xxxxxxxx"}))) is False
    assert v(R(json.dumps({"verdict": "rejected", "passed": True, "reasoning": "xxxxxxxx"}))) is False
    # reasoning too short
    assert v(R(json.dumps({"verdict": "accepted", "passed": True, "reasoning": "short"}))) is False
    # fully valid
    assert v(R(json.dumps({"verdict": "accepted", "passed": True, "reasoning": "long enough reason"}))) is True
    assert v(R(json.dumps({"verdict": "rejected", "passed": False, "reasoning": "long enough reason"}))) is True


def test_normalized_output_always_validates(contract, gl_mod):
    # Messy model output (uppercase, padded, no `passed` field) must still
    # normalize to something the validator accepts.
    _prompt(gl_mod, {"verdict": "  ACCEPTED ", "reasoning": "this is the reasoning"})
    k = contract.create_task("s", "c")
    contract.submit_output(k, "o")
    contract.judge_output(k)  # raises if normalized output failed validation
    out = gl_mod.vm._last_leader()
    assert gl_mod.vm._last_validator(gl_mod.vm.Return(out)) is True
    data = json.loads(out)
    assert data["verdict"] == "accepted"
    assert data["passed"] is True
