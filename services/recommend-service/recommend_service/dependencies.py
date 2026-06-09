from __future__ import annotations
from typing import Annotated

from fastapi import Header, Request

from .application.recommendation_service import RecommendationService


def get_rec_service(request: Request) -> RecommendationService:
    return request.app.state.container.rec_service


def require_user_id(x_user_id: Annotated[str, Header()]) -> str:
    return x_user_id
