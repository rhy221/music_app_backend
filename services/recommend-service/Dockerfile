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

RUN poetry config virtualenvs.create false

COPY services/recommend-service/pyproject.toml services/recommend-service/poetry.lock ./

RUN poetry install --no-interaction --no-ansi --no-root --only main

FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

EXPOSE 8000

# Lệnh khởi chạy Uvicorn server chuẩn chỉ
CMD ["uvicorn", "recommend_service.app:app", "--host", "0.0.0.0", "--port", "8000"]