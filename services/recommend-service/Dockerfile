FROM python:3.11-slim AS builder
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc build-essential libffi-dev \
    && rm -rf /var/lib/apt/lists/*

ENV POETRY_HOME=/opt/poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH=$POETRY_HOME/bin:$PATH

RUN poetry config virtualenvs.in-project true


COPY libs/ /app/libs/
COPY services/recommend-service/ /app/services/recommend-service/

WORKDIR /app/services/recommend-service
RUN poetry install --no-interaction --no-ansi --no-root --only main


FROM python:3.11-slim
WORKDIR /app/services/recommend-service

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --from=builder /app/services/recommend-service/.venv /app/services/recommend-service/.venv
COPY --from=builder /app/libs /app/libs
COPY --from=builder /app/services/recommend-service /app/services/recommend-service

ENV PATH="/app/services/recommend-service/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "recommend_service.app:app", "--host", "0.0.0.0", "--port", "8000"]