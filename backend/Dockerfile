FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including ping and iputils)
RUN apt-get update && apt-get install -y \
    gcc \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x docker-entrypoint.py

# Create database directory
RUN mkdir -p /app/instance

# Expose port
EXPOSE 5000

# Run entrypoint script (handles migrations + app startup)
CMD ["python", "docker-entrypoint.py"]
