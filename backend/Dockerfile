FROM python:3.11-slim

WORKDIR /app

# Systemabhängigkeiten für OpenCV und libglib2.0 hinzufügen
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--ssl-keyfile", "/etc/ssl/certs/key.pem", \
     "--ssl-certfile", "/etc/ssl/certs/cert.pem", \
     "--reload", "--log-level", "debug"]

# Hinweis: Den Parameter --reload bitte in der Produktion entfernen, er ist nur für Entwicklung gedacht.
