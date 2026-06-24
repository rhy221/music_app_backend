package observability

import (
	"fmt"
	"net"
	"os"
	"sync"
	"time"
)

type logstashWriter struct {
	host    string
	ch      chan []byte
	done    chan struct{}
	closeOnce sync.Once
}

func newLogstashWriter(host string, bufSize int) *logstashWriter {
	w := &logstashWriter{
		host: host,
		ch:   make(chan []byte, bufSize),
		done: make(chan struct{}),
	}
	go w.loop()
	return w
}

// Write copies p into the channel buffer. Never blocks the caller;
// if the channel is full the log entry is silently dropped.
func (w *logstashWriter) Write(p []byte) (int, error) {
	cp := make([]byte, len(p))
	copy(cp, p)
	select {
	case w.ch <- cp:
	default:
	}
	return len(p), nil
}

func (w *logstashWriter) Close() {
	w.closeOnce.Do(func() { close(w.done) })
}

func (w *logstashWriter) loop() {
	var conn net.Conn
	backoff := time.Second

	for {
		if conn == nil {
			var err error
			conn, err = net.DialTimeout("tcp", w.host, 5*time.Second)
			if err != nil {
				fmt.Fprintf(os.Stderr, "logstash: connect %s: %v (retry in %v)\n", w.host, err, backoff)
				select {
				case <-time.After(backoff):
				case <-w.done:
					return
				}
				if backoff < 30*time.Second {
					backoff *= 2
				}
				continue
			}
			backoff = time.Second
		}

		select {
		case msg := <-w.ch:
			if _, err := conn.Write(msg); err != nil {
				conn.Close()
				conn = nil
				// re-queue the failed message
				select {
				case w.ch <- msg:
				default:
				}
			}
		case <-w.done:
			// drain remaining messages
			for {
				select {
				case msg := <-w.ch:
					if conn != nil {
						conn.Write(msg)
					}
				default:
					if conn != nil {
						conn.Close()
					}
					return
				}
			}
		}
	}
}
