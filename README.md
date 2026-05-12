# 🌐 NetAIOps: AI-Powered Network Automation & Observability

NetAIOps is a cutting-edge **Network AIOps Platform** designed to bridge the gap between traditional network management and AI-driven automation. It leverages Large Language Models (LLMs) to provide intelligent analysis, automated troubleshooting, and configuration of **Cisco IOS XE** devices via the **NETCONF** protocol.

## 🚀 Key Features

*   **🤖 AI Network Agent:** An expert assistant (Cisco IOS XE specialist) that analyzes live network states and generates precise configuration payloads.
*   **⚙️ NETCONF Automation:** Direct programmatic control over interfaces, VLANs, and IP addressing using YANG data models.
*   **📡 Real-time Observability:** A modern React dashboard providing live telemetry via WebSockets and an automated alerting engine.
*   **🛠️ Hybrid Workflow:** Supports both "Chat-to-Configure" (Natural Language) and structured API-driven network management.
*   **⚠️ Alerting Engine:** Proactive monitoring with automated alert generation and acknowledgment workflows.

## 🛠️ Tech Stack

- **Backend:** Python 3.13, FastAPI, `ncclient` (NETCONF), `xmltodict`, OpenAI API.
- **Frontend:** React, Tailwind CSS (optional), WebSockets.
- **Automation:** APScheduler for background health checks and alerting.
- **Infrastructure:** Docker-ready for consistent deployment.

## 📂 Project Structure

```text
NETAIOps/
├── backend/            # FastAPI Server
│   ├── app/
│   │   ├── agent/      # AI Agent Logic (OpenAI)
│   │   ├── netconf/    # Cisco NETCONF Client
│   │   └── alerts/     # Monitoring & Alert Engine
├── frontend/           # React Dashboard
├── docker-compose.yml  # Container Orchestration
└── .env                # Environment Configuration
```

## 🚦 Getting Started

### Prerequisites

- Python 3.10+
- Node.js & npm
- Access to a Cisco IOS XE device (or [Cisco DevNet Sandbox](https://developer.cisco.com/site/sandbox/))
- OpenAI API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MH165/NetAIOps.git
   cd NetAIOps
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration:**
   Create a `.env` file in the root directory with your credentials:
   ```env
   OPENAI_API_KEY=your_key_here
   DEVNET_CSR_HOST=your_host
   DEVNET_CSR_USER=your_user
   DEVNET_CSR_PASS=your_pass
   ```

### Running the Application

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
