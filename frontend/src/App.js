import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:8000/api";
const WS = "ws://localhost:8000/ws";

const severityColor = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#dc2626",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #060910;
    color: #cbd5e1;
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .fade-in { animation: fade-in 0.3s ease forwards; }
  .slide-in { animation: slide-in 0.25s ease forwards; }

  .grid-bg {
    background-image:
      linear-gradient(rgba(30,41,59,0.4) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,41,59,0.4) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  input:focus { outline: none; }
  button:hover { filter: brightness(1.15); }
  button:active { transform: scale(0.97); }
  button { transition: all 0.15s ease; }
`;

function StatusBadge({ status }) {
  const up = status === "true" || status === true;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: up ? "#052e1644" : "#2d070744",
      color: up ? "#4ade80" : "#f87171",
      border: `1px solid ${up ? "#16a34a44" : "#b91c1c44"}`,
      padding: "3px 10px", borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: up ? "#4ade80" : "#f87171",
        animation: up ? "pulse-dot 2s infinite" : "none",
        display: "inline-block"
      }} />
      {up ? "ONLINE" : "OFFLINE"}
    </span>
  );
}

function Card({ children, style, className }) {
  return (
    <div className={className} style={{
      background: "#0d1117",
      border: "1px solid #1e293b",
      borderRadius: 8,
      padding: 20,
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 3,
      color: "#475569", marginBottom: 14,
      fontFamily: "'JetBrains Mono', monospace",
      display: "flex", alignItems: "center", gap: 8
    }}>
      <span style={{ width: 16, height: 1, background: "#1e293b", display: "inline-block" }} />
      {children}
      <span style={{ flex: 1, height: 1, background: "#1e293b", display: "inline-block" }} />
    </div>
  );
}

function StatsBar({ interfaces }) {
  const total = interfaces.length;
  const up = interfaces.filter(i => i.enabled === "true").length;
  const down = total - up;
  const withIP = interfaces.filter(i => i.ipv4?.address?.ip).length;

  const stats = [
    { label: "TOTAL", value: total, color: "#60a5fa", icon: "⬡" },
    { label: "ONLINE", value: up, color: "#4ade80", icon: "▲" },
    { label: "OFFLINE", value: down, color: "#f87171", icon: "▼" },
    { label: "ROUTED", value: withIP, color: "#c084fc", icon: "◈" },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20
    }}>
      {stats.map((s, i) => (
        <Card key={i} className="fade-in" style={{
          textAlign: "center", padding: "18px 12px",
          animationDelay: `${i * 0.05}s`,
          borderColor: s.color + "22",
        }}>
          <div style={{
            fontSize: 11, color: s.color, opacity: 0.6,
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 6
          }}>
            {s.icon} {s.label}
          </div>
          <div style={{
            fontSize: 36, fontWeight: 800, color: s.color,
            lineHeight: 1, fontFamily: "'Syne', sans-serif"
          }}>
            {s.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

function InterfaceTable({ interfaces, onToggle }) {
  const [filter, setFilter] = useState("all");

  const filtered = interfaces.filter(i => {
    if (filter === "up") return i.enabled === "true";
    if (filter === "down") return i.enabled !== "true";
    return true;
  });

  return (
    <Card>
      <SectionLabel>INTERFACES</SectionLabel>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["all", "up", "down"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "#1e293b" : "transparent",
            color: filter === f ? "#f1f5f9" : "#475569",
            border: `1px solid ${filter === f ? "#334155" : "#1e293b"}`,
            padding: "4px 14px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {f.toUpperCase()}
          </button>
        ))}
        <span style={{
          marginLeft: "auto", fontSize: 10, color: "#334155",
          fontFamily: "'JetBrains Mono', monospace",
          alignSelf: "center"
        }}>
          {filtered.length} / {interfaces.length}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{
              borderBottom: "1px solid #1e293b",
              color: "#334155",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: 2
            }}>
              {["INTERFACE", "STATUS", "IP ADDRESS", "TYPE", "ACTION"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((iface, i) => (
              <tr key={i} className="slide-in" style={{
                borderBottom: "1px solid #0f172a",
                animationDelay: `${i * 0.03}s`,
                transition: "background 0.15s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#0f172a"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{
                  padding: "11px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#60a5fa", fontSize: 12
                }}>
                  {iface.name}
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <StatusBadge status={iface.enabled} />
                </td>
                <td style={{
                  padding: "11px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: iface.ipv4?.address?.ip ? "#c084fc" : "#334155",
                  fontSize: 12
                }}>
                  {iface.ipv4?.address?.ip || "—"}
                </td>
                <td style={{
                  padding: "11px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#475569", fontSize: 10
                }}>
                  {iface.name.startsWith("Vlan") ? "L3-VLAN" :
                    iface.name.startsWith("Loopback") ? "LOOPBACK" : "ETHERNET"}
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <button
                    onClick={() => onToggle(iface.name, iface.enabled !== "true")}
                    style={{
                      background: "transparent",
                      color: iface.enabled === "true" ? "#f87171" : "#4ade80",
                      border: `1px solid ${iface.enabled === "true" ? "#f8717144" : "#4ade8044"}`,
                      padding: "4px 12px", borderRadius: 4,
                      cursor: "pointer", fontSize: 9,
                      fontWeight: 700, letterSpacing: 1.5,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                    {iface.enabled === "true" ? "DISABLE" : "ENABLE"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AlertPanel({ alerts, onAck }) {
  const unacked = alerts.filter(a => !a.acknowledged);

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <SectionLabel>
        ALERTS {unacked.length > 0 && (
          <span style={{
            background: "#ef444422", color: "#ef4444",
            border: "1px solid #ef444444",
            borderRadius: 3, padding: "1px 6px",
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace"
          }}>
            {unacked.length} NEW
          </span>
        )}
      </SectionLabel>

      <div style={{ flex: 1, overflowY: "auto", maxHeight: 340 }}>
        {alerts.length === 0 && (
          <div style={{
            textAlign: "center", padding: "32px 0",
            color: "#1e293b", fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            ◉ NO ACTIVE ALERTS
          </div>
        )}
        {alerts.map((alert, i) => {
          const color = severityColor[alert.severity] || "#94a3b8";
          return (
            <div key={i} className="fade-in" style={{
              borderLeft: `2px solid ${color}`,
              background: color + "08",
              borderRadius: "0 6px 6px 0",
              padding: "10px 12px",
              marginBottom: 8,
              animationDelay: `${i * 0.04}s`,
              opacity: alert.acknowledged ? 0.4 : 1,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 4
              }}>
                <span style={{
                  color, fontWeight: 700, fontSize: 9,
                  letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {alert.severity} · {alert.node_id}
                </span>
                <span style={{
                  color: "#334155", fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>
                {alert.message}
              </p>
              {!alert.acknowledged && (
                <button onClick={() => onAck(alert.id)} style={{
                  background: "transparent", color: "#475569",
                  border: "1px solid #1e293b",
                  padding: "3px 10px", borderRadius: 3,
                  cursor: "pointer", fontSize: 9, marginTop: 8,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1
                }}>
                  ACK
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AIChat() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Network AI agent online. I can analyze your network AND push configuration changes to the device.\n\nTry:\n• 'analyze' — full health check\n• 'enable GigabitEthernet1/0/2' — enable an interface\n• 'set description WAN on GigabitEthernet1/0/7'\n• 'show me all down interfaces'\n• 'disable all unused interfaces'",
    execution_results: []
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      let data;
      if (userMsg.toLowerCase() === "analyze") {
        const res = await axios.post(`${API}/agent/analyze`);
        data = res.data;
      } else {
        const res = await axios.post(`${API}/agent/chat`, { message: userMsg });
        data = res.data;
      }

      const reply = data.explanation || data.summary || JSON.stringify(data, null, 2);
      const issues = data.issues?.length
        ? `\n\n⚠ ISSUES DETECTED:\n${data.issues.map(i => `  · ${i}`).join("\n")}`
        : "";
      const cmds = data.cli_commands?.length
        ? `\n\n» CLI EQUIVALENT:\n${data.cli_commands.map(c => `  ${c}`).join("\n")}`
        : "";

      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply + issues + cmds,
        severity: data.severity,
        execution_results: data.execution_results || [],
        actions_taken: data.actions_taken || 0
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠ Connection error: " + e.message,
        execution_results: []
      }]);
    }
    setLoading(false);
  };

  const quickActions = [
    "analyze",
    "show down interfaces",
    "enable GigabitEthernet1/0/2",
    "disable unused interfaces",
  ];

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <SectionLabel>AI NETWORK AGENT · GPT-4o</SectionLabel>

      {/* Quick action chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {quickActions.map((q, i) => (
          <button key={i} onClick={() => setInput(q)} style={{
            background: "#0f172a", color: "#475569",
            border: "1px solid #1e293b",
            padding: "4px 12px", borderRadius: 4,
            cursor: "pointer", fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", marginBottom: 14,
        maxHeight: 380, paddingRight: 4
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="fade-in" style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 12,
            animationDelay: `${i * 0.02}s`
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 24, height: 24, borderRadius: 4,
                background: "#0f172a", border: "1px solid #1e293b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, marginRight: 8, flexShrink: 0, marginTop: 2
              }}>
                ⬡
              </div>
            )}
            <div style={{ maxWidth: "82%" }}>
              <div style={{
                background: msg.role === "user" ? "#1e3a5f" : "#0f172a",
                border: msg.role === "user"
                  ? "1px solid #1d4ed844"
                  : `1px solid ${msg.severity ? severityColor[msg.severity] + "33" : "#1e293b"}`,
                padding: "10px 14px", borderRadius: 6,
                fontSize: 12, color: "#cbd5e1",
                whiteSpace: "pre-wrap", lineHeight: 1.6,
                fontFamily: msg.role === "user" ? "'Syne', sans-serif" : "'JetBrains Mono', monospace",
              }}>
                {msg.content}
              </div>

              {/* Execution results */}
              {msg.execution_results && msg.execution_results.length > 0 && (
                <div style={{
                  marginTop: 6,
                  background: "#030712",
                  border: "1px solid #1e293b",
                  borderRadius: 6, padding: "8px 12px"
                }}>
                  <div style={{
                    fontSize: 9, color: "#60a5fa", letterSpacing: 2,
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 6, fontWeight: 700
                  }}>
                    ⚡ {msg.execution_results.length} ACTION(S) EXECUTED ON DEVICE
                  </div>
                  {msg.execution_results.map((r, j) => (
                    <div key={j} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      color: r.status === "success" ? "#4ade80" : "#f87171",
                      padding: "2px 0"
                    }}>
                      <span>{r.status === "success" ? "✓" : "✗"}</span>
                      <span style={{ color: "#475569" }}>{r.action}</span>
                      <span>→</span>
                      <span>{r.interface}</span>
                      <span style={{
                        marginLeft: "auto",
                        background: r.status === "success" ? "#052e1644" : "#2d070744",
                        padding: "1px 8px", borderRadius: 3, fontSize: 9, letterSpacing: 1
                      }}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 4,
              background: "#0f172a", border: "1px solid #1e293b",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
            }}>⬡</div>
            <div style={{
              fontSize: 11, color: "#475569",
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", gap: 4
            }}>
              {["ANALYZING", "NETWORK", "STATE"].map((w, i) => (
                <span key={i} style={{
                  animation: "pulse-dot 1.2s infinite",
                  animationDelay: `${i * 0.2}s`
                }}>{w}</span>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 8,
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 6, padding: "4px 4px 4px 14px",
        alignItems: "center"
      }}>
        <span style={{
          fontSize: 10, color: "#334155",
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0
        }}>›</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Command the network..."
          style={{
            flex: 1, background: "transparent",
            border: "none", color: "#e2e8f0",
            fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
            padding: "8px 0"
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: loading ? "#1e293b" : "#1d4ed8",
          color: loading ? "#475569" : "white",
          border: "none", padding: "10px 18px",
          borderRadius: 4, cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700, fontSize: 11, letterSpacing: 1,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {loading ? "..." : "SEND"}
        </button>
      </div>
    </Card>
  );
}

export default function App() {
  const [interfaces, setInterfaces] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const fetchData = async () => {
    try {
      const [ifRes, alRes] = await Promise.all([
        axios.get(`${API}/interfaces`),
        axios.get(`${API}/alerts`),
      ]);
      setInterfaces(ifRes.data.interfaces || []);
      setAlerts(alRes.data.alerts || []);
      setLastUpdate(new Date().toLocaleTimeString());
      setConnected(true);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    const ws = new WebSocket(WS);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "new_alerts") {
        setAlerts(prev => [...data.alerts, ...prev]);
      }
      if (data.interfaces) setInterfaces(data.interfaces);
    };
    return () => { clearInterval(interval); ws.close(); };
  }, []);

  const toggleInterface = async (name, enabled) => {
    try {
      await axios.post(`${API}/interfaces/${encodeURIComponent(name)}/toggle`, { enabled });
      setTimeout(fetchData, 2000);
    } catch (e) { console.error(e); }
  };

  const ackAlert = async (id) => {
    await axios.post(`${API}/alerts/${id}/acknowledge`);
    fetchData();
  };

  const unackedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <>
      <style>{css}</style>
      <div className="grid-bg" style={{ minHeight: "100vh" }}>

        {/* Header */}
        <div style={{
          background: "#0d1117cc",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1e293b",
          padding: "0 32px",
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: "linear-gradient(135deg, #1d4ed8, #6d28d9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13
              }}>⬡</div>
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: "#f1f5f9",
                  letterSpacing: 0.5
                }}>
                  NetAI Platform
                </div>
                <div style={{
                  fontSize: 9, color: "#334155", letterSpacing: 2,
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  CISCO C9K · ODL · GPT-4o
                </div>
              </div>
            </div>

            {/* Nav tabs */}
            <div style={{ display: "flex", gap: 2 }}>
              {["dashboard", "interfaces", "ai-agent"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background: activeTab === tab ? "#1e293b" : "transparent",
                  color: activeTab === tab ? "#f1f5f9" : "#475569",
                  border: "none", padding: "6px 14px", borderRadius: 4,
                  cursor: "pointer", fontSize: 10, fontWeight: 700,
                  letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {unackedCount > 0 && (
              <span style={{
                background: "#ef444422", color: "#ef4444",
                border: "1px solid #ef444433",
                padding: "3px 10px", borderRadius: 4,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, letterSpacing: 1
              }}>
                {unackedCount} ALERT{unackedCount > 1 ? "S" : ""}
              </span>
            )}
            <span style={{
              fontSize: 9, color: "#334155",
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {lastUpdate ? `SYNC ${lastUpdate}` : "SYNCING..."}
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              color: connected ? "#4ade80" : "#f87171", fontWeight: 700
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: connected ? "#4ade80" : "#f87171",
                animation: connected ? "pulse-dot 2s infinite" : "none",
                display: "inline-block"
              }} />
              {connected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: "24px 32px" }}>

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="fade-in">
              <StatsBar interfaces={interfaces} />
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 16
              }}>
                <InterfaceTable interfaces={interfaces} onToggle={toggleInterface} />
                <AlertPanel alerts={alerts} onAck={ackAlert} />
              </div>
              <AIChat />
            </div>
          )}

          {/* INTERFACES TAB */}
          {activeTab === "interfaces" && (
            <div className="fade-in">
              <StatsBar interfaces={interfaces} />
              <InterfaceTable interfaces={interfaces} onToggle={toggleInterface} />
            </div>
          )}

          {/* AI AGENT TAB */}
          {activeTab === "ai-agent" && (
            <div className="fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ marginBottom: 16 }}>
                <Card style={{ padding: "12px 20px" }}>
                  <div style={{
                    display: "flex", gap: 24,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#475569"
                  }}>
                    <span>MODEL: GPT-4O</span>
                    <span>PROTOCOL: NETCONF/YANG</span>
                    <span>DEVICE: CISCO C9K</span>
                    <span style={{ marginLeft: "auto", color: "#4ade80" }}>
                      ◉ AGENT READY
                    </span>
                  </div>
                </Card>
              </div>
              <AIChat />
            </div>
          )}

        </div>
      </div>
    </>
  );
}
