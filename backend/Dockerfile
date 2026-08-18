FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system labsync && adduser --system --ingroup labsync --no-create-home labsync

COPY requirements-prod.txt ./
RUN python -m pip install --no-cache-dir --requirement requirements-prod.txt \
    && rm -rf /usr/local/lib/python3.13/site-packages/pip \
        /usr/local/lib/python3.13/site-packages/pip-*.dist-info \
        /usr/local/bin/pip \
        /usr/local/bin/pip3 \
        /usr/local/bin/pip3.13

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

USER labsync

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)" || exit 1

CMD ["sh", "-c", "python -m alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
