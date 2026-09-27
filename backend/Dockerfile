FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Add this line to import database on startup
RUN echo "Database import will run on startup"

EXPOSE 8000

CMD ["sh", "-c", "python import_db.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT"]