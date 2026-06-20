from __future__ import annotations

import logging
import logging.handlers
import socket
from typing import Optional

from pythonjsonlogger.json import JsonFormatter


def setup_logging(service_name: str, logstash_host: Optional[str] = None) -> None:
    formatter = JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level"},
        static_fields={"service": service_name},
    )

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    for handler in root.handlers[:]:
        root.removeHandler(handler)

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    root.addHandler(console)

    if logstash_host:
        try:
            host, _, port = logstash_host.partition(":")
            tcp_handler = logging.handlers.SocketHandler(
                host, int(port or 5044),
            )
            tcp_handler.setFormatter(formatter)
            tcp_handler.makeSocket = lambda: _make_tcp_socket(host, int(port or 5044))
            root.addHandler(tcp_handler)
        except Exception:
            logging.getLogger(__name__).warning(
                "Could not connect to Logstash at %s, logs will only go to stdout",
                logstash_host,
            )


def _make_tcp_socket(host: str, port: int) -> socket.socket:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5.0)
    sock.connect((host, port))
    return sock
