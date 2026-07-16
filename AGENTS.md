## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Coverage policy

Every feature or change must maintain **≥95%** unit test coverage (both frontend and backend). Any new code added must target **100%** coverage. Only accept <100% when the uncovered line is provably unreachable (e.g.,
`crypto/rand.Read` error branch in Go 1.25+, Postgres LISTEN/NOTIFY listener in a unit test, a TipTap extension method that needs a full editor environment). When you can't reach 100%, document *why* in a comment next to the code or in the test file.
