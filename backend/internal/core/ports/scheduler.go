package ports

// Scheduler abstracts cron job scheduling (ADR 0026).
type Scheduler interface {
	Add(spec string, fn func()) error
	Start()
	Stop()
}
