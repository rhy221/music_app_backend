from __future__ import annotations
from typing import Annotated, Optional

from fastapi import Header, HTTPException, Request, status

from .application.recommendation_service import RecommendationService


def get_rec_service(request: Request) -> RecommendationService:
    return request.app.state.container.rec_service


def require_user_id(
    request: Request,
    x_user_id: Annotated[Optional[str], Header()] = None,
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    # Mode 1: gateway injected X-User-Id via propagate_claims
    if x_user_id:
        return x_user_id

    # Mode 2: direct Bearer token (propagate_claims not working in KrakenD CE)
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        user_id = _decode_sub(token, request.app.state.jwt_secret)
        if user_id:
            return user_id

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing user identity")


def _decode_sub(token: str, secret: str) -> Optional[str]:
    try:
        import base64, hmac, hashlib, json, time

        parts = token.split(".")
        if len(parts) != 3:
            return None

        # Verify signature
        msg = f"{parts[0]}.{parts[1]}".encode()
        expected = base64.urlsafe_b64encode(
            hmac.new(secret.encode(), msg, hashlib.sha256).digest()
        ).rstrip(b"=").decode()
        if expected != parts[2]:
            return None

        # Decode payload
        padding = 4 - len(parts[1]) % 4
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * padding))

        # Check expiry
        if payload.get("exp", 0) < time.time():
            return None

        return payload.get("sub")
    except Exception:
        return None
