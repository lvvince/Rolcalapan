@echo off
start "Chatbot" /min cmd /k "cd /d C:\laragon\www\rolcalapan\chatbot_py && venv\Scripts\python.exe app.py"
start "Prayer" /min cmd /k "cd /d C:\laragon\www\rolcalapan\prayer_py && venv\Scripts\python.exe -m uvicorn main:app --port 8001"
start "Frontend" /min cmd /k "cd /d C:\laragon\www\rolcalapan\frontend && npm run dev"
