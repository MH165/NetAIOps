from datetime import datetime
import json

alerts = []  # In-memory store (replace with Redis/DB in production)

def create_alert(node_id, severity, message, ai_analysis=None):
    alert = {
        "id": len(alerts) + 1,
        "timestamp": datetime.now().isoformat(),
        "node_id": node_id,
        "severity": severity,
        "message": message,
        "ai_analysis": ai_analysis,
        "acknowledged": False
    }
    alerts.append(alert)
    print(f"🚨 ALERT [{severity}] {node_id}: {message}")
    return alert

def get_alerts(limit=50):
    return sorted(alerts, key=lambda x: x["timestamp"], reverse=True)[:limit]

def acknowledge_alert(alert_id):
    for alert in alerts:
        if alert["id"] == alert_id:
            alert["acknowledged"] = True
            return alert
    return None

def check_node_health(nodes):
    new_alerts = []
    for node in nodes:
        if node["status"] == "unable-to-connect":
            alert = create_alert(
                node["id"], "HIGH",
                f"Node {node['id']} is unreachable",
            )
            new_alerts.append(alert)
        elif node["status"] == "connecting":
            alert = create_alert(
                node["id"], "MEDIUM",
                f"Node {node['id']} is in connecting state",
            )
            new_alerts.append(alert)
    return new_alerts
