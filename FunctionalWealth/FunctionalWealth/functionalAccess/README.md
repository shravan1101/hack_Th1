# FunctionalAccess

FunctionalAccess is a real-time sign language translation and communication web application. It features a React frontend and a FastAPI (Python) backend using WebSockets.

## Requirements
- Python 3.9+
- Node.js & npm

## How to Run the App

### 1. Backend (FastAPI)
The backend requires a Python virtual environment and the associated dependencies.
From the project root directory (`functionalAccess`):

1. **Activate the virtual environment**:
   ```powershell
   # On Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   ```

2. **Navigate to the API folder**:
   ```powershell
   cd functional-access-api
   ```

3. **Install dependencies** (if not already installed):
   ```powershell
   pip install -r requirements.txt
   ```

4. **Start the backend server**:
   ```powershell
   uvicorn main:app --reload
   ```
   The API will run at `http://localhost:8000`.

### 2. Frontend (React + Vite)
The frontend requires Node.js and its dependencies to be installed.
Open a **new terminal window/tab**, and from the project root directory:

1. **Navigate to the web folder**:
   ```powershell
   cd functional-access-web
   ```

2. **Install dependencies** (if not already installed):
   ```powershell
   npm install
   ```

3. **Start the development server**:
   ```powershell
   npm run dev
   ```
   The frontend will run at `http://localhost:5173` (or the port specified by Vite).

## Features
- **Real-time Video & Audio Chat**: Fully functional room-based communication.
- **Sign Language Translation**: Live translation of sign language gestures via the backend AI engine.
- **Multilingual Captions**: Built-in support to instantly translate live conversations utilizing Google Translate.
