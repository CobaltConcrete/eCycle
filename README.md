# eCycle Project

This project is a web-based platform designed for locating e-waste repair and disposal locations.

## Setup Instructions:

### 1. Restore PostgreSQL Database
To set up the database, follow these steps:

1.1. Install PostgreSQL: https://www.postgresql.org/

1.2. Navigate to /ecycle:

```bash
cd ecycle
```

1.3. Restore the PostgreSQL database using the provided backup file:

```bash
psql -U {database_username} -d {data_basename} -f ecycleDB.sql
```

### 2. Configure Environment Variables
You need to create a .env file with the following variables in the root directory of the project /ecycle

.env file format:
```bash
REACT_APP_DATABASE_URL=postgresql://{database_username}:{database_password}@localhost/{data_basename}
REACT_APP_DATABASE_PASSWORD={your_database_password}
REACT_APP_GOOGLE_MAPS_API_KEY={your_google_maps_api_key}
```

Example .env:
```bash
REACT_APP_DATABASE_URL=postgresql://postgres:password@localhost/ecycle
REACT_APP_DATABASE_PASSWORD=password
REACT_APP_GOOGLE_MAPS_API_KEY=ABC123abcDEF456defGHI789ghiJKL012jklMNO
```
Replace the placeholders with your actual credentials and API key.

### 3. Install Requirements
```bash
pip install -r requirements.txt
```

### 4. Start the Backend
To start the backend server:

4.1. Open your terminal and navigate to the backend directory:

```bash
cd ecycle/backend
python app.py
```

4.2. Open a new terminal window and navigate to the root directory:
```bash
cd ecycle
npm install
npm start
```

