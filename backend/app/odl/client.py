import requests
import os
from dotenv import load_dotenv

load_dotenv()

ODL_BASE = f"http://{os.getenv('ODL_HOST')}:{os.getenv('ODL_PORT')}/restconf"
AUTH = (os.getenv('ODL_USER'), os.getenv('ODL_PASS'))
HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}

def get_topology():
    try:
        r = requests.get(
            f"{ODL_BASE}/operational/network-topology:network-topology/",
            auth=AUTH, headers=HEADERS, timeout=5
        )
        return r.json() if r.status_code == 200 else {"error": r.text}
    except Exception as e:
        return {"error": str(e)}

def get_nodes():
    topology = get_topology()
    try:
        topologies = topology["network-topology"]["topology"]
        nodes = []
        for t in topologies:
            for node in t.get("node", []):
                nodes.append({
                    "id": node["node-id"],
                    "status": node.get("netconf-node-topology:connection-status", "unknown"),
                    "host": node.get("netconf-node-topology:host", ""),
                    "port": node.get("netconf-node-topology:port", "")
                })
        return nodes
    except Exception as e:
        return []

def get_interfaces(node_id):
    try:
        r = requests.get(
            f"{ODL_BASE}/operational/network-topology:network-topology/"
            f"topology/topology-netconf/node/{node_id}/"
            "yang-ext:mount/ietf-interfaces:interfaces-state/",
            auth=AUTH, headers=HEADERS, timeout=5
        )
        return r.json() if r.status_code == 200 else {"error": r.text}
    except Exception as e:
        return {"error": str(e)}

def push_interface_config(node_id, interface_name, enabled=True):
    payload = {
        "interface": [{
            "name": interface_name,
            "enabled": enabled
        }]
    }
    try:
        r = requests.patch(
            f"{ODL_BASE}/config/network-topology:network-topology/"
            f"topology/topology-netconf/node/{node_id}/"
            f"yang-ext:mount/ietf-interfaces:interfaces/interface/{interface_name}",
            auth=AUTH, headers=HEADERS, json=payload, timeout=5
        )
        return {"status": r.status_code, "response": r.text}
    except Exception as e:
        return {"error": str(e)}

def register_device(name, host, port, username, password):
    payload = {
        "node": [{
            "node-id": name,
            "netconf-node-topology:host": host,
            "netconf-node-topology:port": port,
            "netconf-node-topology:username": username,
            "netconf-node-topology:password": password,
            "netconf-node-topology:tcp-only": False,
            "netconf-node-topology:keepalive-delay": 120
        }]
    }
    try:
        r = requests.put(
            f"{ODL_BASE}/config/network-topology:network-topology/"
            f"topology/topology-netconf/node/{name}",
            auth=AUTH, headers=HEADERS, json=payload, timeout=5
        )
        return {"status": r.status_code}
    except Exception as e:
        return {"error": str(e)}

