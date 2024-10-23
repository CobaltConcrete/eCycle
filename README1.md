# SC2006_Project

Setup:
Restore Posgresql database with: ecycle\backend\SQL-scripts\ecycleDBbackup
cd ecycle
create file .env

.env:
REACT_APP_DATABASE_URL=postgresql://{database_username}:{database_password}@localhost/{data_basename}
REACT_APP_DATABASE_PASSWORD={your_database_password}
REACT_APP_GOOGLE_MAPS_API_KEY={your_google_maps_api_key}

example:
REACT_APP_DATABASE_URL=postgresql://postgres:password@localhost/ecycle
REACT_APP_DATABASE_PASSWORD=password
REACT_APP_GOOGLE_MAPS_API_KEY=ABC123abcDEF456defGHI789ghiJKL012jklMNO

Start frontend:

cd ecycle/backend
python app.py

Start frontend:

cd ecycle
npm install
npm start