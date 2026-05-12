from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import json
from typing import List

from app.netconf.client import (
    get_interfaces,
    push_interface_enable, push_interface_description,
    push_interface_ip, create_vlan_interface,
    push_interface_config, push_raw_xml, get_device_info
)
from app.agent.network_agent import analyze_network, chat_with_agent
from app.alerts.engine import get_alerts, acknowledge_alert, create_alert

app = FastAPI(title="Network AI Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

def execute_actions(actions: list) -> list:
    results = []
    for action in actions:
        action_type = action.get("type")
        interface = action.get("interface", "")
        result = {"action": action_type, "interface": interface}

        try:
            # Detect VLAN creation separately
            is_vlan = interface.lower().startswith("vlan")
            vlan_id = interface.replace("Vlan", "").replace("vlan", "").strip() if is_vlan else None

            if action_type == "enable_interface":
                r = push_interface_enable(interface, True)
                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r
                create_alert(interface, "LOW", f"AI enabled interface {interface}")

            elif action_type == "disable_interface":
                r = push_interface_enable(interface, False)
                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r
                create_alert(interface, "MEDIUM", f"AI disabled interface {interface}")

            elif action_type == "set_ip":
                ip = action.get("ip")
                mask = action.get("mask", "255.255.255.0")

                # Convert CIDR prefix to mask if needed
                if mask and "/" in str(mask):
                    prefix = int(str(mask).replace("/", ""))
                    mask = ".".join([
                        str((0xffffffff << (32 - prefix) >> i) & 0xff)
                        for i in [24, 16, 8, 0]
                    ])

                if is_vlan and vlan_id:
                    r = create_vlan_interface(vlan_id, ip, mask)
                else:
                    r = push_interface_ip(interface, ip, mask)

                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r
                create_alert(interface, "LOW", f"AI set IP {ip} on {interface}")

            elif action_type == "set_description":
                r = push_interface_description(interface, action.get("description", ""))
                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r

            elif action_type == "create_vlan":
                ip = action.get("ip")
                mask = action.get("mask", "255.255.255.0")
                vid = action.get("vlan_id") or vlan_id
                r = create_vlan_interface(vid, ip, mask)
                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r
                create_alert(f"Vlan{vid}", "LOW", f"AI created VLAN {vid} with IP {ip}")

            elif action_type == "raw_xml":
                r = push_raw_xml(action.get("xml"))
                result["status"] = "success" if "error" not in r else "failed"
                result["detail"] = r

            else:
                result["status"] = "skipped"
                result["detail"] = f"Unknown action: {action_type}"

        except Exception as e:
            result["status"] = "failed"
            result["detail"] = str(e)

        results.append(result)
    return results

# ─── ENDPOINTS ────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/interfaces")
def interfaces():
    return {"interfaces": get_interfaces()}

@app.get("/api/device")
def device():
    return get_device_info()

@app.post("/api/interfaces/{interface}/toggle")
def toggle_interface(interface: str, body: dict):
    result = push_interface_enable(interface, body.get("enabled", True))
    create_alert(interface, "LOW",
        f"Interface {interface} {'enabled' if body.get('enabled') else 'disabled'} manually")
    return result

@app.get("/api/alerts")
def alerts():
    return {"alerts": get_alerts()}

@app.post("/api/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: int):
    return acknowledge_alert(alert_id)

@app.post("/api/agent/analyze")
def analyze():
    interfaces = get_interfaces()
    analysis = analyze_network(str(interfaces))
    if analysis.get("severity") in ["HIGH", "CRITICAL"]:
        create_alert("SYSTEM", analysis["severity"], analysis["summary"], analysis)
    return analysis

@app.post("/api/agent/chat")
def chat(body: dict):
    interfaces = get_interfaces()
    network_ctx = f"Device interfaces: {json.dumps(interfaces)}"
    response = chat_with_agent(body["message"], network_ctx)
    actions = response.get("actions", [])
    if actions:
        execution_results = execute_actions(actions)
        response["execution_results"] = execution_results
        response["actions_taken"] = len(execution_results)
    return response

# ─── WEBSOCKET ────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            interfaces = get_interfaces()
            alerts = get_alerts(10)
            await websocket.send_json({
                "type": "network_update",
                "interfaces": interfaces,
                "alerts": alerts
            })
            await asyncio.sleep(15)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", seconds=60)
async def auto_health_check():
    interfaces = get_interfaces()
    if isinstance(interfaces, dict) and "error" in interfaces:
        alert = create_alert("C9K-DevNet", "CRITICAL",
            f"Device unreachable: {interfaces['error']}")
        await manager.broadcast({"type": "new_alerts", "alerts": [alert]})

@app.on_event("startup")
async def startup():
    scheduler.start()
    print("✅ Network AI Platform started")
    print("📡 Direct NETCONF to C9K")
    print("🤖 AI Agent with config push ready")
