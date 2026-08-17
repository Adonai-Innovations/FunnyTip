import { useEffect, useRef, useState } from "react";

/**
 * Fake Tip Kiosk
 * -------------------------------------------------------------------------
 * A payment-terminal-style prank/demo. Pick a tip %, sign on the pad, enter
 * a name + grade, and every attempt is logged to a per-person history screen
 * (attempts, average %, total).
 *
 * Storage: all attempts are persisted as a single JSON array under one
 * localStorage key. (This replaces the `window.storage` sandbox API that the
 * original artifact used, which does not exist in a standalone deploy.)
 */

const STORAGE_KEY = "tipKioskHistory";
const TIP_OPTIONS = [0, 15, 18, 20];

// --- storage layer (JSON array under one key) ------------------------------
function loadHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full / unavailable — nothing we can do in a kiosk, fail quietly
  }
}

// --- signature pad ---------------------------------------------------------
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1220";
  }, []);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) {
      setHasInk(true);
      onChange(canvasRef.current.toDataURL("image/png"));
    } else {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function end() {
    if (drawing.current) {
      drawing.current = false;
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <div style={styles.signWrap}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && <span style={styles.signHint}>Sign here</span>}
      </div>
      <button type="button" style={styles.clearBtn} onClick={clear}>
        Clear signature
      </button>
    </div>
  );
}

// --- history aggregation ---------------------------------------------------
function groupByPerson(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = `${(e.firstName || "").trim().toLowerCase()}|${(e.lastName || "")
      .trim()
      .toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        firstName: e.firstName,
        lastName: e.lastName,
        grade: e.grade,
        attempts: 0,
        total: 0,
      });
    }
    const g = map.get(key);
    g.attempts += 1;
    g.total += Number(e.tipPercent) || 0;
    // keep the most recent grade for the person
    if (e.grade) g.grade = e.grade;
  }
  return Array.from(map.values())
    .map((g) => ({ ...g, average: g.attempts ? g.total / g.attempts : 0 }))
    .sort((a, b) => b.attempts - a.attempts);
}

// --- main component --------------------------------------------------------
export default function TipKiosk() {
  const [view, setView] = useState("kiosk"); // "kiosk" | "history"
  const [entries, setEntries] = useState(loadHistory);

  const [tip, setTip] = useState(null);
  const [signature, setSignature] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    saveHistory(entries);
  }, [entries]);

  const canSubmit =
    tip !== null &&
    signature &&
    firstName.trim() &&
    lastName.trim() &&
    grade.trim();

  function resetForm() {
    setTip(null);
    setSignature(null);
    setFirstName("");
    setLastName("");
    setGrade("");
  }

  function submit() {
    if (!canSubmit) return;
    const entry = {
      id: `${entries.length}-${firstName}-${lastName}-${tip}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      grade: grade.trim(),
      tipPercent: tip,
      signature,
      ts: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, entry]);
    resetForm();
    setThanks(true);
  }

  const groups = groupByPerson(entries);

  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <span style={styles.brandDot} />
            <span>Tip Kiosk</span>
          </div>
          <button
            type="button"
            style={styles.navBtn}
            onClick={() => setView(view === "kiosk" ? "history" : "kiosk")}
          >
            {view === "kiosk" ? `History (${entries.length})` : "← Back"}
          </button>
        </header>

        {view === "kiosk" ? (
          thanks ? (
            <div style={styles.thanks}>
              <div style={styles.check}>✓</div>
              <h2 style={{ margin: "8px 0 4px" }}>Thank you!</h2>
              <p style={styles.muted}>Your tip has been recorded.</p>
              <button
                type="button"
                style={styles.primary}
                onClick={() => setThanks(false)}
              >
                New tip
              </button>
              <button
                type="button"
                style={styles.linkBtn}
                onClick={() => {
                  setThanks(false);
                  setView("history");
                }}
              >
                View history
              </button>
            </div>
          ) : (
            <div>
              <p style={styles.prompt}>Add a tip?</p>

              <div style={styles.tipRow}>
                {TIP_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTip(pct)}
                    style={{
                      ...styles.tipBtn,
                      ...(tip === pct ? styles.tipBtnActive : {}),
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <label style={styles.label}>Signature</label>
              <SignaturePad onChange={setSignature} />

              <div style={styles.nameRow}>
                <input
                  style={styles.input}
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  style={styles.input}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input
                style={{ ...styles.input, width: "100%", marginTop: 10 }}
                placeholder="Grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />

              <button
                type="button"
                style={{
                  ...styles.primary,
                  ...(canSubmit ? {} : styles.primaryDisabled),
                }}
                disabled={!canSubmit}
                onClick={submit}
              >
                Confirm {tip !== null ? `${tip}% tip` : "tip"}
              </button>
            </div>
          )
        ) : (
          <HistoryView groups={groups} count={entries.length} />
        )}
      </div>
      <p style={styles.footer}>Demo kiosk · not a real payment terminal</p>
    </div>
  );
}

function HistoryView({ groups, count }) {
  if (count === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.muted}>No tips recorded yet.</p>
      </div>
    );
  }
  return (
    <div>
      <p style={styles.prompt}>Tip history</p>
      <div style={styles.historyList}>
        {groups.map((g) => (
          <div key={`${g.firstName}-${g.lastName}`} style={styles.personRow}>
            <div style={styles.personTop}>
              <span style={styles.personName}>
                {g.firstName} {g.lastName}
              </span>
              <span style={styles.gradePill}>Grade {g.grade}</span>
            </div>
            <div style={styles.statRow}>
              <Stat label="Attempts" value={g.attempts} />
              <Stat label="Average %" value={`${g.average.toFixed(1)}%`} />
              <Stat label="Total %" value={`${g.total}%`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

// --- styles ----------------------------------------------------------------
const styles = {
  screen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background:
      "radial-gradient(1200px 600px at 50% -10%, #16233b 0%, #0b1220 60%)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#111c30",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#e8eef7",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brand: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700 },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#3ddc97",
    boxShadow: "0 0 10px #3ddc97",
  },
  navBtn: {
    background: "transparent",
    color: "#9fb3cf",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  prompt: { fontSize: 22, fontWeight: 700, margin: "10px 0 16px" },
  tipRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  tipBtn: {
    padding: "18px 0",
    fontSize: 20,
    fontWeight: 700,
    background: "#0e1830",
    color: "#e8eef7",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    cursor: "pointer",
  },
  tipBtnActive: {
    background: "#3ddc97",
    color: "#06231a",
    borderColor: "#3ddc97",
    boxShadow: "0 0 0 3px rgba(61,220,151,0.25)",
  },
  label: {
    display: "block",
    fontSize: 13,
    color: "#9fb3cf",
    margin: "18px 0 6px",
  },
  signWrap: {
    position: "relative",
    background: "#f7fafc",
    borderRadius: 12,
    height: 140,
    overflow: "hidden",
  },
  canvas: { width: "100%", height: "100%", touchAction: "none", display: "block" },
  signHint: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    color: "#9aa7b8",
    fontSize: 15,
    pointerEvents: "none",
  },
  clearBtn: {
    marginTop: 8,
    background: "transparent",
    color: "#9fb3cf",
    border: "none",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
  },
  nameRow: { display: "flex", gap: 10, marginTop: 16 },
  input: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    padding: "12px 14px",
    fontSize: 16,
    background: "#0e1830",
    color: "#e8eef7",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    outline: "none",
  },
  primary: {
    width: "100%",
    marginTop: 18,
    padding: "16px 0",
    fontSize: 17,
    fontWeight: 700,
    background: "#3ddc97",
    color: "#06231a",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
  },
  primaryDisabled: {
    background: "#20304d",
    color: "#6b7d99",
    cursor: "not-allowed",
  },
  linkBtn: {
    display: "block",
    width: "100%",
    marginTop: 10,
    background: "transparent",
    color: "#9fb3cf",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
  },
  thanks: { textAlign: "center", padding: "20px 0" },
  check: {
    width: 64,
    height: 64,
    margin: "0 auto 6px",
    borderRadius: "50%",
    background: "#3ddc97",
    color: "#06231a",
    fontSize: 34,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: "#9fb3cf", fontSize: 14 },
  empty: { textAlign: "center", padding: "36px 0" },
  historyList: { display: "flex", flexDirection: "column", gap: 12 },
  personRow: {
    background: "#0e1830",
    borderRadius: 14,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  personTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  personName: { fontWeight: 700, fontSize: 16 },
  gradePill: {
    fontSize: 12,
    color: "#9fb3cf",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    padding: "3px 10px",
  },
  statRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  stat: { textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#9fb3cf", marginTop: 2 },
  footer: { marginTop: 16, color: "#54627a", fontSize: 12 },
};
