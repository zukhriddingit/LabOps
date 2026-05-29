FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer-cached until requirements.txt changes)
COPY labops_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend package (overridden by the volume mount in docker-compose,
# but needed for standalone `docker run` usage)
COPY labops_api/ ./labops_api/

EXPOSE 8000

CMD ["uvicorn", "labops_api.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
