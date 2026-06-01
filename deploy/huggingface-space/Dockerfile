FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY labops_api ./labops_api

EXPOSE 7860

CMD uvicorn labops_api.app:app --host 0.0.0.0 --port ${PORT:-7860}
