# How to Run the Project (Smart Study Portal)

> **Quick Reference:** For the complete, authoritative step-by-step production run guide including architecture flowcharts, automated health checks, test suite commands, and troubleshooting, see **[docs/HOW_TO_RUN_STEP_BY_STEP.md](./docs/HOW_TO_RUN_STEP_BY_STEP.md)** or **[RUN_GUIDE.md](./RUN_GUIDE.md)**.

---

## 1. Prerequisites Checklist

- **Windows 10/11** (PowerShell) / Linux / macOS
- **Node.js 20.9+** (Node.js 22 or 26 recommended)
- **Python 3.11+**
- **Java 21 & Maven 3.9+** (`mvn.cmd` on Windows)
- **MySQL 8.0** (Port `3307` for local datadir `mysql-fresh-data`, or Port `3306` for default service)
- **Ollama** running locally on port `11434` with `smartstudy-tutor` and `nomic-embed-text` models

### Ollama Model Setup:
```powershell
ollama pull nomic-embed-text
ollama pull qwen2.5-coder:1.5b
ollama create smartstudy-tutor -f ml/Modelfile.tutor
```

---

## 2. First-Time Setup (One-Time)

From the project root (`D:\Smart Edu`):

```powershell
# 1. Configure environment file
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# 2. Setup Python Virtual Environment and Install ML Dependencies
Set-Location 'D:\Smart Edu\ml'
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Install Frontend Dependencies
Set-Location 'D:\Smart Edu\frontend'
npm install
```

---

## 3. Quick Start (Automated One-Click Script)

From the repository root in PowerShell:

```powershell
Set-Location 'D:\Smart Edu'
.\run-all.ps1
```

The script checks port availability and automatically launches:
- **MySQL 8.0** on port `3307` (`mysql-fresh-data`)
- **FastAPI ML Engine** on port `8000`
- **Spring Boot API** on port `8080`
- **Next.js Frontend** on port `3000`

---

## 4. Manual Step-by-Step Startup (Dedicated Terminals)

If you prefer running each service in its own terminal window to view logs:

### Terminal 1 — Ollama Server
```powershell
ollama serve
```

### Terminal 2 — MySQL Server (Port 3307)
```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe' `
  '--datadir=D:\Smart Edu\mysql-fresh-data' `
  --port=3307 --mysqlx=0 --bind-address=127.0.0.1 --shared-memory=OFF --named-pipe=OFF --console
```

### Terminal 3 — FastAPI ML Service (Port 8000)
```powershell
Set-Location 'D:\Smart Edu\ml'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 4 — Spring Boot Backend API (Port 8080)
```powershell
Set-Location 'D:\Smart Edu\backend'
mvn.cmd spring-boot:run "-Dspring-boot.run.arguments=--spring.datasource.password=dev-password-change-me --spring.datasource.url=jdbc:mysql://localhost:3307/smart_study?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC --app.dev-seed-enabled=true"
```

### Terminal 5 — Next.js Web Frontend (Port 3000)
```powershell
Set-Location 'D:\Smart Edu\frontend'
npm run dev
```

---

## 5. Pre-Configured Demo Login Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student** | `student@test.com` | `Password123!` |
| **Parent** | `parent@test.com` | `Password123!` |
| **Admin** | `admin@test.com` | `Password123!` |

*(Or click the "One-Click Demo Accounts" button on `http://localhost:3000/login`)*

---

## 6. Service Health Check URLs

- **Web Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8080/api/v1`
- **ML Health:** `http://localhost:8000/health`
- **Ollama Models:** `http://127.0.0.1:11434/api/tags`

---

## 7. Running the Integration Test Suite

To verify all 19 system integration tests (Tavily search, Ollama RAG summarization, Quiz generation):
```powershell
Set-Location 'D:\Smart Edu'
.\ml\.venv\Scripts\python.exe scratch/test_complete_integration_suite.py
```
