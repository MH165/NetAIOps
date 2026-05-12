from ncclient import manager
import xmltodict
import json
import os
from dotenv import load_dotenv

load_dotenv()

DEVICE = {
    "host": os.getenv("DEVNET_CSR_HOST"),
    "port": int(os.getenv("DEVNET_CSR_PORT", 830)),
    "username": os.getenv("DEVNET_CSR_USER"),
    "password": os.getenv("DEVNET_CSR_PASS"),
    "hostkey_verify": False,
    "device_params": {"name": "iosxe"}
}

def get_connection():
    return manager.connect(**DEVICE)

def get_interfaces():
    try:
        with get_connection() as conn:
            result = conn.get_config(
                source="running",
                filter=("subtree",
                    "<interfaces xmlns='urn:ietf:params:xml:ns:yang:ietf-interfaces'/>")
            )
            data = xmltodict.parse(result.xml)
            interfaces = data.get("rpc-reply", {}).get("data", {}).get("interfaces", {}).get("interface", [])
            if isinstance(interfaces, dict):
                interfaces = [interfaces]
            return interfaces
    except Exception as e:
        return {"error": str(e)}

def push_interface_enable(interface_name, enabled):
    config = f"""
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>{interface_name}</name>
          <enabled>{'true' if enabled else 'false'}</enabled>
        </interface>
      </interfaces>
    </config>
    """
    try:
        with get_connection() as conn:
            result = conn.edit_config(target="running", config=config)
            return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"error": str(e)}

def push_interface_description(interface_name, description):
    config = f"""
    <config>
      <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
        <interface>
          <name>{interface_name}</name>
          <description>{description}</description>
        </interface>
      </interfaces>
    </config>
    """
    try:
        with get_connection() as conn:
            result = conn.edit_config(target="running", config=config)
            return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"error": str(e)}

def push_routed_port_with_ip(interface_name, ip, mask):
    """
    Convert a switchport to routed port and assign IP.
    Catalyst 9K physical ports are L2 by default.
    Must use Cisco native YANG to set 'no switchport' + IP.
    """
    # Extract interface type and number e.g. GigabitEthernet1/0/8
    config = f"""
    <config>
      <native xmlns="http://cisco.com/ns/yang/Cisco-IOS-XE-native">
        <interface>
          <GigabitEthernet>
            <name>{interface_name.replace("GigabitEthernet","")}</name>
            <switchport-conf>
              <switchport xmlns="http://cisco.com/ns/yang/Cisco-IOS-XE-switch"
                xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0"
                nc:operation="delete"/>
            </switchport-conf>
            <ip>
              <address>
                <primary>
                  <address>{ip}</address>
                  <mask>{mask}</mask>
                </primary>
              </address>
            </ip>
          </GigabitEthernet>
        </interface>
      </native>
    </config>
    """
    try:
        with get_connection() as conn:
            result = conn.edit_config(target="running", config=config)
            return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"error": str(e)}

def push_interface_ip(interface_name, ip, mask):
    """Route traffic: use native YANG for physical ports, IETF for loopbacks"""
    if interface_name.startswith("GigabitEthernet") or \
       interface_name.startswith("TenGigabitEthernet") or \
       interface_name.startswith("FastEthernet"):
        return push_routed_port_with_ip(interface_name, ip, mask)
    else:
        # Loopback and other virtual interfaces use IETF model
        config = f"""
        <config>
          <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
            <interface>
              <name>{interface_name}</name>
              <ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
                <address>
                  <ip>{ip}</ip>
                  <netmask>{mask}</netmask>
                </address>
              </ipv4>
            </interface>
          </interfaces>
        </config>
        """
        try:
            with get_connection() as conn:
                result = conn.edit_config(target="running", config=config)
                return {"status": "success", "result": str(result)}
        except Exception as e:
            return {"error": str(e)}

def create_vlan_interface(vlan_id, ip, mask):
    """Create VLAN SVI with IP using Cisco native YANG"""
    config = f"""
    <config>
      <native xmlns="http://cisco.com/ns/yang/Cisco-IOS-XE-native">
        <interface>
          <Vlan>
            <name>{vlan_id}</name>
            <ip>
              <address>
                <primary>
                  <address>{ip}</address>
                  <mask>{mask}</mask>
                </primary>
              </address>
            </ip>
          </Vlan>
        </interface>
      </native>
    </config>
    """
    try:
        with get_connection() as conn:
            result = conn.edit_config(target="running", config=config)
            return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"error": str(e)}

def push_interface_config(interface_name, enabled=None, description=None, ip=None, mask=None):
    """Backward compat wrapper"""
    results = []
    if enabled is not None:
        results.append(push_interface_enable(interface_name, enabled))
    if description:
        results.append(push_interface_description(interface_name, description))
    if ip and mask:
        results.append(push_interface_ip(interface_name, ip, mask))
    if not results:
        return {"status": "nothing to do"}
    errors = [r for r in results if "error" in r]
    return {"status": "failed" if errors else "success", "results": results}

def push_raw_xml(xml_config):
    try:
        with get_connection() as conn:
            result = conn.edit_config(target="running", config=xml_config)
            return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"error": str(e)}

def get_device_info():
    try:
        with get_connection() as conn:
            result = conn.get(
                filter=("subtree",
                    "<device-hardware-data xmlns='http://cisco.com/ns/yang/Cisco-IOS-XE-device-hardware-oper'/>")
            )
            return xmltodict.parse(result.xml)
    except Exception as e:
        return {"error": str(e)}
