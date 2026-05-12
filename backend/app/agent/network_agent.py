from openai import OpenAI
import os
import json
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are an expert Cisco network engineer AI assistant.
You can analyze network state AND push configuration to real Cisco IOS XE devices via NETCONF.

IMPORTANT DEVICE CONTEXT:
- This is a Cisco Catalyst 9K (SWITCH), not a router
- Physical ports (GigabitEthernet) are L2 switchports by default
- To assign IP to a physical port you must convert it to a routed port (no switchport)
- VLANs use SVI interfaces (Vlan10, Vlan20 etc) for L3 routing
- Best practice: assign IPs to VLAN SVIs, not physical ports

ALWAYS respond in this exact JSON format:
{
  "summary": "brief description",
  "issues": ["list of detected issues"],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendations": ["list of recommendations"],
  "cli_commands": ["exact IOS XE CLI commands"],
  "explanation": "plain English explanation",
  "actions": [
    {
      "type": "enable_interface|disable_interface|set_ip|set_description|create_vlan",
      "interface": "full interface name e.g. GigabitEthernet1/0/1 or Vlan30",
      "enabled": true,
      "ip": "192.168.1.1",
      "mask": "255.255.255.0",
      "description": "description text",
      "vlan_id": "30"
    }
  ]
}

ACTION RULES — follow strictly:
- enable_interface: just enable/disable, no IP
- disable_interface: just disable
- set_ip: assign IP to EXISTING interface (GigabitEthernet or Loopback)
- set_description: set description only
- create_vlan: create a NEW Vlan SVI with IP — use this when user says 'create vlan X' or 'vlan X with ip'
  → set interface to "VlanX" and vlan_id to "X"
- NEVER use raw_xml — always use one of the above types
- For physical port IP: use set_ip, the backend handles no-switchport automatically
- Only include actions when user explicitly requests a change
- For analysis only, return empty actions array []

Examples:
- "enable Gi1/0/2" → type: enable_interface, interface: GigabitEthernet1/0/2
- "create vlan 40 with ip 192.168.40.1/24" → type: create_vlan, interface: Vlan40, vlan_id: 40, ip: 192.168.40.1, mask: 255.255.255.0
- "set ip 10.0.0.1/24 on Gi1/0/8" → type: set_ip, interface: GigabitEthernet1/0/8, ip: 10.0.0.1, mask: 255.255.255.0
- "add description UPLINK to Gi1/0/7" → type: set_description, interface: GigabitEthernet1/0/7, description: UPLINK
"""

def analyze_network(topology_data):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this network state:\n{topology_data}"}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def chat_with_agent(message, network_context=None):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if network_context:
        messages.append({
            "role": "user",
            "content": f"Current network state:\n{network_context}"
        })
        messages.append({
            "role": "assistant",
            "content": json.dumps({
                "summary": "Network context loaded",
                "issues": [], "severity": "LOW",
                "recommendations": [], "cli_commands": [],
                "explanation": "Network state loaded. Ready to help.",
                "actions": []
            })
        })
    messages.append({"role": "user", "content": message})
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
