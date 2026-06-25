FROM python:3.12-slim AS build

RUN pip install --no-cache-dir poetry

COPY libs/events/python/music-events/ /libs/events/python/music-events/

WORKDIR /app
COPY services/recommend-service/pyproject.toml services/recommend-service/poetry.lock ./

RUN --mount=type=cache,id=pip,target=/root/.cache/pip \
    poetry config virtualenvs.in-project true && \
    poetry install --only main --no-root --no-interaction

COPY services/recommend-service/recommend_service/ recommend_service/

RUN poetry install --only main --no-root --no-interaction

FROM python:3.12-slim

WORKDIR /app

COPY --from=build /app/.venv .venv/
COPY --from=build /app/recommend_service/ recommend_service/
COPY --from=build /libs/events/python/music-events/music_events/ music_events/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

EXPOSE 8000

CMD ["opentelemetry-instrument", "uvicorn", "recommend_service.app:app", "--host", "0.0.0.0", "--port", "8000"]
