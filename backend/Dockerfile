# Use official Python slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend code
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port your app runs on (e.g., 8000)
EXPOSE 8000

# Run the app
CMD ["python", "app.py"]
