FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium browser + OS deps (already included in base image, but ensure up to date)
RUN playwright install chromium --with-deps

COPY . .

# Ensure bot_profiles directory exists inside the container
RUN mkdir -p /app/bot_profiles

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["python", "main.py"]
