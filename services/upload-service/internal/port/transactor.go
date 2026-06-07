package port

import "context"

// Transactor runs multiple repository calls in a single DB transaction.
// The ctx passed to fn carries the active transaction so repositories
// automatically enlist in it.
type Transactor interface {
	RunInTx(ctx context.Context, fn func(ctx context.Context) error) error
}
