FROM python:3.12-slim AS build

RUN pip install --no-cache-dir poetry

WORKDIR /workspace

COPY libs/events/python/music-events/ libs/events/python/music-events/

COPY services/recommend-service/pyproject.toml services/recommend-service/poetry.lock services/recommend-service/
WORKDIR /workspace/services/recommend-service

RUN --mount=type=cache,id=pip,target=/root/.cache/pip \
    poetry config virtualenvs.in-project true && \
    poetry install --only main --no-root --no-interaction

COPY services/recommend-service/recommend_service/ recommend_service/

RUN poetry install --only main --no-root --no-interaction

FROM python:3.12-slim

WORKDIR /app

COPY --from=build /workspace/services/recommend-service/.venv .venv/
COPY --from=build /workspace/services/recommend-service/recommend_service/ recommend_service/
COPY --from=build /workspace/libs/events/python/music-events/music_events/ music_events/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "recommend_service.app:app", "--host", "0.0.0.0", "--port", "8000"]
