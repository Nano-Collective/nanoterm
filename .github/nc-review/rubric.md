# nc-review rubric — nanoterm

This is the **project** half of the rubric: what nanoterm cares about. The
reviewing method — how to read a diff against a base checkout, how to rate
severity, what to emit — is the shared base rubric you were also given. Read
both; where they disagree, this file wins.

## What this project is, and why that changes review

nanoterm turns a sentence in English into a **shell command and then runs it**.
The model chooses the command; a safety classifier and an approval prompt stand
between that choice and the user's filesystem.

That makes this the highest-consequence repository in the collective. Everywhere
else a bug produces a wrong answer. Here a bug produces `rm -rf` on somebody's
home directory, or a credential posted to a stranger's endpoint, and there is no
undo.

Read every diff against one question: **does this make it easier for a
destructive or exfiltrating command to reach execution without the user
knowingly agreeing?** If the answer is yes, or you cannot tell, that is
`blocking`.

## The safety path is the product

`safety.ts`, `approval.ts` and `execute.ts` are the load-bearing files. Treat
any change to them as security-critical by default, and read them with a hostile
eye.

### `isDangerousCommand` must not be bypassable

The classifier decides whether a command needs explicit approval. Its own test
suite asserts it *"cannot be bypassed with paths, wrappers, or long flags"* —
that is the standard. When a diff touches it, actively try to defeat it:

- **Wrappers** — `sh -c`, `bash -c`, `env`, `xargs`, `nohup`, `sudo`, `time`,
  `nice`, backticks, `$( )`.
- **Path forms** — `/bin/rm`, `./rm`, `../../bin/rm`, a relative path, a symlink.
- **Flag spellings** — `-rf` vs `--recursive --force` vs `-r -f`, clustered vs
  separated, `--` terminators.
- **Chaining and substitution** — `;`, `&&`, `||`, `|`, newlines, `$(...)`.
- **Quoting and whitespace** — extra spaces, tabs, quoted fragments, escapes.

A classifier change that narrows matching, or adds a fast path that returns
early, needs a test for each evasion shape it could reopen. **A pattern that is
easier to read but matches less is a regression**, and it will not look like one.

If a diff adds a new command family to the dangerous list, check the negative
direction too: does it now flag something harmless so often that users learn to
approve reflexively? A prompt everyone dismisses is not a control.

### Approval must be informed and unskippable

The user must see **the command that will actually run** — after any expansion,
substitution or rewriting — not an earlier or prettier version of it. A diff
that changes the command between display and execution is `blocking`, however
small the change.

Anything that adds a way to skip the prompt — a flag, an env var, a config key,
a "trusted" list — deserves the strongest scrutiny in this repository. Ask who
can set it, whether it can be set by something other than the user, and whether
its effect is obvious at the moment of use.

### Execution

Check that the command is not re-parsed by another shell after classification,
that failure and timeout are handled, and that nothing about the environment
passed to the child leaks more than it needs.

## Privacy and providers

`privacy.ts`, `provider.ts` and `env.ts` decide what leaves the machine. The
user's prompt can contain paths, hostnames and secrets, and it is sent to
OpenAI, Anthropic, Google or Atlas Cloud.

- API keys must not reach logs, error messages, session files or the model
  prompt.
- A change that widens what is sent — more context, more of the working
  directory, shell history — is a finding unless the PR argues for it
  explicitly.
- Adding or changing a provider endpoint is security-relevant.

## Public contracts

Breaking these is `blocking` without a changeset and a deliberate bump:

- The config file schema and its location.
- CLI flags and their semantics — especially anything affecting approval.
- Session file format.
- The provider configuration shape.

## Tests

Tests live in **`tests/**/*.test.ts`** — a separate tree, not colocated, and not
`.spec.ts`. Ava is configured to look only there, so a test file placed beside
the source silently never runs. Flag that when you see it.

Coverage here recently climbed past the collective's 80% bar. A safety change
without a test is `blocking` regardless of the overall number: the tests for
`isDangerousCommand` are the specification of what "dangerous" means, and a
change to the behaviour that leaves them untouched has changed the meaning
without saying so.

For a new dangerous-command pattern, the useful test is not that it matches —
it is that the **evasion shapes above** still match.

## Scope

Small quality-of-life PRs are welcome and common. But a change that touches
`safety.ts`, `approval.ts` or `execute.ts` is never small, whatever its diff
size. Say so, and hold it to the standard above.
