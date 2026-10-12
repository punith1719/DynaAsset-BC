import React, { useState, useEffect, useMemo, useCallback } from "react";
//import { supabase } from "./supabase";
import Select from "react-select";
import { components } from "react-select";
import {
  LayoutDashboard, Boxes, ClipboardList, CalendarClock, Plus, X,
  Pencil, Trash2, MapPin, Wrench, AlertTriangle, ChevronRight,
  Search, ArrowUpRight, Circle,Gauge, CheckCircle2, User, Clock,
  AlertCircle, MessageSquare, LogOut, UserCog, ShieldCheck, Send, Bell, Fuel
} from "lucide-react";
import { supabase } from "./supabaseClient";

// Local NTLM sync service (bc-local-sync). Runs on a machine that can reach the BC server.
const LOCAL_SYNC_URL = import.meta.env.VITE_LOCAL_SYNC_URL || "http://localhost:3001";

const COLORS = {
  bg: "#0E1013",
  panel: "#16191D",
  panelAlt: "#1D2125",
  line: "#282D33",
  lineLight: "#363C44",
  steel: "#5B8DD6",
  steelLight: "#8FB4E8",
  steelDim: "#2E4160",
  ore: "#E08A3C",
  oreDim: "#4A3220",
  moss: "#7FA86B",
  mossDim: "#2C3B26",
  alert: "#DB6354",
  alertDim: "#452621",
  bone: "#F3F0E8",
  ash: "#9BA1A8",
  ashDim: "#5E6368",
  glow: "rgba(91,141,214,0.35)",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

* { box-sizing: border-box; }

body {
  margin: 0;
  background:
    radial-gradient(ellipse 1100px 600px at 14% -8%, rgba(91,141,214,0.10), transparent 60%),
    radial-gradient(ellipse 900px 700px at 100% 0%, rgba(224,138,60,0.055), transparent 55%),
    ${COLORS.bg};
  background-attachment: fixed;
}

::selection { background: ${COLORS.steelDim}; color: ${COLORS.bone}; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 20px; border: 2px solid ${COLORS.bg}; }
::-webkit-scrollbar-thumb:hover { background: ${COLORS.lineLight}; }

button, input, select, textarea { font-family: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible, textarea:focus-visible {
  outline: 2px solid ${COLORS.steelLight};
  outline-offset: 2px;
}

.btn-primary {
  background: linear-gradient(180deg, #6B9CE0 0%, ${COLORS.steel} 100%);
  box-shadow: 0 1px 0 rgba(255,255,255,0.12) inset, 0 6px 16px -8px rgba(91,141,214,0.55);
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}
.btn-primary:hover { filter: brightness(1.08); box-shadow: 0 1px 0 rgba(255,255,255,0.14) inset, 0 8px 20px -6px rgba(91,141,214,0.65); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); filter: brightness(0.97); }

.btn-ghost, .btn-danger { transition: border-color 120ms ease, color 120ms ease, background 120ms ease; }
.btn-ghost:hover { border-color: ${COLORS.lineLight}; color: ${COLORS.bone}; background: ${COLORS.panelAlt}; }
.btn-danger:hover { border-color: ${COLORS.alert}; background: ${COLORS.alertDim}; }

.nav-item { transition: background 120ms ease, border-color 120ms ease, color 120ms ease; }
.nav-item:hover { background: ${COLORS.panelAlt}; color: ${COLORS.bone}; }

.card-surface { transition: border-color 150ms ease, transform 150ms ease; }
.card-surface:hover { border-color: ${COLORS.lineLight}; }

@media (prefers-reduced-motion: reduce) {
  .btn-primary, .btn-ghost, .btn-danger, .nav-item, .card-surface { transition: none !important; }
  .btn-primary:hover { transform: none; }
}

.auth-split { display: flex; min-height: 100vh; }
.auth-brand { flex: 1.1; display: flex; }
.auth-form-col { flex: 1; display: flex; align-items: center; justify-content: center; }
@media (max-width: 880px) {
  .auth-split { flex-direction: column; }
  .auth-brand { flex: none; min-height: 240px; }
}

.auth-tab { transition: background 120ms ease, color 120ms ease; }

.table-row { transition: background 120ms ease; }
.table-row:hover { background: ${COLORS.panelAlt}; }

.kanban-card { transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease; }
.kanban-card:hover { border-color: ${COLORS.lineLight}; transform: translateY(-1px); box-shadow: 0 10px 24px -14px rgba(0,0,0,0.5); }
`;

// Preventive maintenance wheel: 4 positions (A -> B -> C -> D -> back to A),
// each one a fixed 3-month / 5,000 km step after the last service — so the
// absolute schedule works out to 3/6/9/12 months and 5,000/10,000/15,000/
// 20,000 km from baseline. `checklist` is the CUMULATIVE part list for that
// service (each step adds a few items on top of the previous ones); Service
// 4 repeats the full 10-item list as a comprehensive service, then the loop
// resets back to position A (handled automatically since lastServiceMeter/
// lastServiceDate are reset on every completion, below).
const PM_SERVICES = {
  A: {
    label: "Service 1",
    meter: 5000,
    days: 90,
    next: "B",
    checklist: [
      "Engine oil level",
      "Windshield washer fluid",
      "Tire pressure & tread",
      "Brake fluid level",
      "Wiper blades",
    ],
  },
  B: {
    label: "Service 2",
    meter: 5000,
    days: 90,
    next: "C",
    checklist: [
      "Engine oil level",
      "Windshield washer fluid",
      "Tire pressure & tread",
      "Brake fluid level",
      "Wiper blades",
      "Engine air filter",
      "Cabin air filter",
    ],
  },
  C: {
    label: "Service 3",
    meter: 5000,
    days: 90,
    next: "D",
    checklist: [
      "Engine oil level",
      "Windshield washer fluid",
      "Tire pressure & tread",
      "Brake fluid level",
      "Wiper blades",
      "Engine air filter",
      "Cabin air filter",
      "Battery terminals",
      "Brake pads & rotors",
      "Spark plugs",
    ],
  },
  D: {
    label: "Service 4",
    meter: 5000,
    days: 90,
    next: "A",
    checklist: [
      "Engine oil level",
      "Windshield washer fluid",
      "Tire pressure & tread",
      "Brake fluid level",
      "Wiper blades",
      "Engine air filter",
      "Cabin air filter",
      "Battery terminals",
      "Brake pads & rotors",
      "Spark plugs",
    ],
  },
};

// The checklist performed at commissioning (Month 0 / 0 km) — reference
// only, not something that auto-generates a work order.
const PM_BASELINE_CHECKLIST = ["Engine oil level", "Windshield washer fluid"];

const STATUS_META = {
  Operational: { color: COLORS.moss, label: "Operational" },
  "Under maintenance": { color: COLORS.ore, label: "Under maintenance" },
  Down: { color: COLORS.alert, label: "Down" },
  Idle: { color: COLORS.ash, label: "Idle" },
};

const PRIORITY_META = {
  Low: COLORS.ash,
  Medium: COLORS.steelLight,
  High: COLORS.ore,
  Critical: COLORS.alert,
};

const WO_COLUMNS = ["Open", "In progress", "On hold", "Completed"];

//const ASSET_TYPES = ["Mobile plant", "Fixed plant", "Vehicle", "Equipment,"];

const ROLES = ["admin", "user", "manager", "issue_department", "issue_manager", "technician"];

const ROLE_LABELS = {
  admin: "Admin",
  user: "User",
  manager: "Manager",
  issue_department: "Issue Department",
  issue_manager: "Issue Manager",
  technician: "Technician",
};

// Two chains share the same stage vocabulary:
//
// Breakdown (user-reported issue):
//   manager_review -> user_completion -> issue_department_review
//   -> issue_manager_review -> technician_assigned -> closed
//
// Preventive Maintenance (system-generated from meter/day thresholds):
//   issue_department_review -> technician_assigned -> closed
//   (skips Manager and Issue Manager entirely — matches how PM is
//   normally handled, no unnecessary approvals)
const APPROVAL_STAGE_LABELS = {
  manager_review: "Pending Manager Review",
  user_completion: "Approved — Add Work Order Details",
  issue_department_review: "Pending Issue Department",
  issue_manager_review: "Pending Issue Manager",
  technician_assigned: "Assigned to Technician",
  closed: "Closed",
  rejected: "Rejected",
};

const APPROVAL_STAGE_COLOR = (stage) => {
  if (stage === "closed") return COLORS.moss;
  if (stage === "rejected") return COLORS.alert;
  if (stage === "user_completion") return COLORS.ore;
  if (stage === "issue_manager_review") return COLORS.ore;
  if (stage === "technician_assigned") return COLORS.ore;
  return COLORS.steelLight;
};

// Which role owns which stage's queue (user_completion is owned by the
// specific reporter, not a role-wide queue, so it's handled separately).
const STAGE_OWNER_ROLE = {
  manager_review: "manager",
  issue_department_review: "issue_department",
  issue_manager_review: "issue_manager",
  technician_assigned: "technician",
};

const NEXT_STAGE_BREAKDOWN = {
  manager_review: "user_completion",
  user_completion: "issue_department_review",
  issue_department_review: "issue_manager_review",
  issue_manager_review: "technician_assigned",
  technician_assigned: "closed",
};

const NEXT_STAGE_PM = {
  issue_department_review: "technician_assigned",
  technician_assigned: "closed",
};

function getNextStage(wo) {
  const chain = wo.maintenanceType === "Preventive" ? NEXT_STAGE_PM : NEXT_STAGE_BREAKDOWN;
  return chain[wo.approvalStage];
}

// Human-readable activity log text for each transition, independent of who triggers it.
const TRANSITION_MESSAGE = {
  user_completion: (actor) => `Approved by Manager (${actor}) — work order created, sent back to reporter to add details`,
  issue_department_review: (actor) => `Submitted to Issue Department by ${actor}`,
  issue_manager_review: (actor) => `Approved by Issue Department (${actor})`,
  technician_assigned: (actor) => `Approved — assigned to a Technician (by ${actor})`,
  closed: (actor) => `Closed by Technician (${actor})`,
};

// Maps one assets_bc row to the asset object the UI uses. Flat columns
// come from Business Central (via the pull); anything stored in `data`
// (edits made inside the app) is layered on top so it survives reloads.
function mapAssetRow(row) {
  // Values saved inside the app (`data`) override BC values, but blank
  // ones never wipe out what BC provided.
  const overrides = Object.fromEntries(
    Object.entries(row.data || {}).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  const type = row.bc_subclass_code || row.object_type || row.bc_class_code || "";
  const status = row.lifecycle_state || (row.object_active === false ? "Idle" : "Operational");
  return {
    id: row.id,
    // friendly names (used by work orders, dashboard, detail views)
    tag: row.bc_object_id || row.id,
    name: row.asset_name || "",
    type,
    location: row.functional_location || "",
    status,
    // raw column names (used by the asset register table)
    bc_object_id: row.bc_object_id || row.id,
    asset_name: row.asset_name || "",
    object_type: type,
    functional_location: row.functional_location || "",
    lifecycle_state: status,
    active: row.object_active,
    model: row.model,
    serialId: row.serial_id,
    notes: row.notes,
    criticality: "Medium",
    // Preventive-maintenance wheel defaults — only used until the asset's
    // own `data` override (set once a PM service is completed) kicks in.
    currentService: "A",
    lastServiceMeter: 0,
    lastServiceDate: row.created_at || new Date().toISOString(),
    ...overrides,
  };
}

const uid = () => Math.random().toString(36).slice(2, 9);

// supabase-js only gives a generic "Edge Function returned a non-2xx
// status code" message by default — the actual reason (e.g. the raw BC
// error) lives in the underlying HTTP response body, exposed on
// `error.context`. This pulls that real message out so it can be logged
// and shown in the activity timeline instead of the useless generic one.
async function describeFunctionError(error) {
  if (!error) return "unknown error";
  const ctx = error.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.clone().json();
      if (body) {
        const main = body.error || body.message || JSON.stringify(body);
        const debugSuffix = body.debug ? ` [debug: ${JSON.stringify(body.debug)}]` : "";
        return `${main}${debugSuffix}`;
      }
    } catch (_) {
      // not JSON, fall through to text
    }
  }
  if (ctx && typeof ctx.text === "function") {
    try {
      const text = await ctx.clone().text();
      if (text) return text;
    } catch (_) {
      // ignore
    }
  }
  return error.message || String(error);
}
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (dateStr) => {
  const d1 = new Date(dateStr + "T00:00:00");
  const d0 = new Date(today() + "T00:00:00");
  return Math.round((d1 - d0) / 86400000);
};

const DUE_SOON_THRESHOLD_DAYS = 10;

// Builds the admin notification list from the maintenance schedule:
// anything overdue, or due within the next DUE_SOON_THRESHOLD_DAYS days.
function getMaintenanceNotifications(schedules, assetById) {
  return schedules
    .map((s) => {
      const days = daysBetween(s.nextDue);
      const asset = assetById[s.assetId];
      let type = null;
      if (days < 0) type = "overdue";
      else if (days <= DUE_SOON_THRESHOLD_DAYS) type = "due_soon";
      if (!type) return null;
      return {
        id: s.id,
        scheduleId: s.id,
        taskName: s.taskName,
        assetTag: asset ? asset.tag : "—",
        assetName: asset ? asset.name : "Unknown asset",
        days,
        type,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);
}

const SEED = {
  assets: [
    { id: uid(), tag: "EXC-1015", name: "Excavator CAT 6015B", type: "Mobile plant", location: "Kagem — Pit 1", status: "Operational", criticality: "High",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
    { id: uid(), tag: "HTR-8300", name: "Haul Truck Komatsu 830E", type: "Mobile plant", location: "Kagem — Pit 2", status: "Under maintenance", criticality: "High",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
    { id: uid(), tag: "CRS-PJ01", name: "Primary Jaw Crusher", type: "Fixed plant", location: "Montepuez — Processing", status: "Operational", criticality: "Critical",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
    { id: uid(), tag: "GEN-C500", name: "Generator Cummins 500kVA", type: "Fixed plant", location: "Kagem — Powerhouse", status: "Down", criticality: "Critical",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
    { id: uid(), tag: "DOZ-D9T", name: "Dozer CAT D9T", type: "Mobile plant", location: "Kagem — Pit 1", status: "Operational", criticality: "Medium",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
    { id: uid(), tag: "VEH-LC79", name: "Land Cruiser LC79", type: "Vehicle", location: "Montepuez — Site office", status: "Idle", criticality: "Low",image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800", },
  ],
  workorders: [],
  schedules: [],
};
SEED.workorders = [
  { id: uid(), woNumber: "WO-0142", assetId: SEED.assets[3].id, title: "Replace faulty voltage regulator", priority: "Critical", status: "Open", assignedTo: "Unassigned", createdDate: today(), dueDate: today(), comments: [{ user: "Maintenance Manager", text: "Voltage regulator needs urgent replacement.", timestamp: new Date().toISOString() }], activity: [{ action: "Work order created", actor: "System", timestamp: new Date().toISOString() }] },
  { id: uid(), woNumber: "WO-0140", assetId: SEED.assets[1].id, title: "250-hour scheduled service", priority: "Medium", status: "In progress", assignedTo: "T. Banda", createdDate: today(), dueDate: today() },
  { id: uid(), woNumber: "WO-0137", assetId: SEED.assets[0].id, title: "Replace hydraulic boom hose", priority: "High", status: "On hold", assignedTo: "Unassigned", createdDate: today(), dueDate: today() },
  { id: uid(), woNumber: "WO-0131", assetId: SEED.assets[4].id, title: "Track tension inspection", priority: "Low", status: "Completed", assignedTo: "M. Phiri", createdDate: today(), dueDate: today() },
];
const shiftDate = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
SEED.schedules = [
  { id: uid(), assetId: SEED.assets[0].id, taskName: "250-hour service", frequency: "Monthly", nextDue: shiftDate(-2) },
  { id: uid(), assetId: SEED.assets[2].id, taskName: "Annual structural inspection", frequency: "Annual", nextDue: shiftDate(4) },
  { id: uid(), assetId: SEED.assets[4].id, taskName: "Undercarriage inspection", frequency: "Quarterly", nextDue: shiftDate(11) },
  { id: uid(), assetId: SEED.assets[3].id, taskName: "Load bank test", frequency: "Quarterly", nextDue: shiftDate(-6) },
  { id: uid(), assetId: SEED.assets[5].id, taskName: "Service — 10,000km", frequency: "Quarterly", nextDue: shiftDate(20) },
];

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [assetTypes, setAssetTypes] = React.useState([]);
   //const [allowedAssetTypes, setAllowedAssetTypes] = useState([]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: userId,
            name: name.trim() || email,
            email,
            role,
          });
          if (profileError) throw profileError;
        }
        if (!data.session) {
          setInfo("Account created. Check your email to confirm, then log in.");
          setMode("login");
        } else {
          onAuthed();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthed();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const wide = typeof window !== "undefined" && window.innerWidth > 980;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        color: COLORS.bone,
        padding: "80px 20px 40px",
        overflow: "hidden",
        backgroundImage: `
          radial-gradient(ellipse 900px 600px at 50% 0%, rgba(91,141,214,0.18) 0%, rgba(0,0,0,0) 60%),
          linear-gradient(180deg, rgba(9,11,13,0.42) 0%, rgba(9,11,13,0.62) 45%, rgba(9,11,13,0.93) 85%, ${COLORS.bg} 100%),
          url('https://images.unsplash.com/photo-1599756719094-9e28479389c4?w=1800&q=80&auto=format&fit=crop')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <style>{FONTS}</style>

      {/* faint technical grid overlay for texture */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
          backgroundImage: `
            linear-gradient(${COLORS.lineLight}1a 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.lineLight}1a 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 0%, transparent 75%)",
        }}
      />

      {/* Brand mark, top-left */}
      <div style={{ position: "absolute", top: 32, left: 36, display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(155deg, ${COLORS.steelLight} 0%, ${COLORS.steel} 60%, ${COLORS.steelDim} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 18px -6px ${COLORS.glow}`,
          }}
        >
          <Wrench size={20} color="#0B0E12" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: 0.4 }}>DynaAsset 365</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "rgba(243,240,232,0.6)", letterSpacing: 1.3, marginTop: 1 }}>ASSET MAINTENANCE</div>
        </div>
      </div>

      {/* Status badge, top-right */}
      <div
        style={{
          position: "absolute", top: 34, right: 36, display: wide ? "flex" : "none", alignItems: "center", gap: 7,
          fontSize: 11, color: "rgba(243,240,232,0.75)", border: `1px solid ${COLORS.lineLight}`,
          borderRadius: 20, padding: "6px 12px 6px 10px", background: "rgba(22,25,29,0.55)", backdropFilter: "blur(4px)",
          fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.4,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.moss, boxShadow: `0 0 0 3px ${COLORS.mossDim}` }} />
        BUSINESS CENTRAL CONNECTED
      </div>

      {/* Headline, centered above the card on wide screens */}
      <div style={{ maxWidth: 560, textAlign: "center", marginBottom: 30, display: wide ? "block" : "none", position: "relative" }}>
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, fontWeight: 600, lineHeight: 1.22, letterSpacing: 0.2 }}>
          Keep every machine on site accounted for, serviced and running.
        </div>
        <div style={{ fontSize: 14, color: "rgba(243,240,232,0.68)", marginTop: 12, lineHeight: 1.6 }}>
          Fixed & mobile plant, work order approvals and Business Central sync — in one place.
        </div>
      </div>

      <div
        style={{
          width: 440,
          maxWidth: "100%",
          background: "rgba(20,23,27,0.94)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${COLORS.lineLight}`,
          borderRadius: 14,
          padding: "40px 40px 36px",
          boxShadow: "0 40px 90px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute", top: 0, left: 24, right: 24, height: 2, borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.steel}, transparent)`,
          }}
        />

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 25, fontWeight: 600 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
          <div style={{ fontSize: 13.5, color: COLORS.ashDim, marginTop: 6 }}>
            {mode === "login" ? "Log in to your maintenance workspace." : "Sign up — your access level is set by an admin."}
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 26, border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden", background: COLORS.bg }}>
          <button
            type="button"
            className="auth-tab"
            onClick={() => setMode("login")}
            style={{
              flex: 1, padding: "10px 0", background: mode === "login" ? COLORS.panelAlt : "transparent",
              color: mode === "login" ? COLORS.bone : COLORS.ashDim, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className="auth-tab"
            onClick={() => setMode("signup")}
            style={{
              flex: 1, padding: "10px 0", background: mode === "signup" ? COLORS.panelAlt : "transparent",
              color: mode === "signup" ? COLORS.bone : COLORS.ashDim, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600,
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3 }}>Full name</div>
              <input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Punith Kumar" />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3 }}>Email</div>
            <input required type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3 }}>Password</div>
            <input required type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
          </div>

          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3 }}>Role</div>
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">{ROLE_LABELS.user}</option>
              </select>
              <div style={{ fontSize: 11, color: COLORS.ashDim, marginTop: 6 }}>
                An admin can change this later from the Team page.
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: COLORS.alertDim, border: `1px solid ${COLORS.alert}`, color: COLORS.bone, borderRadius: 7, padding: "10px 13px", fontSize: 12.5, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, color: COLORS.bone, borderRadius: 7, padding: "10px 13px", fontSize: 12.5, marginBottom: 16 }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary"
            style={{
              width: "100%", background: COLORS.steel, color: "#0B0E12", border: "none", borderRadius: 8,
              padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer", marginTop: 8,
            }}
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>

      {/* Feature strip, centered below the card on wide screens */}
      <div style={{ display: wide ? "flex" : "none", gap: 36, marginTop: 36, position: "relative" }}>
        {[
          { icon: Boxes, label: "Fixed & mobile plant" },
          { icon: ClipboardList, label: "Work order approvals" },
          { icon: CheckCircle2, label: "Business Central sync" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "rgba(243,240,232,0.6)" }}>
            <Icon size={15} color={COLORS.steelLight} />
            {label}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, fontSize: 11, color: "rgba(243,240,232,0.4)", fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.6, position: "relative" }}>
        GEMFIELDS GROUP · V1.0
      </div>
    </div>
  );
}

// Shown once, right after a "User" logs in and before the normal
// dashboard — captures the start-of-shift odometer/fuel reading and
// any notes, then hands control to AuthenticatedApp via onStart().
function ShiftStartScreen({ profile, assets = [], onStart }) {
  const [assetId, setAssetId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Once the machine list arrives (it loads async after this screen
  // mounts), default to the first one so a user with a single assigned
  // machine doesn't have to touch the dropdown at all.
  useEffect(() => {
    if (!assetId && assets.length > 0) setAssetId(assets[0].id);
  }, [assets, assetId]);

  const handleStart = (e) => {
    e.preventDefault();
    setBusy(true);
    onStart({
      assetId,
      odometer: odometer.trim(),
      fuel: fuel.trim(),
      notes: notes.trim(),
      startedAt: new Date().toISOString(),
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        color: COLORS.bone,
        padding: "80px 20px 40px",
        overflow: "hidden",
        backgroundImage: `
          radial-gradient(ellipse 900px 600px at 50% 0%, rgba(127,168,107,0.16) 0%, rgba(0,0,0,0) 60%),
          linear-gradient(180deg, rgba(9,11,13,0.5) 0%, rgba(9,11,13,0.7) 45%, rgba(9,11,13,0.94) 85%, ${COLORS.bg} 100%),
          url('https://images.unsplash.com/photo-1599756719094-9e28479389c4?w=1800&q=80&auto=format&fit=crop')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <style>{FONTS}</style>

      {/* Brand mark, top-left */}
      <div style={{ position: "absolute", top: 32, left: 36, display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(155deg, ${COLORS.steelLight} 0%, ${COLORS.steel} 60%, ${COLORS.steelDim} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 18px -6px ${COLORS.glow}`,
          }}
        >
          <Wrench size={20} color="#0B0E12" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: 0.4 }}>DynaAsset 365</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "rgba(243,240,232,0.6)", letterSpacing: 1.3, marginTop: 1 }}>ASSET MAINTENANCE</div>
        </div>
      </div>

      <div
        style={{
          width: 460,
          maxWidth: "100%",
          background: "rgba(20,23,27,0.94)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${COLORS.lineLight}`,
          borderRadius: 14,
          padding: "40px 40px 36px",
          boxShadow: "0 40px 90px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute", top: 0, left: 24, right: 24, height: 2, borderRadius: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.moss}, transparent)`,
          }}
        />

        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 25, fontWeight: 600 }}>Start your shift</div>
          <div style={{ fontSize: 13.5, color: COLORS.ashDim, marginTop: 6 }}>
            Welcome, {profile?.name || profile?.email}. Log today's vehicle details before heading to your dashboard.
          </div>
        </div>

        <form onSubmit={handleStart}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
              <Boxes size={13} /> Machine
            </div>
            <select
              required
              style={inputStyle}
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            >
              {assets.length === 0 ? (
                <option value="">No machines assigned to you yet</option>
              ) : (
                assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag || a.bc_object_id} — {a.name || a.asset_name || a.type}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
              <Gauge size={13} /> Odometer reading (km)
            </div>
            <input
              required
              type="number"
              min="0"
              style={inputStyle}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="e.g. 48210"
            />
            <div style={{ fontSize: 10.5, color: COLORS.ashDim, marginTop: 6 }}>
              This updates the machine's own meter reading, which drives its preventive-maintenance schedule.
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
              <Fuel size={13} /> Fuel level (%)
            </div>
            <input
              required
              type="number"
              min="0"
              max="100"
              style={inputStyle}
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              placeholder="e.g. 75"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 7, letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={13} /> Notes (optional)
            </div>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth flagging before you start — damage, warning lights, low tyre pressure…"
            />
          </div>

          <button
            type="submit"
            disabled={busy || assets.length === 0}
            className="btn-primary"
            style={{
              width: "100%", background: COLORS.moss, color: "#0B0E12", border: "none", borderRadius: 8,
              padding: "13px 0", fontSize: 14, fontWeight: 600,
              cursor: busy || assets.length === 0 ? "not-allowed" : "pointer", marginTop: 4,
              opacity: assets.length === 0 ? 0.55 : 1,
            }}
          >
            {busy ? "Starting…" : assets.length === 0 ? "No machine assigned" : "Start"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [allowedAssetTypes, setAllowedAssetTypes] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {

      setSession(newSession);

    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchMyProfile = async (uid) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) {
      console.error("Failed to load profile:", error);
      return;
    }
    setProfile(data || { id: uid, name: uid, email: "", role: "user" });
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("part_number");

    if (error) {
      console.error("Inventory Error:", error);
      return;
    }

    setInventory(data || []);
  };
 

  const loadMyAssetPermissions = async (email) => {
  console.log("Logged in email:", email);

  const { data, error } = await supabase
    .from("asset_type_assignments")
    .select("*")
    .eq("active", true);

  console.log("Permission rows:", data);
  console.log("Permission error:", error);

  if (error) return;

  const userEmail = (email || "").trim().toLowerCase();

  const myRows = (data || []).filter(
    x => (x.user_email || "").trim().toLowerCase() === userEmail
  );

  console.log("My rows:", myRows);
  const types = myRows.map(x => x.asset_type);

console.log("Types to save:", types);

setAllowedAssetTypes(types);

console.log("State update requested");

  // ✅ Use only this user's assigned asset types
  setAllowedAssetTypes(myRows.map(x => x.asset_type));
};

const updateUserAssetAccess = async (userId, assetTypes, seeAll) => {

  console.log("Saving Asset Access");
  console.log("User ID:", userId);
  console.log("Asset Types:", assetTypes);
  console.log("See All:", seeAll);

  // Get user's email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (!profile) return;

  // Delete old assignments
  await supabase
    .from("asset_type_assignments")
    .delete()
    .eq("user_email", profile.email);

  // Insert new assignments
  if (assetTypes.length > 0) {

    const rows = assetTypes.map(type => ({
      user_email: profile.email,
      asset_type: type,
      active: true,
      assigned_by: session?.user?.email || "Admin",   // <-- your logged in admin email
    }));

    await supabase
      .from("asset_type_assignments")
      .insert(rows);
  }

  // Update only See All flag
  await supabase
    .from("profiles")
    .update({
      see_all_assets: seeAll,
    })
    .eq("id", userId);

  if (onProfilesChanged)
    onProfilesChanged();
};

  const fetchAllProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setProfiles(data || []);
  };

  useEffect(() => {
  if (!session) {
    setProfile(null);
    return;
  }

  fetchMyProfile(session.user.id);

  loadMyAssetPermissions(session.user.email);

}, [session]);

  useEffect(() => {
    if (!session) return;
    fetchAllProfiles();
  }, [session, profile]);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.ashDim, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthed={() => {}} />;
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.ashDim, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        Loading profile…
      </div>
    );
  }

  // The start-of-shift odometer screen now lives inside AuthenticatedApp
  // (see its own role === "user" gate there), because it needs the real
  // asset list and saveMeterReading to tie the reading to an actual
  // machine and feed the preventive-maintenance due-check.
  return (
  <AuthenticatedApp
    session={session}
    profile={profile}
    profiles={profiles}
    onProfilesChanged={fetchAllProfiles}
  />
);
}

function AuthenticatedApp({ session, profile, profiles, onProfilesChanged }) {
  const role = profile.role || "user";
  const [data, setData] = useState({ assets: [], workorders: [], schedules: [] });
  const [loaded, setLoaded] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tab, setTab] = useState(role === "admin" ? "dashboard" : role === "user" ? "myassets" : "approvals");
  const [notifOpen, setNotifOpen] = useState(false);
  const [assetModal, setAssetModal] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [bcItems, setBcItems] = useState([]);
  const [woModal, setWoModal] = useState(null);
  const [schedModal, setSchedModal] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [materialModal, setMaterialModal] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [allowedAssetTypes, setAllowedAssetTypes] = useState([]);
  // "User" accounts log a start-of-shift odometer reading against a real
  // machine before reaching their dashboard — see the ShiftStartScreen
  // gate further down, right before the main return.
  const [shiftStarted, setShiftStarted] = useState(role !== "user");

  const loadMyAssetPermissions = async (email) => {
  const { data, error } = await supabase
    .from("asset_type_assignments")
    .select("asset_type, user_email")
    .eq("active", true);

  if (error) {
    console.error(error);
    return;
  }

  const userEmail = email.trim().toLowerCase();

  const types = [
    ...new Set(
      data
        .filter(
          row =>
            (row.user_email || "").trim().toLowerCase() === userEmail
        )
        .map(row => row.asset_type)
    ),
  ];

  console.log("Allowed Types:", types);

  setAllowedAssetTypes(types);
};
useEffect(() => {
  console.log("allowedAssetTypes changed:", allowedAssetTypes);
}, [allowedAssetTypes]);

useEffect(() => {
  if (session?.user?.email) {
    loadMyAssetPermissions(session.user.email);
  }
}, [session]);

    const filteredInventory = inventory.filter((item) =>
    item.partNumber?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.description?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const totalParts = filteredInventory.length;

  const lowStock = filteredInventory.filter(
    (item) => item.availableQty <= item.reorderLevel
  ).length;

  const outOfStock = filteredInventory.filter(
  (item) => item.availableQty === 0
  ).length;

  const reservedParts = filteredInventory.reduce(
    (sum, item) => sum + (item.reservedQty || 0),
    0
  );

  const inventoryValue = filteredInventory.reduce(
    (sum, item) => sum + ((item.availableQty || 0) * (item.unitCost || item.price || 0)),
    0
  );
 
  const [loadError, setLoadError] = useState(null);

  // Load everything from Supabase on first mount. If the tables are
  // empty (first run against a fresh project), seed them once.
  useEffect(() => {
    (async () => {
      try {
        const [assetsRes, woRes, schedRes, inventoryRes] = await Promise.all([
          supabase.from("assets_bc").select("*"),
          supabase.from("work_orders").select("*"),
          supabase.from("schedules").select("*"),
          supabase.from("inventory").select("*"),
        ]);

        if (assetsRes.error) throw assetsRes.error;
        if (woRes.error) throw woRes.error;
        if (schedRes.error) throw schedRes.error;
        if (inventoryRes.error) throw inventoryRes.error;

        const assets = (assetsRes.data || []).map(mapAssetRow);
        const workorders = woRes.data.map((row) => row.data);
        const schedules = schedRes.data.map((row) => row.data);
        const inventory = (inventoryRes.data || []).map((row) => row.data);
        console.log("Mapped Inventory:", inventory);
        setInventory(inventory);

        setData({ assets, workorders, schedules });
      } catch (e) {
        console.error("Failed to load data from Supabase:", e);
        setLoadError(e.message || "Could not reach Supabase. Using local demo data instead.");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Live sync: subscribe to Postgres changes so that when ANYONE (Manager,
  // Issue Department, another User, etc.) changes an asset, work order, or
  // schedule item, every open session updates instantly — no refresh needed.
  useEffect(() => {
    if (!loaded) return;

    const applyChange = (key) => (payload) => {
      setData((d) => {
        const list = d[key];
        if (payload.eventType === "DELETE") {
          const deletedId = payload.old?.id;
          return { ...d, [key]: list.filter((item) => item.id !== deletedId) };
        }
        const incoming = key === "assets" ? (payload.new ? mapAssetRow(payload.new) : null) : payload.new?.data;
        if (!incoming) return d;
        const exists = list.some((item) => item.id === incoming.id);
        return {
          ...d,
          [key]: exists ? list.map((item) => (item.id === incoming.id ? incoming : item)) : [incoming, ...list],
        };
      });
    };
    

    const channel = supabase
      .channel("eam-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "assets_bc" }, applyChange("assets"))
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, applyChange("workorders"))
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, applyChange("schedules"))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded]);

  const assetById = useMemo(() => {
    const m = {};
    data.assets.forEach((a) => (m[a.id] = a));
    return m;
  }, [data.assets]);

  const maintenanceNotifications = useMemo(() => {
    if (role !== "admin") return [];
    return getMaintenanceNotifications(data.schedules, assetById);
  }, [role, data.schedules, assetById]);

    const myVisibleAssets = useMemo(() => {

       console.log("Logged in role:", profile?.role);
  console.log("Allowed Types:", allowedAssetTypes);
  console.log("All Assets:", data.assets);
  // Admin can see everything
  if (profile?.role === "admin") {
    return data.assets;
  }

  // Users with "See all assets"
  if (profile?.see_all_assets) {
    return data.assets;
  }

  // Show only assigned asset types
  return data.assets.filter(asset =>
    allowedAssetTypes.includes(asset.type)
  );

}, [data.assets, profile, allowedAssetTypes]);
    

  const deleteAsset = async (id) => {
    setData((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id) }));
    const { error } = await supabase.from("assets_bc").delete().eq("id", id);
    if (error) console.error("Failed to delete asset in Supabase:", error);
  };

  const saveWO = async (wo) => {
    let savedWO = wo;
    setData((d) => {
      const existingIndex = d.workorders.findIndex((w) => w.id === wo.id);
      const exists = existingIndex !== -1;
      const activity = wo.activity ? [...wo.activity] : [];
      const now = new Date().toISOString();

      if (!exists) {
        activity.push({ action: "Work order created", actor: profile.name, timestamp: now });
      } else {
        const old = d.workorders[existingIndex];
        if (old.status !== wo.status) {
          activity.push({ action: `Status changed to ${wo.status}`, actor: profile.name, timestamp: now });
        }
        if (old.priority !== wo.priority) {
          activity.push({ action: `Priority changed to ${wo.priority}`, actor: profile.name, timestamp: now });
        }
        if (old.assignedTo !== wo.assignedTo) {
          activity.push({ action: `Assigned to ${wo.assignedTo || "Unassigned"}`, actor: profile.name, timestamp: now });
        }
      }

      savedWO = { ...wo, activity };

      return {
        ...d,
        workorders: exists
          ? d.workorders.map((w) => (w.id === wo.id ? savedWO : w))
          : [savedWO, ...d.workorders],
      };
    });
    setWoModal(null);
    const { error } = await supabase.from("work_orders").upsert({ id: savedWO.id, data: savedWO, updated_at: new Date().toISOString() });
    if (error) console.error("Failed to save work order to Supabase:", error);
  };

  const assignTechnician = async (woId, workerGroup, technician) => {
  let updatedWO = null;

  setData((d) => {
    const workorders = d.workorders.map((w) => {
      if (w.id !== woId) return w;

      updatedWO = {
        ...w,
        workerGroup,
        assignedTo: technician,
        // Record the first-ever assigned technician once, and never
        // overwrite it on later reassignments — this is what the
        // "Assigned Technician" display should always show.
        firstAssignedTechnician: w.firstAssignedTechnician || technician,
      };

      return updatedWO;
    });

    return { ...d, workorders };
  });

  if (updatedWO) {
    const { error } = await supabase
      .from("work_orders")
      .upsert({
        id: updatedWO.id,
        data: updatedWO,
        updated_at: new Date().toISOString(),
      });

    if (error) console.error(error);

    // Note: assigning a technician no longer pushes anything to BC by
    // itself (that used to create a placeholder schedule line with a
    // hardcoded default of 4 hours, which wasn't wanted). BC schedule
    // lines are now only created when actual hours are logged in the
    // Technician Labor Log below.
  }
};
  const deleteWO = async (id) => {
    setData((d) => ({ ...d, workorders: d.workorders.filter((w) => w.id !== id) }));
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) console.error("Failed to delete work order in Supabase:", error);
  };

  console.log("Supabase URL:", supabase.supabaseUrl);

  const loadWorkers = useCallback(async () => {
    const { data, error } = await supabase
      .from("workers_bc")
      .select("personnel_number, worker_name, worker_group")
      .order("worker_name");

    if (error) {
      console.error(error);
      return;
    }

    setWorkers(data || []);
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

const [items, setItems] = React.useState([]);

const loadItems = useCallback(async () => {
  const { data, error } = await supabase
    .from("bc_items")
    .select("item_id, product_name")
    .order("item_id");

  if (error) {
    console.error(error);
    return;
  }

  setItems(data || []);
}, []);

useEffect(() => {
  loadItems();
}, [loadItems]);

  const addComment = async (woId, text) => {
    if (!text || !text.trim()) return;
    let updatedWO = null;
    setData((d) => {
      const wo = d.workorders.find((w) => w.id === woId);
      if (!wo) return d;
      const now = new Date().toISOString();
      const comments = [...(wo.comments || []), { user: profile.name, text: text.trim(), timestamp: now }];
      const activity = [...(wo.activity || []), { action: "Comment added", actor: profile.name, timestamp: now }];
      updatedWO = { ...wo, comments, activity };
      return { ...d, workorders: d.workorders.map((w) => (w.id === woId ? updatedWO : w)) };
    });
    if (updatedWO) {
      const { error } = await supabase.from("work_orders").upsert({ id: updatedWO.id, data: updatedWO, updated_at: new Date().toISOString() });
      if (error) console.error("Failed to save comment to Supabase:", error);
    }
  };

  // Generic helper: apply a partial update to a work order (and optionally
  // log an activity entry), then persist the result to Supabase.
  const patchWorkOrder = async (woId, updater, activityEntry) => {
    const wo = data.workorders.find((w) => w.id === woId);
    if (!wo) return;

    const patch = updater(wo);
    const entry =
      typeof activityEntry === "function"
        ? activityEntry(wo)
        : activityEntry;

    const activity = entry
      ? [...(wo.activity || []), entry]
      : (wo.activity || []);

    const updatedWO = {
      ...wo,
      ...patch,
      activity,
    };

    const reserveMaterial = async (woId, part, qty) => {

      const quantity = Number(qty);

      const inventoryItem = inventory.find(
        item => item.partNumber === part
      );


      if(!inventoryItem){
        alert("Part not found");
        return;
      }


      if(inventoryItem.availableQty < quantity){
        alert("Insufficient stock");
        return;
      }


  // reduce available stock
      const updatedInventory = inventory.map(item =>
        item.partNumber === part
        ?
        {
          ...item,
          availableQty:item.availableQty - quantity,
          reservedQty:item.reservedQty + quantity
        }
        :
        item
      );


      setInventory(updatedInventory);



  // update work order

      patchWorkOrder(
        woId,

        (wo)=>({

          materials:[
          ...(wo.materials || []),

          {
            partNumber:part,
            qty:quantity,
            status:"Reserved"
          }

        ]

      }),


      {
        action:`Reserved ${quantity} x ${part}`,
        actor:profile.name,
        timestamp:new Date().toISOString()
      }

    );


  };

  console.log("Saving:", updatedWO);

  // Update React state
  setData((d) => ({
    ...d,
    workorders: d.workorders.map((w) =>
      w.id === woId ? updatedWO : w
    ),
  }));

  // Save to Supabase. proj_id/proj_activity (D365 project-tracking
  // fields from the old app) live inside `data` already via
  // `...wo, ...patch` above — this table has no such columns of its
  // own, so writing them as top-level keys gets rejected by every
  // single save (approve, reject, comment, assign — anything that
  // goes through patchWorkOrder).
  const { error } = await supabase
  .from("work_orders")
  .upsert({
    id: updatedWO.id,
    data: updatedWO,
    updated_at: new Date().toISOString(),
  });

if (error) {
  console.error("Failed to save work order to Supabase:", error);
}

  if (error) {
    console.error(error);
  } else {
    console.log("Saved successfully");
  }
};

const saveMeterReading = async (assetId, reading, extra = {}) => {

  const asset = data.assets.find(a => a.id === assetId);

  if (!asset) return;

  const updatedAsset = {
    ...asset,
    meterReading: reading,
    lastMeterUpdate: new Date().toISOString(),
    // Optional extras from the shift-start screen (fuel %, notes, who
    // logged it) — the Meter Readings page doesn't pass these, so they
    // default to not touching the asset at all.
    ...(extra.fuelLevel !== undefined ? { fuelLevel: extra.fuelLevel } : {}),
    ...(extra.shiftNotes !== undefined ? { lastShiftNotes: extra.shiftNotes } : {}),
    ...(extra.loggedBy !== undefined ? { lastShiftLoggedBy: extra.loggedBy } : {}),
  };

  setData(d => ({
    ...d,
    assets: d.assets.map(a =>
      a.id === assetId ? updatedAsset : a
    )
  }));

  await supabase
    .from("assets_bc")
    .upsert({
      id: updatedAsset.id,
      data: updatedAsset,
      updated_at: new Date().toISOString()
    });

  await checkPreventiveMaintenance(updatedAsset);
};

// How close to the threshold counts as "coming up" rather than "due now".
const PM_UPCOMING_METER_WINDOW = 50; // km
const PM_UPCOMING_DAYS_WINDOW = 3;   // days

// Mirrors a PM notice into the Maintenance Schedule table (data.schedules)
// so it shows on that page AND feeds the existing admin notification bell,
// which reads straight off data.schedules via getMaintenanceNotifications.
// One row per asset per kind ("upcoming" / "due") — re-saving just updates
// it in place instead of piling up duplicates.
const upsertPmScheduleNotice = async (asset, service, { kind, remaining }) => {
  const serviceLabel = service.label || `Service ${asset.currentService}`;
  const id = `pm-${kind}-${asset.id}`;
  const taskName =
    kind === "upcoming"
      ? `${serviceLabel} coming up — ${Math.max(0, Math.round(remaining))}km remaining`
      : `${serviceLabel} due now`;

  const s = {
    id,
    assetId: asset.id,
    taskName,
    frequency: "Preventive (3 months / 5,000 km)",
    nextDue: kind === "upcoming" ? shiftDate(5) : today(),
  };

  setData((d) => {
    const exists = d.schedules.some((x) => x.id === s.id);
    return { ...d, schedules: exists ? d.schedules.map((x) => (x.id === s.id ? s : x)) : [...d.schedules, s] };
  });
  const { error } = await supabase.from("schedules").upsert({ id: s.id, data: s, updated_at: new Date().toISOString() });
  if (error) console.error(`Failed to save PM ${kind} schedule notice:`, error);
};

const removePmScheduleNotice = async (assetId, kind) => {
  const id = `pm-${kind}-${assetId}`;
  setData((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) }));
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) console.error(`Failed to remove PM ${kind} schedule notice:`, error);
};

const checkPreventiveMaintenance = async (asset) => {

    const service = PM_SERVICES[asset.currentService];

    if (!service) return;

    const meterTarget = (asset.lastServiceMeter || 0) + service.meter;
    const meterRemaining = meterTarget - (asset.meterReading || 0);

    const daysPassed =
        Math.floor(
            (new Date() - new Date(asset.lastServiceDate)) /
            (1000 * 60 * 60 * 24)
        );
    const daysRemaining = service.days - daysPassed;

    const meterDue = meterRemaining <= 0;
    const dayDue = daysRemaining <= 0;

    if (meterDue || dayDue) {
        // Past the threshold: raise the "due now" notice + auto-create the
        // work order (createPreventiveWorkOrder itself guards against
        // creating a second one if one's already open).
        await createPreventiveWorkOrder(asset);
        return;
    }

    const meterUpcoming = meterRemaining > 0 && meterRemaining <= PM_UPCOMING_METER_WINDOW;
    const dayUpcoming = daysRemaining > 0 && daysRemaining <= PM_UPCOMING_DAYS_WINDOW;

    if (meterUpcoming || dayUpcoming) {
        // Within the window but not there yet: just raise an "upcoming
        // service" notice — no work order yet.
        await upsertPmScheduleNotice(asset, service, { kind: "upcoming", remaining: meterRemaining });
    }

};

// Shift-start: the odometer a "User" enters belongs to a specific machine,
// so this feeds it straight into that asset's real meter reading (via
// saveMeterReading, which also runs the PM due-check above) instead of
// just logging a number nobody uses.
const handleShiftStart = async ({ assetId, odometer, fuel, notes }) => {
  const reading = Number(odometer);
  if (assetId && !Number.isNaN(reading)) {
    await saveMeterReading(assetId, reading, {
      fuelLevel: fuel,
      shiftNotes: notes,
      loggedBy: profile.name,
    });
  }

  // Best-effort copy on the user's own profile row too.
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        last_odometer: odometer,
        last_fuel_level: fuel,
        last_shift_notes: notes,
        last_shift_started_at: new Date().toISOString(),
        last_shift_asset_id: assetId || null,
      })
      .eq("id", profile.id);
    if (error) console.error("Failed to save shift info to profile:", error);
  } catch (e) {
    console.error("Failed to save shift info to profile:", e);
  }

  setShiftStarted(true);
};

const createPreventiveWorkOrder = async (asset) => {

  const service = PM_SERVICES[asset.currentService] || PM_SERVICES.A;
  const serviceLabel = service.label || `Service ${asset.currentService}`;

  // Don't raise a second "due" work order for the same asset/position if
  // one's already open (e.g. meter reading saved twice while over the
  // threshold) — just refresh the schedule notice instead.
  const alreadyOpen = data.workorders.some(
    (w) =>
      w.assetId === asset.id &&
      w.maintenanceType === "Preventive" &&
      w.pmPosition === asset.currentService &&
      w.status !== "Completed"
  );
  if (alreadyOpen) {
    await upsertPmScheduleNotice(asset, service, { kind: "due", remaining: 0 });
    return;
  }

  const wo = {
    id: crypto.randomUUID(),
    woNumber: `PM-${Date.now()}`,
    title: `Preventive Maintenance – ${serviceLabel}`,
    description: `${serviceLabel} for ${asset.tag} (every 3 months / 5,000 km)`,
    assetId: asset.id,
    priority: "Medium",
    status: "Open",
    approvalStage: "issue_department_review",
    maintenanceType: "Preventive",
    pmPosition: asset.currentService,

    createdBy: "System",
    assignedTo: "Unassigned",

    createdDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],

    comments: [],
    // Pre-populated with the cumulative part checklist for this service
    // step, so the technician gets a ready-made list instead of a blank one.
    checklist: service.checklist.map((text) => ({ id: uid(), text, done: false })),
    materials: [],
    laborLog: [],
    attachments: [],

    activity: [
      {
        actor: "System",
        action: `${serviceLabel} created automatically (${service.checklist.length}-point checklist)`,
        timestamp: new Date().toISOString()
      }
    ]
  };

  // Update local state
  setData(d => ({
    ...d,
    workorders: [...d.workorders, wo]
  }));

  // Save to Supabase
  const { error } = await supabase
    .from("work_orders")
    .upsert({
      id: wo.id,
      data: wo,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(error);
  } else {
    console.log("PM Work Order Created");
  }

  // Flip the Maintenance Schedule notice from "upcoming" to "due now" —
  // this is also what the admin notification bell picks up.
  await upsertPmScheduleNotice(asset, service, { kind: "due", remaining: 0 });
  await removePmScheduleNotice(asset.id, "upcoming");
};



  const now = () => new Date().toISOString();

  // Attachments
  const addAttachment = (woId, attachment) => {
    if (!attachment.name.trim()) return;
    patchWorkOrder(
      woId,
      (wo) => ({ attachments: [...(wo.attachments || []), attachment] }),
      { action: "Attachment uploaded", actor: profile.name, timestamp: now() }
    );
  };
  const removeAttachment = (woId, index) => {
    patchWorkOrder(woId, (wo) => ({ attachments: (wo.attachments || []).filter((_, i) => i !== index) }));
  };

  // Checklist
  const addChecklistItem = (woId, text) => {
    if (!text.trim()) return;
    patchWorkOrder(woId, (wo) => ({ checklist: [...(wo.checklist || []), { id: uid(), text: text.trim(), done: false }] }));
  };
  const toggleChecklistItem = (woId, itemId) => {
    patchWorkOrder(woId, (wo) => ({
      checklist: (wo.checklist || []).map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    }));
  };
  const removeChecklistItem = (woId, itemId) => {
    patchWorkOrder(woId, (wo) => ({ checklist: (wo.checklist || []).filter((item) => item.id !== itemId) }));
  };

  // Technician labor log
const addLaborEntry = async (woId, technician, hours) => {
  const h = parseFloat(hours);

  if (!technician || isNaN(h) || h <= 0) return;

  const worker = workers.find(
    w => w.personnel_number === technician
  );

  const wo = data.workorders.find((w) => w.id === woId);
  if (!wo) return;

  const existingLog = wo.laborLog || [];
  const existingIndex = existingLog.findIndex(
    (entry) => entry.technician === technician
  );

  let laborLog;
  let totalHoursForTechnician;
  if (existingIndex !== -1) {
    // Same technician already has a row — add to it instead of
    // creating a duplicate row.
    totalHoursForTechnician = (parseFloat(existingLog[existingIndex].hours) || 0) + h;
    laborLog = existingLog.map((entry, i) =>
      i === existingIndex ? { ...entry, hours: totalHoursForTechnician } : entry
    );
  } else {
    // New technician — add a new row below the existing ones.
    totalHoursForTechnician = h;
    laborLog = [
      ...existingLog,
      { technician, technicianName: worker?.worker_name, hours: h },
    ];
  }

  await patchWorkOrder(
    woId,
    () => ({ laborLog }),
    {
      action: `Logged ${h}h for ${worker?.worker_name || technician}`,
      actor: profile.name,
      timestamp: now(),
    }
  );

  // Push the technician's updated TOTAL hours to the BC schedule line.
  // Only do this if `technician` actually resolves to a real worker
  // record — things like the "Unassigned" placeholder value are not a
  // valid BC PersonnelNumber and would just fail on BC's side.
  if (!worker) {
    console.warn(
      `Skipping BC hours sync — "${technician}" is not a recognized worker (no matching personnel_number).`
    );
    return;
  }

  if (!wo.bcWorkOrderId) {
    console.warn("Skipping BC hours sync — this work order has no bcWorkOrderId yet.");
    return;
  }

  // Push this hours entry to BC as a new Sales Line (Type: "Resource",
  // No: the technician's BC Resource No.) on the order already created
  // for this work order. This is a plain HTTP call to the local NTLM
  // sync service (see bc-local-sync's /sync-labor-to-bc), not a
  // Supabase Edge Function — same reason as the work-order sync above.
  // Every Add appends a new line, so logging hours more than once (same
  // or different technician) builds up multiple Resource lines on the
  // order instead of overwriting the last one.
  try {
    const res = await fetch(`${LOCAL_SYNC_URL}/sync-labor-to-bc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentNo: wo.bcWorkOrderId,
        resourceNo: technician,
        hours: h,
        description: `Labor - ${worker?.worker_name || technician}`,
      }),
    });
    const syncResult = await res.json();

    if (!res.ok || !syncResult?.success) {
      const detail = syncResult?.error || `HTTP ${res.status}`;
      console.error("BC labor sync failed:", detail);
      patchWorkOrder(woId, () => ({}), {
        action: `BC labor sync failed: ${detail}`,
        actor: "System",
        timestamp: now(),
      });
    } else {
      patchWorkOrder(woId, () => ({}), {
        action: `Logged ${h}h to BC (line ${syncResult.lineNo}) for ${worker?.worker_name || technician}`,
        actor: "System",
        timestamp: now(),
      });
    }
  } catch (err) {
    console.error("BC labor sync threw an error:", err);
    patchWorkOrder(woId, () => ({}), {
      action: `BC labor sync threw an error: ${err.message || err}. Is bc-local-sync running?`,
      actor: "System",
      timestamp: now(),
    });
  }
};

// Separate, independent action: push an hours entry to BC's Work order
// journals ("Hours" grid / JournalTrans) — does not touch the schedule
// line or the local labor log table at all. Triggered by its own "Post"
// button, distinct from "Add" above.
const postLaborToJournal = async (woId, technician, hours) => {
  const h = parseFloat(hours);
  if (!technician || isNaN(h) || h <= 0) return;

  const worker = workers.find((w) => w.personnel_number === technician);
  if (!worker) {
    console.warn(
      `Skipping BC journal post — "${technician}" is not a recognized worker (no matching personnel_number).`
    );
    return;
  }

  const wo = data.workorders.find((w) => w.id === woId);
  if (!wo) return;

  if (!wo.bcWorkOrderId) {
    console.warn("Skipping BC journal post — this work order has no bcWorkOrderId yet.");
    return;
  }

  try {
    const { data: journalResult, error: journalError } = await supabase.functions.invoke(
      "sync-hours-to-journal",
      {
        body: {
          workOrderId: wo.bcWorkOrderId,
          personnelNumber: technician,
          hours: h,
        },
      }
    );

    if (journalError) {
      const detail = await describeFunctionError(journalError);
      console.error("BC journal sync failed:", detail, journalError);
      patchWorkOrder(woId, () => ({}), {
        action: `BC journal sync failed: ${detail}`,
        actor: "System",
        timestamp: now(),
      });
    } else {
      console.log("BC journal sync result:", journalResult);
      patchWorkOrder(woId, () => ({}), {
        action: `Posted ${h}h to BC journal for ${worker?.worker_name || technician}`,
        actor: profile.name,
        timestamp: now(),
      });
    }
  } catch (err) {
    console.error("BC journal sync threw an error:", err);
    patchWorkOrder(woId, () => ({}), {
      action: `BC journal sync threw an error: ${err.message || err}`,
      actor: "System",
      timestamp: now(),
    });
  }
};

  const removeLaborEntry = (woId, index) => {
    patchWorkOrder(woId, (wo) => ({ laborLog: (wo.laborLog || []).filter((_, i) => i !== index) }));
  };

  // Material consumption
  const addMaterial = async (woId, item, qty) => {
    const q = parseFloat(qty);
    const itemId = item.trim();
    if (!itemId || isNaN(q) || q <= 0) return;

    const bcItem = items.find((i) => i.item_id === itemId);
    const itemLabel = bcItem?.product_name || itemId;

    await patchWorkOrder(
      woId,
      (wo) => ({ materials: [...(wo.materials || []), { item: itemId, qty: q }] }),
      { action: `Consumed ${q} × ${itemLabel}`, actor: profile.name, timestamp: now() }
    );

    // Push this material usage to BC as a new Sales Line (Type: "Item",
    // No: the BC Item No.) on the order already created for this work
    // order — same pattern as the Resource lines for technician hours.
    const wo = data.workorders.find((w) => w.id === woId);
    if (!wo?.bcWorkOrderId) {
      console.warn("Skipping BC material sync — this work order has no bcWorkOrderId yet.");
      return;
    }

    try {
      const res = await fetch(`${LOCAL_SYNC_URL}/sync-material-to-bc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNo: wo.bcWorkOrderId,
          itemNo: itemId,
          quantity: q,
          description: itemLabel,
        }),
      });
      const syncResult = await res.json();

      if (!res.ok || !syncResult?.success) {
        const detail = syncResult?.error || `HTTP ${res.status}`;
        console.error("BC material sync failed:", detail);
        patchWorkOrder(woId, () => ({}), {
          action: `BC material sync failed: ${detail}`,
          actor: "System",
          timestamp: now(),
        });
      } else {
        patchWorkOrder(woId, () => ({}), {
          action: `Logged ${q} × ${itemLabel} to BC (line ${syncResult.lineNo})`,
          actor: "System",
          timestamp: now(),
        });
      }
    } catch (err) {
      console.error("BC material sync threw an error:", err);
      patchWorkOrder(woId, () => ({}), {
        action: `BC material sync threw an error: ${err.message || err}. Is bc-local-sync running?`,
        actor: "System",
        timestamp: now(),
      });
    }
  };
  const removeMaterial = (woId, index) => {
    patchWorkOrder(woId, (wo) => ({ materials: (wo.materials || []).filter((_, i) => i !== index) }));
  };

  // Expense
const addExpense = (woId, expense) => {
  const amount = parseFloat(expense.amount);

  if (!expense.category || isNaN(amount) || amount <= 0) {
    return;
  }

  patchWorkOrder(
    woId,
    (wo) => ({
      expenses: [
        ...(wo.expenses || []),
        {
          id: uid(),
          category: expense.category,
          amount,
          date: expense.date,
          description: expense.description || "",
        },
      ],
    }),
    {
      action: `Added expense: ${expense.category} - ${amount.toFixed(2)}`,
      actor: profile.name,
      timestamp: now(),
    }
  );
};

  // Issue reporting & the manager -> issue department -> issue manager approval chain
  const reportIssue = async (assetId, title, description) => {
    if (!title.trim()) return;
    const existingCount = data.workorders.filter((w) => w.reportNumber || w.woNumber).length;
    const wo = {
      id: uid(),
      reportNumber: `REQ-${String(1 + existingCount).padStart(4, "0")}`,
      woNumber: null,
      assetId,
      title: title.trim(),
      description: description.trim(),
      priority: "Medium",
      status: "Open",
      assignedTo: "Unassigned",
      createdDate: today(),
      dueDate: today(),
      createdBy: profile.name,
      approvalStage: "manager_review",
      maintenanceType: "Corrective",
      comments: [],
      attachments: [],
      checklist: [],
      laborLog: [],
      materials: [],
      activity: [{ action: `Issue reported by ${profile.name}`, actor: profile.name, timestamp: now() }],
    };
    setData((d) => ({ ...d, workorders: [wo, ...d.workorders] }));
    const { error } = await supabase.from("work_orders").upsert({ id: wo.id, data: wo, updated_at: new Date().toISOString() });
    if (error) console.error("Failed to save issue report to Supabase:", error);
  };

  // PATCH FOR App.jsx — advanceApproval function
//
// This replaces your existing advanceApproval function. The only
// addition is: right after the Manager's approval successfully creates
// the local work order (next === "user_completion"), it also calls the
// new Supabase Edge Function to create a matching header in BC, then
// stores the returned BC Work Order ID back onto the local record so
// you always know which BC record it maps to.

const advanceApproval = async (woId) => {
  const woBefore = data.workorders.find((w) => w.id === woId);
  const nextBefore = woBefore ? getNextStage(woBefore) : null;

  await patchWorkOrder(
    woId,
    (wo) => {
      const next = getNextStage(wo);
      if (!next) return {};
      const patch = { approvalStage: next };
      if (next === "user_completion" && !wo.woNumber) {
        const existingWOCount = data.workorders.filter((w) => w.woNumber).length;
        patch.woNumber = `WO-${String(143 + existingWOCount).padStart(4, "0")}`;
      }
      if (next === "closed") {
        patch.assignedTo = profile.name;
        patch.status = "Completed";
      }
      return patch;
    },
    (wo) => {
      const next = getNextStage(wo);
      if (!next) return null;
      const msg = TRANSITION_MESSAGE[next];
      return {
        action: msg ? msg(profile.name) : `Moved to ${APPROVAL_STAGE_LABELS[next] || next}`,
        actor: profile.name,
        timestamp: now(),
      };
    }
  );

  // PM asset-service-bump logic (unchanged from before)
  if (woBefore && nextBefore === "closed" && woBefore.maintenanceType === "Preventive") {
    const asset = data.assets.find((a) => a.id === woBefore.assetId);
    if (asset) {
      const service = PM_SERVICES[asset.currentService] || PM_SERVICES.A;
      const updatedAsset = {
        ...asset,
        lastServiceMeter: asset.meterReading ?? asset.lastServiceMeter ?? 0,
        lastServiceDate: new Date().toISOString(),
        currentService: service.next,
      };
      setData((d) => ({ ...d, assets: d.assets.map((a) => (a.id === asset.id ? updatedAsset : a)) }));
      const { error } = await supabase.from("assets_bc").upsert({ id: updatedAsset.id, data: updatedAsset, updated_at: new Date().toISOString() });
      if (error) console.error("Failed to update asset after PM completion:", error);
    }
  }

  // The moment Manager approves a breakdown report (transitioning into
  // "user_completion"), also create a Sales Order header in Business
  // Central (BC's /SalesOrdercard, used here as the work order header —
  // see bc-local-sync's /sync-workorder-to-bc). This is a plain HTTP call
  // to the local NTLM sync service, not a Supabase Edge Function — BC is
  // on-prem and NTLM-only, which Edge Functions can't authenticate against.
  if (woBefore && nextBefore === "user_completion" && woBefore.maintenanceType !== "Preventive") {
    const asset = data.assets.find((a) => a.id === woBefore.assetId);
    const bcAssetId = asset?.bcAssetId || asset?.bc_object_id || asset?.tag || null;

    try {
      const res = await fetch(`${LOCAL_SYNC_URL}/sync-workorder-to-bc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportNumber: woBefore.reportNumber,
          title: woBefore.title,
          description: woBefore.description,
          maintenanceType: woBefore.maintenanceType,
          bcAssetId,
          requestedBy: woBefore.createdBy,
        }),
      });
      const syncResult = await res.json();

      if (!res.ok || !syncResult?.success) {
        const detail = syncResult?.error || `HTTP ${res.status}`;
        console.error("BC sync failed:", detail);
        // Log it on the work order so it's visible in the app, but don't
        // block the local approval flow — BC sync failure shouldn't
        // stop the Manager's approval from going through.
        patchWorkOrder(woId, () => ({}), {
          action: `BC sync failed: ${detail}`,
          actor: "System",
          timestamp: now(),
        });
      } else {
        const lineNote = syncResult.lineCreated
          ? "with asset line"
          : `(no line: ${syncResult.lineError || "unknown reason"})`;
        patchWorkOrder(
          woId,
          () => ({
            bcWorkOrderId: syncResult.bcWorkOrderId,
            workOrderCreated: true,
            status: "Execution",
            approvalStage: "user_completion",
          }),
          {
            action: `BC Sales Order ${syncResult.bcWorkOrderId} created ${lineNote}`,
            actor: "System",
            timestamp: now(),
          }
        );
      }
    } catch (err) {
      console.error("BC sync threw an error:", err);
      patchWorkOrder(woId, () => ({}), {
        action: `BC sync threw an error: ${err.message || err}. Is bc-local-sync running?`,
        actor: "System",
        timestamp: now(),
      });
    }
  }
};


  const rejectApproval = (woId, reason) => {
    patchWorkOrder(
      woId,
      () => ({ approvalStage: "rejected" }),
      { action: `Rejected by ${ROLE_LABELS[role]} (${profile.name})${reason ? `: ${reason}` : ""}`, actor: profile.name, timestamp: now() }
    );
  };

  const updateUserAssetAccess = async (userId, assetTypes, seeAll) => {

  // Get user's email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (!profile) return;

  // Delete old assignments
  await supabase
    .from("asset_type_assignments")
    .delete()
    .eq("user_email", profile.email.toLowerCase().trim())

  // Insert new assignments
  if (assetTypes.length > 0) {

    const rows = assetTypes.map(type => ({
    user_email: profile.email.toLowerCase().trim(),
          asset_type: type,
      active: true,
      assigned_by: "Admin",   // <-- your logged in admin email
    }));

    await supabase
      .from("asset_type_assignments")
      .insert(rows);
  }

  // Update only See All flag
  await supabase
    .from("profiles")
    .update({
      see_all_assets: seeAll,
    })
    .eq("id", userId);

  if (onProfilesChanged)
    onProfilesChanged();
};

  const changeUserRole = async (userId, newRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) console.error("Failed to change role:", error);
    if (onProfilesChanged) onProfilesChanged();
  };

  const handleLogout = () => supabase.auth.signOut();

  const saveSchedule = async (s) => {
    setData((d) => {
      const exists = d.schedules.some((x) => x.id === s.id);
      return { ...d, schedules: exists ? d.schedules.map((x) => (x.id === s.id ? s : x)) : [...d.schedules, s] };
    });
    setSchedModal(null);
    const { error } = await supabase.from("schedules").upsert({ id: s.id, data: s, updated_at: new Date().toISOString() });
    if (error) console.error("Failed to save schedule item to Supabase:", error);
  };
  const deleteSchedule = async (id) => {
    setData((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) }));
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) console.error("Failed to delete schedule item in Supabase:", error);
  };

  const generateWOFromSchedule = async (s) => {
    const nextNum = 143 + data.workorders.length;
    const wo = {
      id: uid(),
      woNumber: `WO-${String(nextNum).padStart(4, "0")}`,
      assetId: s.assetId,
      title: s.taskName,
      priority: daysBetween(s.nextDue) < 0 ? "High" : "Medium",
      status: "Open",
      assignedTo: "Unassigned",
      createdDate: today(),
      dueDate: s.nextDue,
      activity: [
        { action: "Work order created", actor: profile.name, timestamp: new Date().toISOString() },
        { action: `Generated from scheduled task "${s.taskName}"`, actor: "System", timestamp: new Date().toISOString() },
      ],
    };
    setData((d) => ({ ...d, workorders: [wo, ...d.workorders] }));
    setTab("workorders");
    const { error } = await supabase.from("work_orders").upsert({ id: wo.id, data: wo, updated_at: new Date().toISOString() });
    if (error) console.error("Failed to save generated work order to Supabase:", error);
  };

  const NAV_ALL = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
    { id: "assets", label: "Asset register", icon: Boxes, roles: ["admin"] },
    { id: "workorders", label: "Work orders", icon: ClipboardList, roles: ["admin"] },
    { id: "schedule", label: "Maintenance schedule", icon: CalendarClock, roles: ["admin"] },
    { id: "myassets", label: "My assets", icon: Boxes, roles: ["user"] },
    { id: "approvals", label: "Approvals", icon: Send, roles: ["manager", "issue_department", "issue_manager", "technician", "admin"] },
    { id: "team", label: "Team", icon: UserCog, roles: ["admin"] },
    { id: "profile", label: "Profile", icon: User, roles: ROLES },
    { id: "schedule", label: "Maintenance schedule", icon: CalendarClock, roles: ["admin"] },
    {id: "meter",label: "Meter Readings",icon: Gauge,roles: ["admin"] },
    {id: "inventory",label: "Inventory",icon: Boxes,roles: ["admin"] },
  ];
  const NAV = NAV_ALL.filter((n) => n.roles.includes(role));

  // "User" accounts pick the machine they're starting their shift on and
  // log its odometer before reaching the dashboard below — the reading
  // feeds straight into that asset's real meter and the PM due-check.
  if (role === "user" && !shiftStarted) {
    return (
      <ShiftStartScreen
        profile={profile}
        assets={myVisibleAssets}
        onStart={handleShiftStart}
      />
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: COLORS.bg, color: COLORS.bone, minHeight: "100vh", display: "flex" }}>
      <style>{FONTS}</style>
      {/* Sidebar */}
      <div style={{ width: 236, flexShrink: 0, background: COLORS.panel, borderRight: `1px solid ${COLORS.line}`, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px 24px" }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(155deg, ${COLORS.steelLight} 0%, ${COLORS.steel} 60%, ${COLORS.steelDim} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px -4px ${COLORS.glow}`,
            }}
          >
            <Wrench size={17} color="#0B0E12" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 17, fontWeight: 600, letterSpacing: 0.4, color: COLORS.bone, lineHeight: 1.15 }}>DynaAsset 365</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: COLORS.ashDim, letterSpacing: 1.3, marginTop: 2 }}>ASSET MAINTENANCE</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((n) => {
            const active = tab === n.id;
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                className="nav-item"
                onClick={() => setTab(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9.5px 12px",
                  background: active ? `linear-gradient(90deg, ${COLORS.steelDim} 0%, ${COLORS.panelAlt} 100%)` : "transparent",
                  border: "none", borderLeft: active ? `2px solid ${COLORS.steelLight}` : "2px solid transparent",
                  color: active ? COLORS.bone : COLORS.ash, cursor: "pointer", textAlign: "left",
                  fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: active ? 600 : 500, borderRadius: "0 6px 6px 0",
                }}
              >
                <Icon size={16} strokeWidth={2} color={active ? COLORS.steelLight : undefined} />
                {n.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: "auto" }}>
          <div
            className="nav-item"
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6,
              borderTop: `1px solid ${COLORS.line}`, marginBottom: 6, cursor: "pointer",
            }}
            onClick={() => setTab("profile")}
          >
            <div style={{
              width: 31, height: 31, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(155deg, ${COLORS.steelLight}, ${COLORS.steel})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12.5, fontWeight: 700, color: "#0B0E12",
              boxShadow: `0 0 0 2px ${COLORS.panel}, 0 0 0 3px ${COLORS.steelDim}`,
            }}>
              {(profile.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.bone, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</div>
              <div style={{ fontSize: 11, color: COLORS.steelLight }}>{ROLE_LABELS[role]}</div>
            </div>
          </div>
          <button
            className="btn-ghost"
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
              background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 6,
              color: COLORS.ashDim, cursor: "pointer", fontSize: 12.5, fontFamily: "Inter, sans-serif",
            }}
          >
            <LogOut size={14} /> Log out
          </button>
          <div style={{ padding: "12px 10px 0", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: COLORS.ashDim, letterSpacing: 0.8, lineHeight: 1.7 }}>
            GEMFIELDS GROUP · v1.0
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/*Top Navigation */}
        <div
          style={{
            height: 68,
            flexShrink: 0,
            background: COLORS.panel,
            borderBottom: `1px solid ${COLORS.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 30px",
          }}
        >
          {/* Search */}
          <div
            style={{
              width: 350,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: COLORS.bg,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 7,
              padding: "9px 14px",
            }}
          >
            <Search size={15} color={COLORS.ashDim} />

            <input
              placeholder="Search assets, work orders…"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: COLORS.bone,
                fontSize: 13,
              }}
            />
          </div>

          {/* Right Side */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ position: "relative" }}>
              <button
                className="btn-ghost"
                onClick={() => setNotifOpen((v) => !v)}
                style={{
                  width: 34, height: 34, borderRadius: 7,
                  background: "transparent",
                  border: `1px solid ${COLORS.line}`,
                  color: COLORS.ash,
                  cursor: "pointer",
                  position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Bell size={16} strokeWidth={2} />
                {maintenanceNotifications.length > 0 && (
                  <span
                    style={{
                      position: "absolute", top: -5, right: -5,
                      background: COLORS.alert, color: "#fff", borderRadius: "50%",
                      fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", fontFamily: "Inter, sans-serif",
                      boxShadow: `0 0 0 2px ${COLORS.panel}`,
                    }}
                  >
                    {maintenanceNotifications.length > 9 ? "9+" : maintenanceNotifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    onClick={() => setNotifOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 199 }}
                  />
                  <div
                    style={{
                      position: "absolute", top: 34, right: 0, width: 320, maxHeight: 380, overflowY: "auto",
                      background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8,
                      boxShadow: "0 12px 32px rgba(0,0,0,0.5)", zIndex: 200,
                    }}
                  >
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 12.5, fontWeight: 600, color: COLORS.bone }}>
                      Maintenance notifications
                    </div>
                    {role !== "admin" ? (
                      <div style={{ padding: 20, textAlign: "center", color: COLORS.ashDim, fontSize: 12.5 }}>
                        Nothing to show here.
                      </div>
                    ) : maintenanceNotifications.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: COLORS.ashDim, fontSize: 12.5 }}>
                        No upcoming or overdue maintenance. All clear.
                      </div>
                    ) : (
                      maintenanceNotifications.map((n, i) => (
                        <div
                          key={n.id}
                          onClick={() => { setTab("schedule"); setNotifOpen(false); }}
                          style={{
                            padding: "12px 16px", cursor: "pointer",
                            borderBottom: i < maintenanceNotifications.length - 1 ? `1px solid ${COLORS.line}` : "none",
                            borderLeft: `3px solid ${n.type === "overdue" ? COLORS.alert : COLORS.ore}`,
                          }}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.bone }}>{n.taskName}</div>
                          <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginTop: 2 }}>{n.assetTag} · {n.assetName}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4, color: n.type === "overdue" ? COLORS.alert : COLORS.ore }}>
                            {n.type === "overdue" ? `Overdue by ${Math.abs(n.days)} day${Math.abs(n.days) === 1 ? "" : "s"}` : `Due soon — in ${n.days} day${n.days === 1 ? "" : "s"}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div

              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: COLORS.steel,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#0E1013",
                }}
              >
                {(profile.name || "?").slice(0, 1).toUpperCase()}
              </div>

              <div>
                <div style={{ fontWeight: 600 }}>{profile.name}</div>
                <div style={{ fontSize: 11, color: COLORS.ashDim }}>
                  {ROLE_LABELS[role]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px",
            background: COLORS.bg,
          }}
        >
          {loadError && (
            <div
              style={{
                background: "#3A2620",
                border: `1px solid ${COLORS.alert}`,
                color: COLORS.bone,
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 12.5,
                marginBottom: 20,
              }}
            >
              ⚠ Supabase connection issue: {loadError}
            </div>
          )}
          {tab === "dashboard" && (
            <Dashboard
              data={data}
              assetById={assetById}
              setTab={setTab}
            />
          )}

          {tab === "assets" && (
            <AssetRegister
              isAdmin={role === "admin"}
              assets={myVisibleAssets}
              query={query}
              setQuery={setQuery}
              onAdd={() =>
                setAssetModal({
                  id: uid(),
                  tag: "",
                  name: "",
                  type: "",
                  location: "",
                  status: "Operational",
                  criticality: "Medium",
                })
              }
              onEdit={(a) => setAssetModal(a)}
              onDelete={deleteAsset}
              onView={(a) => setSelectedAsset(a)}
            />
          )}

          {tab === "workorders" && (
    <WorkOrders
      workorders={data.workorders}
      assets={myVisibleAssets}
      assetById={assetById}
      onAdd={() => 
        setWoModal({
          id: uid(),
          woNumber: `WO-${String(143 + data.workorders.length).padStart(4, "0")}`,
          assetId: data.assets[0]?.id || "",
          title: "",
          priority: "Medium",
          status: "Open",
          assignedTo: "",
          createdDate: today(),
          dueDate: today(),
          workType: "Preventive Maintenance",
          estimatedHours: "",
          estimatedCost: "",
          riskLevel: "Medium",
          description: "",
          partsRequired: "",
          remarks: "",
          comments: [],
          attachments: [],
          checklist: [],
          materials: [],
          laborLog: [],
        })
      }
      onEdit={(w) => setWoModal(w)}
      onDelete={deleteWO}
      onStatusChange={(w, status) => saveWO({ ...w, status })}
      onView={(w) => setSelectedWO(w)}
    />
  )}

  {tab === "inventory" && selectedPart && (

  <div style={{ padding: 30 }}>

    {/* Back Button */}
      <button
        onClick={() => setSelectedPart(null)}
        style={{
          marginBottom: 20,
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "10px 18px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ← Back to Inventory
      </button>

      {/* Header */}
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: 25,
            marginBottom: 25,
          }}
        >
        <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

      <div>

        <div
          style={{
            color: COLORS.ash,
            fontSize: 14,
          }}
        >
          Spare Part
        </div>

        <div
          style={{
            color: COLORS.bone,
            fontSize: 34,
            fontWeight: 700,
            marginTop: 6,
          }}
        >
          {selectedPart.description}
        </div>

        <div
          style={{
            color: COLORS.ash,
            marginTop: 8,
            fontSize: 18,
          }}
        >
          Part No : {selectedPart.partNumber}
        </div>

      </div>

      <div
        style={{
          padding: "8px 18px",
          borderRadius: 30,
          background:
            selectedPart.availableQty <= 0
              ? "#7f1d1d"
              : selectedPart.availableQty <= selectedPart.reorderLevel
              ? "#78350f"
              : "#14532d",
          color: "white",
          ontWeight: 600,
        }}
      >
        {selectedPart.availableQty <= 0
          ? "Out of Stock"
          : selectedPart.availableQty <= selectedPart.reorderLevel
          ? "Low Stock"
          : "Available"}
  </div>

</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          marginBottom: 25,
        }}
      >

        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ color: COLORS.ash }}>Warehouse</div>
          <div
            style={{
              color: COLORS.bone,
              fontSize: 22,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {selectedPart.warehouse}
          </div>
        </div>

        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ color: COLORS.ash }}>Location</div>
            <div
              style={{
                color: COLORS.bone,
                fontSize: 22,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {selectedPart.location}
            </div>
          </div>

          <div
            style={{
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
          <div style={{ color: COLORS.ash }}>Available Qty</div>
            <div
              style={{
                color: "#22c55e",
                fontSize: 26,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {selectedPart.availableQty}
            </div>
          </div>

          <div
            style={{
              background: COLORS.panel,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: COLORS.ash }}>Reserved Qty</div>
          <div
            style={{
              color: "#3b82f6",
              fontSize: 26,
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {selectedPart.reservedQty}
          </div>
        </div>

      </div>

    </div>

  )}

  {tab === "inventory" && !selectedPart && (
    <div className="space-y-6">

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
          }}
        >
        <div>
          <h1
            style={{
              color: COLORS.bone,
              fontSize: 30,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Inventory Management
          </h1>

          <p
            style={{
              color: COLORS.ash,
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Manage spare parts, warehouses and inventory stock.
          </p>
        </div>

        <div
          style={{
            background: COLORS.panel,
            padding: "10px 18px",
            borderRadius: 8,
            border: `1px solid ${COLORS.line}`,
            color: COLORS.steelLight,
            fontWeight: 600,
          }}
        >
          {filteredInventory.length} Parts
        </div>
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 20,
        marginBottom: 25,
      }}
    >

      {/* Total Parts */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ color: COLORS.ash, fontSize: 13 }}>
          Total Parts
        </div>

        <div
          style={{
            color: COLORS.bone,
            fontSize: 30,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {totalParts}
        </div>
      </div>

      {/* Low Stock */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ color: COLORS.ash, fontSize: 13 }}>
          Low Stock
        </div>

        <div
          style={{
            color: COLORS.alert,
            fontSize: 30,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {lowStock}
        </div>
      </div>

      {/* Out of Stock */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ color: COLORS.ash, fontSize: 13 }}>
           Out of Stock
        </div>

        <div
          style={{
            color: "#ef4444",
            fontSize: 30,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {outOfStock}
        </div>

        <div
          style={{
            color: COLORS.ash,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          Critical Items
        </div>
      </div>

      {/* Reserved */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ color: COLORS.ash, fontSize: 13 }}>
          Reserved Parts
        </div>

        <div
          style={{
            color: COLORS.ore,
            fontSize: 30,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {reservedParts}
        </div>
      </div>

      {/* Inventory Value */}
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ color: COLORS.ash, fontSize: 13 }}>
          Inventory Value
        </div>

        <div
          style={{
            color: COLORS.steelLight,
            fontSize: 30,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          ${inventoryValue.toLocaleString()}
        </div>
      </div>

    </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >

          <input
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            placeholder="Search by Part Number or Description..."
            style={{
              width: 380,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #3f3f46",
              background: "#18181b",
              color: "white",
              outline: "none",
              fontSize: 14,
            }}
          />

        </div>

        <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">

          <table className="w-full">

            <thead className="bg-zinc-800">
              <tr>
                <th className="p-3 text-left">Part No</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Warehouse</th>
                <th className="p-3 text-center">Available</th>
                <th className="p-3 text-center">Reserved</th>
                <th className="p-3 text-center">Reorder</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-center">Location</th>
              </tr>
            </thead>

            <tbody>

              {filteredInventory.map((item) => (

              <tr
                  key={item.partNumber}
                  className="border-t border-zinc-800 hover:bg-zinc-800/40"
              >
                <td className="p-3 font-semibold">{item.partNumber}</td>

                <td className="p-3">{item.description}</td>

                <td className="p-3">{item.warehouse}</td>

                <td className="p-3 text-center">{item.availableQty}</td>

                <td className="p-3 text-center">{item.reservedQty}</td>

                <td className="p-3 text-center">{item.reorderLevel}</td>

                <td className="p-3 text-center">
                  {item.availableQty <= 0 ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: "#7f1d1d",
                        color: "#fecaca",
                      }}
                    >
                      Out of Stock
                    </span>
                  ) : item.availableQty <= item.reorderLevel ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: "#78350f",
                        color: "#fde68a",
                      }}
                    >
                      Low Stock
                    </span>
                  ) : (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: "#14532d",
                        color: "#bbf7d0",
                      }}
                    >
                      Available
                    </span>
                  )}
                </td>

                  <td className="p-3">{item.vendor}</td>

                    <td className="p-3">{item.location}</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">

                        <button
                          onClick={() => setSelectedPart(item)}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          View
                        </button>

                        <button
                          className="px-3 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black text-xs"
                        >
                          Edit
                        </button>

                      </div>
                    </td>
                  </tr>

          ))}

          </tbody>

        </table>

      </div>

      {selectedPart && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-end z-50"
          onClick={() => setSelectedPart(null)}
        >
          <div
            className="w-[420px] h-full bg-zinc-900 border-l border-zinc-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Spare Part Details
              </h2>

              <button
                onClick={() => setSelectedPart(null)}
                className="text-zinc-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">

            <div>
              <p className="text-zinc-400 text-sm">Part Number</p>
              <p className="text-white font-semibold">{selectedPart.partNumber}</p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Description</p>
              <p className="text-white">{selectedPart.description}</p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Warehouse</p>
              <p className="text-white">{selectedPart.warehouse}</p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Available Qty</p>
              <p className="text-green-400 text-xl font-bold">
                {selectedPart.availableQty}
              </p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Reserved Qty</p>
              <p className="text-blue-400 text-xl font-bold">
                {selectedPart.reservedQty}
              </p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Vendor</p>
              <p className="text-white">{selectedPart.vendor}</p>
            </div>

            <div>
              <p className="text-zinc-400 text-sm">Location</p>
              <p className="text-white">{selectedPart.location}</p>
            </div>

          </div>
        </div>
      </div>
    )}


    </div>
  )}

  {tab === "schedule" && (
    <MaintenanceSchedule
      schedules={data.schedules}
      assets={myVisibleAssets}
      assetById={assetById}
      onAdd={() =>
        setSchedModal({
          id: uid(),
          assetId: data.assets[0]?.id || "",
          taskName: "",
          frequency: "Monthly",
          nextDue: today(),
        })
      }
      onEdit={(s) => setSchedModal(s)}
      onDelete={deleteSchedule}
      onGenerate={generateWOFromSchedule}
    />
  )}

  {tab === "meter" && (
    <MeterReadingPage
        assets={myVisibleAssets}
        onSave={saveMeterReading}
    />
  )}

  {tab === "myassets" && (
    <MyAssetsPage
      assets={myVisibleAssets}
      workorders={data.workorders}
      profile={profile}
      onViewAsset={(a) => setSelectedAsset(a)}
      onReportIssue={reportIssue}
      onViewWO={(w) => setSelectedWO(w)}
    />
  )}

  {tab === "approvals" && (
    <ApprovalsQueue
      workorders={data.workorders}
      assetById={assetById}
      role={role}
      onAdvance={advanceApproval}
      onReject={rejectApproval}
      onView={(w) => setSelectedWO(w)}
    />
  )}

  {tab === "team" && (
    <TeamPage
      profiles={profiles}
      onChangeRole={changeUserRole}
      onUpdateAssetAccess={updateUserAssetAccess}
      workers={workers}
      isAdmin={role === "admin"}
      onWorkersPulled={loadWorkers}
    />
  )}

  {tab === "profile" && (
    <ProfilePage
      profile={profile}
      role={role}
      assets={myVisibleAssets}
      onViewAsset={(a) => setSelectedAsset(a)}
    />
  )}
</div>
   

      </div>

      {assetModal && <AssetModal asset={assetModal} assets={myVisibleAssets} onSave={saveAsset} onClose={() => setAssetModal(null)} />}
      {woModal && <WOModal wo={woModal} assets={myVisibleAssets} workers={workers} onSave={saveWO} onClose={() => setWoModal(null)} />}
      {schedModal && <ScheduleModal sched={schedModal} assets={myVisibleAssets} onSave={saveSchedule} onClose={() => setSchedModal(null)} />}
      {selectedAsset && (<AssetDetailsModal asset={selectedAsset} assets={myVisibleAssets} workorders={data.workorders} onClose={() => setSelectedAsset(null)}/> )}
      {selectedWO && (<WorkOrderDetailsModal
        wo={data.workorders.find((w) => w.id === selectedWO.id) || selectedWO}
        assetById={assetById}
        profile={profile}
        isAdmin={role === "admin"}
        onItemsPulled={loadItems}
        onAddComment={addComment}
        onAddAttachment={addAttachment}
        onRemoveAttachment={removeAttachment}
        onAddChecklistItem={addChecklistItem}
        onToggleChecklistItem={toggleChecklistItem}
        onRemoveChecklistItem={removeChecklistItem}
        onAddLaborEntry={addLaborEntry}
        onPostLaborToJournal={postLaborToJournal}
        onAssignTechnician={assignTechnician}
        onRemoveLaborEntry={removeLaborEntry}
        onAddMaterial={addMaterial}
        onAddExpense={addExpense}
        workers={workers}
        bcItems={items}
        onRemoveMaterial={removeMaterial}
        onSubmitForApproval={advanceApproval}
        onClose={() => setSelectedWO(null)}
      />)}
    </div> 
  );
}

/* ---------- shared bits ---------- */

function PageHeader({ eyebrow, title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
      <div>
        {eyebrow && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <span style={{ width: 9, height: 2, background: COLORS.steel, borderRadius: 1 }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: COLORS.steelLight, letterSpacing: 1.2 }}>{eyebrow}</span>
          </div>
        )}
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 28, fontWeight: 600, color: COLORS.bone, letterSpacing: 0.2 }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 6, cursor: "pointer", border: "1px solid transparent" };
  const variants = {
    primary: { background: COLORS.steel, color: "#0B0E12", border: "1px solid transparent" },
    ghost: { background: "transparent", color: COLORS.ash, border: `1px solid ${COLORS.line}` },
    danger: { background: "transparent", color: COLORS.alert, border: `1px solid ${COLORS.line}` },
  };
  const classNames = { primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger" };
  return (
    <button className={classNames[variant]} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Tag({ text }) {
  return (
    <span style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
      padding: "3px 7px", border: `1px solid ${COLORS.line}`, borderRadius: 3, color: COLORS.steelLight,
      background: "#191C20", display: "inline-block",
    }}>{text}</span>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: meta.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 0 3px ${meta.color}26` }} />
      {meta.label}
    </span>
  );
}

function InfoCard({ title, value }) {
  return (
    <div
      style={{
        background: COLORS.panelAlt,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          color: COLORS.ashDim,
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: COLORS.bone,
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PriorityChip({ priority }) {
  const c = PRIORITY_META[priority] || COLORS.ash;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c, border: `1px solid ${c}55`, padding: "2px 7px", borderRadius: 3 }}>{priority}</span>
  );
}

const WO_STATUS_META = {
  Open: { color: COLORS.steelLight, label: "Open" },
  "In progress": { color: COLORS.ore, label: "In progress" },
  "On hold": { color: COLORS.alert, label: "On hold" },
  Completed: { color: COLORS.moss, label: "Completed" },
};

function WOStatusPill({ status }) {
  const meta = WO_STATUS_META[status] || { color: COLORS.ash, label: status || "Unknown" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: meta.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color }} />
      {meta.label}
    </span>
  );
}

// How many days a report has been sitting in its current stage,
// based on the most recent activity entry (each stage change logs one).
function daysSinceLastActivity(wo) {
  const activity = wo.activity || [];
  if (activity.length === 0) return null;
  const last = activity[activity.length - 1];
  if (!last.timestamp) return null;
  return Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000);
}

const STUCK_THRESHOLD_DAYS = 2;

function isReportStuck(wo) {
  if (!wo.approvalStage || wo.approvalStage === "closed" || wo.approvalStage === "rejected") return false;
  const days = daysSinceLastActivity(wo);
  return days !== null && days >= STUCK_THRESHOLD_DAYS;
}

const STAGE_ORDER_BREAKDOWN = ["manager_review", "user_completion", "issue_department_review", "issue_manager_review", "technician_assigned", "closed"];
const STAGE_ORDER_PM = ["issue_department_review", "technician_assigned", "closed"];
const STAGE_STEP_LABELS = {
  manager_review: "Manager",
  user_completion: "You: Add Details",
  issue_department_review: "Issue Dept",
  issue_manager_review: "Issue Manager",
  technician_assigned: "Technician",
  closed: "Closed",
};

function ApprovalStageTracker({ wo }) {
  if (!wo.approvalStage) return null;

  const stageOrder = wo.maintenanceType === "Preventive" ? STAGE_ORDER_PM : STAGE_ORDER_BREAKDOWN;
  const isRejected = wo.approvalStage === "rejected";
  const currentIndex = stageOrder.indexOf(wo.approvalStage);
  const days = daysSinceLastActivity(wo);
  const stuck = isReportStuck(wo);

  if (isRejected) {
    return (
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8, color: COLORS.alert, fontWeight: 600, fontSize: 13.5 }}>
        <X size={16} /> Rejected — chain stopped here
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {wo.maintenanceType === "Preventive" && (
        <div style={{ fontSize: 11, color: COLORS.ashDim, marginBottom: 10, letterSpacing: 0.3 }}>
          PREVENTIVE MAINTENANCE — SHORTER APPROVAL PATH
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {stageOrder.map((stage, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <React.Fragment key={stage}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 74 }}>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: done ? COLORS.moss : current ? (stuck ? COLORS.alert : COLORS.steel) : COLORS.panelAlt,
                    border: `1px solid ${done ? COLORS.moss : current ? (stuck ? COLORS.alert : COLORS.steel) : COLORS.line}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: done || current ? "#0E1013" : COLORS.ashDim, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10.5, color: current ? COLORS.bone : COLORS.ashDim, marginTop: 5, textAlign: "center", fontWeight: current ? 600 : 400, lineHeight: 1.3 }}>
                  {STAGE_STEP_LABELS[stage]}
                </div>
              </div>
              {i < stageOrder.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < currentIndex ? COLORS.moss : COLORS.line, marginTop: 10 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {stuck && (
        <div style={{ marginTop: 12, background: "#3A2620", border: `1px solid ${COLORS.alert}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: COLORS.bone, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} color={COLORS.alert} />
          Stuck at this stage for {days} day{days === 1 ? "" : "s"} — no action taken yet
        </div>
      )}
    </div>
  );
}

function getActivityMeta(action) {
  if (!action) return { Icon: Circle, color: COLORS.ash };
  if (action.startsWith("Work order created")) return { Icon: Circle, color: COLORS.moss };
  if (action.startsWith("Assigned to")) return { Icon: User, color: COLORS.steelLight };
  if (action.startsWith("Status changed to")) {
    const status = action.replace("Status changed to", "").trim();
    if (status === "Completed") return { Icon: CheckCircle2, color: COLORS.moss };
    const meta = WO_STATUS_META[status];
    return { Icon: Clock, color: meta ? meta.color : COLORS.ash };
  }
  if (action.startsWith("Priority changed to")) {
    const priority = action.replace("Priority changed to", "").trim();
    return { Icon: AlertCircle, color: PRIORITY_META[priority] || COLORS.ash };
  }
  if (action.startsWith("Comment added")) return { Icon: MessageSquare, color: COLORS.steelLight };
  if (action.startsWith("Consumed")) return { Icon: ClipboardList, color: COLORS.ore };
  if (action.startsWith("Generated from")) return { Icon: Wrench, color: COLORS.ash };
  return { Icon: Circle, color: COLORS.ash };
}

function Empty({ text }) {
  return <div style={{ padding: "40px 0", textAlign: "center", color: COLORS.ashDim, fontSize: 13 }}>{text}</div>;
}

/* ---------- Dashboard ---------- */

function Dashboard({ data, assetById, setTab }) {
  const statusCounts = { Operational: 0, "Under maintenance": 0, Down: 0, Idle: 0 };
  data.assets.forEach((a) => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
  const openWOs = data.workorders.filter((w) => w.status !== "Completed").length;
  const overdue = data.schedules.filter((s) => daysBetween(s.nextDue) < 0).length;
  const critical = data.assets.filter((a) => a.criticality === "Critical").length;
  const maxCount = Math.max(1, ...Object.values(statusCounts));

  const upcoming = [...data.schedules].sort((a, b) => daysBetween(a.nextDue) - daysBetween(b.nextDue)).slice(0, 5);

  return (
    <div>
      <PageHeader eyebrow="OVERVIEW" title="Fleet health dashboard" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total assets" value={data.assets.length} />
        <StatCard label="Open work orders" value={openWOs} accent={openWOs > 0 ? COLORS.ore : undefined} />
        <StatCard label="Overdue maintenance" value={overdue} accent={overdue > 0 ? COLORS.alert : undefined} />
        <StatCard label="Critical assets" value={critical} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.bone, marginBottom: 16 }}>Assets by status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 130, fontSize: 12.5 }}><StatusPill status={status} /></div>
                <div style={{ flex: 1, background: COLORS.panelAlt, borderRadius: 3, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${(count / maxCount) * 100}%`, height: "100%", background: STATUS_META[status]?.color || COLORS.steel, borderRadius: 3 }} />
                </div>
                <div style={{ width: 20, fontFamily: "JetBrains Mono, monospace", fontSize: 12.5, color: COLORS.ash, textAlign: "right" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.bone }}>Upcoming maintenance</div>
            <button onClick={() => setTab("schedule")} style={{ background: "none", border: "none", color: COLORS.steelLight, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          {upcoming.length === 0 ? <Empty text="No scheduled maintenance." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((s) => {
                const dd = daysBetween(s.nextDue);
                const asset = assetById[s.assetId];
                const urgent = dd < 0;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: COLORS.panelAlt, borderRadius: 4, borderLeft: `2px solid ${urgent ? COLORS.alert : COLORS.line}` }}>
                    <div>
                      <div style={{ fontSize: 12.5, color: COLORS.bone, fontWeight: 500 }}>{s.taskName}</div>
                      <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginTop: 2 }}>{asset ? asset.tag : "—"} · {asset ? asset.name : "Unknown asset"}</div>
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5, color: urgent ? COLORS.alert : COLORS.ash, whiteSpace: "nowrap" }}>
                      {urgent ? `${Math.abs(dd)}d overdue` : `in ${dd}d`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const barColor = accent || COLORS.steel;
  return (
    <div
      className="card-surface"
      style={{
        position: "relative",
        background: `linear-gradient(165deg, ${COLORS.panelAlt} 0%, ${COLORS.panel} 70%)`,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 8,
        padding: "17px 18px 16px",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: barColor, opacity: 0.8 }} />
      <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 9, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 32, fontWeight: 600, color: accent || COLORS.bone, letterSpacing: 0.2 }}>{value}</div>
    </div>
  );
}

/* ---------- Asset register ---------- */

function AssetRegister({
  isAdmin,
  assets,
  query,
  setQuery,
  onAdd,
  onEdit,
  onDelete,
  onView,
}) {
  const [pulling, setPulling] = useState(false);
  const [pullMsg, setPullMsg] = useState("");

  async function pullFromBc() {
    setPulling(true);
    setPullMsg("");
    try {
      const res = await fetch(`${LOCAL_SYNC_URL}/pull-assets`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Pull failed");
      setPullMsg(`Pulled ${body.totalFromBC} assets from Business Central.`);
    } catch (err) {
      setPullMsg(`Could not pull from Business Central: ${err.message}. Is bc-local-sync running?`);
    }
    setPulling(false);
  }

  const filtered = assets.filter((a) =>
    (a.tag + a.name + a.location)
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        eyebrow="ASSET REGISTER"
        title="Fixed and mobile plant"
        action={
          isAdmin ? (
            <Btn onClick={pullFromBc} style={{ opacity: pulling ? 0.6 : 1 }}>
              {pulling ? "Pulling from Business Central…" : "Pull from Business Central"}
            </Btn>
          ) : null
        }
      />
      {pullMsg && (
        <div style={{ marginBottom: 14, fontSize: 13, color: pullMsg.startsWith("Pulled") ? COLORS.moss : COLORS.alert }}>
          {pullMsg}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 7,
          padding: "9px 13px",
          maxWidth: 320,
        }}
      >
        <Search size={15} color={COLORS.ashDim} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets…"
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: COLORS.bone,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            width: "100%",
          }}
        />
      </div>

      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "120px 1.4fr 140px 1.2fr 150px 100px 90px",
            padding: "11px 16px",
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.ashDim,
            letterSpacing: 0.5,
            borderBottom: `1px solid ${COLORS.line}`,
            background: COLORS.panelAlt,
          }}
        >
          <div>TAG</div>
          <div>NAME</div>
          <div>TYPE</div>
          <div>LOCATION</div>
          <div>STATUS</div>
          <div>CRITICALITY</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <Empty text="No assets match your search." />
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="table-row"
              onClick={() => {
              if (onView) onView(a);
            }}
              style={{
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns:
                  "120px 1.4fr 140px 1.2fr 150px 100px 90px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom: `1px solid ${COLORS.line}`,
                fontSize: 13,
              }}
            >
              <Tag text={a.bc_object_id} />

              <div
                style={{
                  color: COLORS.bone,
                  fontWeight: 500,
                }}
              >
                {a.asset_name}
              </div>

              <div style={{ color: COLORS.ash }}>{a.object_type}</div>

              <div
                style={{
                  color: COLORS.ash,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MapPin size={12} color={COLORS.ashDim} />
                {a.functional_location}
              </div>

              <StatusPill status={a.lifecycle_state} />

              <div
                style={{
                  color:
                    a.criticality === "Critical"
                      ? COLORS.alert
                      : COLORS.ash,
                  fontSize: 12.5,
                }}
              >
                {a.criticality}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  justifyContent: "flex-end",
                }}
              >
                
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 4, padding: 6, color: COLORS.ashDim, cursor: "pointer", display: "flex" }}>
      {children}
    </button>
  );
}

/* ---------- Work orders (kanban) ---------- */

const WO_COLUMN_META = {
  "Open": { color: COLORS.steelLight },
  "In progress": { color: COLORS.ore },
  "On hold": { color: COLORS.ash },
  "Completed": { color: COLORS.moss },
};

function WorkOrders({ workorders, assetById, onAdd, onEdit, onDelete, onStatusChange, onView}) {
  return (
    <div>
      <PageHeader eyebrow="WORK ORDERS" title="Active and completed work" action={<Btn onClick={onAdd}><Plus size={14} /> New work order</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {WO_COLUMNS.map((col) => {
          const items = workorders.filter((w) => w.status === col);
          const colColor = WO_COLUMN_META[col]?.color || COLORS.ash;
          return (
            <div key={col}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 12px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: colColor, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: COLORS.bone, fontWeight: 600, letterSpacing: 0.3 }}>{col}</span>
                <span style={{
                  marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: COLORS.ashDim,
                  background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "1px 7px",
                }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 40 }}>
                {items.map((w) => {
                  const asset = assetById[w.assetId];
                  return (
                    <div
                      key={w.id}
                      className="kanban-card"
                      onClick={() => onView(w)}
                      style={{
                        position: "relative",
                        background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8,
                        padding: "13px 13px 13px 15px", cursor: "pointer", overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: colColor }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: COLORS.steelLight }}>{(w.woNumber || w.reportNumber)}</span>
                        <PriorityChip priority={w.priority} />
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.bone, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>{w.title}</div>
                      <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 10 }}>{asset ? `${asset.tag} · ${asset.name}` : "Unlinked asset"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: COLORS.ash }}>{w.assignedTo || "Unassigned"}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <IconBtn onClick={(e) => { e.stopPropagation(); onEdit(w); }}><Pencil size={13} /></IconBtn>
                          <IconBtn onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}><Trash2 size={13} /></IconBtn>
                        </div>
                      </div>
                      {col !== "Completed" && (
                        <select
                          value={w.status}
                          onChange={(e) => onStatusChange(w, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginTop: 10, width: "100%", background: COLORS.panelAlt, color: COLORS.ash, border: `1px solid ${COLORS.line}`, borderRadius: 5, fontSize: 11.5, padding: "6px 8px", fontFamily: "Inter, sans-serif" }}
                        >
                          {WO_COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && <div style={{ border: `1px dashed ${COLORS.line}`, borderRadius: 8, padding: "18px 10px", textAlign: "center", fontSize: 11.5, color: COLORS.ashDim }}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Maintenance schedule ---------- */

function MaintenanceSchedule({ schedules, assetById, onAdd, onEdit, onDelete, onGenerate }) {
  const sorted = [...schedules].sort((a, b) => daysBetween(a.nextDue) - daysBetween(b.nextDue));
  return (
    <div>
      <PageHeader eyebrow="PLANNED MAINTENANCE" title="Maintenance schedule" action={<Btn onClick={onAdd}><Plus size={14} /> Add schedule item</Btn>} />
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.3fr 110px 120px 120px 140px", padding: "11px 16px", fontSize: 11, fontWeight: 600, color: COLORS.ashDim, letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.line}`, background: COLORS.panelAlt }}>
          <div>TASK</div><div>ASSET</div><div>FREQUENCY</div><div>NEXT DUE</div><div>STATUS</div><div></div>
        </div>
        {sorted.length === 0 ? <Empty text="No maintenance scheduled yet." /> : sorted.map((s) => {
          const dd = daysBetween(s.nextDue);
          const asset = assetById[s.assetId];
          let urgency = { label: "Upcoming", color: COLORS.moss };
          if (dd < 0) urgency = { label: "Overdue", color: COLORS.alert };
          else if (dd <= 7) urgency = { label: "Due soon", color: COLORS.ore };
          return (
            <div key={s.id} className="table-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 1.3fr 110px 120px 120px 140px", padding: "12px 16px", alignItems: "center", borderBottom: `1px solid ${COLORS.line}`, fontSize: 13 }}>
              <div style={{ color: COLORS.bone, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
                {dd < 0 && <AlertTriangle size={13} color={COLORS.alert} />}
                {s.taskName}
              </div>
              <div style={{ color: COLORS.ash, fontSize: 12.5 }}>{asset ? `${asset.tag} · ${asset.name}` : "—"}</div>
              <div style={{ color: COLORS.ash, fontSize: 12.5 }}>{s.frequency}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: COLORS.ash }}>{s.nextDue}</div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: urgency.color }}>
                  {urgency.label}{dd < 0 ? ` · ${Math.abs(dd)}d` : dd <= 7 ? ` · ${dd}d` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => onGenerate(s)} title="Generate work order" style={{ background: "none", border: `1px solid ${COLORS.steel}`, color: COLORS.steelLight, borderRadius: 4, padding: "5px 8px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Wrench size={11} /> WO <ArrowUpRight size={11} />
                </button>
                <IconBtn onClick={() => onEdit(s)}><Pencil size={12} /></IconBtn>
                <IconBtn onClick={() => onDelete(s.id)}><Trash2 size={12} /></IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Role-based pages ---------- */

function MyAssetsPage({ assets, workorders, profile, onViewAsset, onReportIssue, onViewWO }) {
  const [reportingFor, setReportingFor] = useState(null);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");

  const handleSubmit = () => {
    if (!issueTitle.trim()) return;
    onReportIssue(reportingFor.id, issueTitle, issueDesc);
    setReportingFor(null);
    setIssueTitle("");
    setIssueDesc("");

    
  };

const myOpenReports = workorders.filter((w) => w.createdBy === profile.name);

  return (
    <div>
      <div
  style={{
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  }}
>
  <div style={{ color: COLORS.ashDim, fontSize: 13 }}>
    USER DASHBOARD
  </div>

  <div
    style={{
      color: COLORS.bone,
      fontSize: 28,
      fontWeight: 700,
      marginTop: 6,
    }}
  >
    👋 Welcome, {profile.name}
  </div>

  <div
    style={{
      color: COLORS.ashDim,
      marginTop: 8,
    }}
  >
    Enterprise Asset Management
  </div>

  <div
    style={{
      marginTop: 15,
      display: "flex",
      gap: 12,
      color: COLORS.ashDim,
      fontSize: 13,
    }}
  >
    <span>🔄 Last Sync : Just Now</span>
    <span>🔔 Notifications : {myOpenReports.length}</span>
  </div>
</div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 15,
    marginBottom: 25,
  }}
>

  <div style={{
    background: COLORS.panel,
    padding:20,
    borderRadius:8,
    border:`1px solid ${COLORS.line}`
  }}>
    <div style={{fontSize:13,color:COLORS.ashDim}}>
      📦 My Assets
    </div>

    <div style={{
      fontSize:32,
      color:COLORS.bone,
      fontWeight:700,
      marginTop:8
    }}>
      {assets.length}
    </div>
  </div>

  <div style={{
    background: COLORS.panel,
    padding:20,
    borderRadius:8,
    border:`1px solid ${COLORS.line}`
  }}>
    <div style={{fontSize:13,color:COLORS.ashDim}}>
      🔧 Open Reports
    </div>

    <div style={{
      fontSize:32,
      color:COLORS.bone,
      fontWeight:700,
      marginTop:8
    }}>
      {myOpenReports.length}
    </div>
  </div>

  <div style={{
    background: COLORS.panel,
    padding:20,
    borderRadius:8,
    border:`1px solid ${COLORS.line}`
  }}>
    <div style={{fontSize:13,color:COLORS.ashDim}}>
      ⏳ Pending
    </div>

    <div style={{
      fontSize:32,
      color:"#f59e0b",
      fontWeight:700,
      marginTop:8
    }}>
      {
        myOpenReports.filter(
          x=>x.approvalStage!=="completed"
        ).length
      }
    </div>
  </div>

  <div style={{
    background: COLORS.panel,
    padding:20,
    borderRadius:8,
    border:`1px solid ${COLORS.line}`
  }}>
    <div style={{fontSize:13,color:COLORS.ashDim}}>
      ✅ Completed
    </div>

    <div style={{
      fontSize:32,
      color:"#22c55e",
      fontWeight:700,
      marginTop:8
    }}>
      {
        myOpenReports.filter(
          x=>x.status==="Completed"
        ).length
      }
    </div>
  </div>

</div>

{/* Quick Actions */}

<div
  style={{
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 25,
  }}
>
  <div
    style={{
      color: COLORS.bone,
      fontWeight: 700,
      fontSize: 18,
      marginBottom: 18,
    }}
  >
    ⚡ Quick Actions
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
      gap: 15,
    }}
  >
    <Btn
      onClick={() => assets.length && setReportingFor(assets[0])}
      style={{ justifyContent: "center", height: 55 }}
    >
      ➕ Report Issue
    </Btn>

    <Btn
      variant="ghost"
      style={{ justifyContent: "center", height: 55 }}
    >
      📦 My Assets
    </Btn>

    <Btn
      variant="ghost"
      style={{ justifyContent: "center", height: 55 }}
    >
      📋 My Reports
    </Btn>

    <Btn
      variant="ghost"
      style={{ justifyContent: "center", height: 55 }}
    >
      📷 Scan QR
    </Btn>
  </div>
</div>

{/* Recent Activity */}

<div
  style={{
    background: COLORS.panel,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 25,
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    }}
  >
    <div
      style={{
        color: COLORS.bone,
        fontWeight: 700,
        fontSize: 18,
      }}
    >
      📈 Recent Activity
    </div>

    <div
      style={{
        color: COLORS.gold,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      View All →
    </div>
  </div>

  {myOpenReports.length === 0 ? (

    <div style={{ color: COLORS.ashDim }}>
      No recent activity.
    </div>

  ) : (

    myOpenReports
      .slice(0, 5)
      .map((w) => (

        <div
          key={w.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >

          <div>

            <div
              style={{
                color: COLORS.bone,
                fontWeight: 600,
              }}
            >
              {w.title}
            </div>

            <div
              style={{
                color: COLORS.ashDim,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {w.reportNumber || w.woNumber}
            </div>

          </div>

          <StatusPill status={w.status} />

        </div>

      ))

  )}

</div>

      {assets.length === 0 ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, padding: 30, textAlign: "center", color: COLORS.ashDim, borderRadius: 6 }}>
          No assets have been allocated to you yet. Ask an admin to assign one from the Team page.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 30 }}>
          {assets.map((a) => (
  <div
    key={a.id}
    style={{
      background: COLORS.panel,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 12,
      padding: 18,
      transition: "0.3s",
      boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
      cursor: "pointer",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.border = "1px solid #3B82F6";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.border = `1px solid ${COLORS.line}`;
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: COLORS.gold,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        📦 {a.tag}
      </div>

      <StatusPill status={a.status} />
    </div>

    <div
      style={{
        color: COLORS.bone,
        fontSize: 18,
        fontWeight: 700,
        marginTop: 15,
      }}
    >
      {a.name}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 13,
        marginTop: 8,
      }}
    >
      📍 {a.location}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 12,
        marginTop: 8,
      }}
    >
      Asset ID : {a.tag}
    </div>

    <div
      style={{
        display: "flex",
        gap: 10,
        marginTop: 20,
      }}
    >
      <Btn
        variant="ghost"
        onClick={() => onViewAsset(a)}
        style={{
          flex: 1,
          justifyContent: "center",
        }}
      >
        👁 View
      </Btn>

      <Btn
        onClick={() => setReportingFor(a)}
        style={{
          flex: 1,
          justifyContent: "center",
        }}
      >
        ⚠ Report
      </Btn>
    </div>
  </div>
))}
        </div>
      )}

      <PageHeader eyebrow="MY REPORTS" title="Issues you've reported" />
      {myOpenReports.length === 0 ? (
        <Empty text="You haven't reported any issues yet." />
      ) : (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, overflow: "hidden" }}>
          {myOpenReports.map((w, i) => {
            const needsAction = w.approvalStage === "user_completion";
            const stuck = isReportStuck(w);
            return (
              <div
                key={w.id}
                onClick={() => onViewWO(w)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px",
                  borderBottom: i < myOpenReports.length - 1 ? `1px solid ${COLORS.line}` : "none",
                  borderLeft: needsAction ? `3px solid ${COLORS.ore}` : "3px solid transparent",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ color: COLORS.bone, fontWeight: 500, fontSize: 13.5 }}>{w.title}</div>
                  <div style={{ color: COLORS.ashDim, fontSize: 12, marginTop: 2 }}>{(w.woNumber || w.reportNumber)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {stuck && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: COLORS.alert }}>
                      <AlertTriangle size={12} /> Stuck
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: APPROVAL_STAGE_COLOR(w.approvalStage) }}>
                    {needsAction ? "⚑ Action needed — click to complete" : (APPROVAL_STAGE_LABELS[w.approvalStage] || "—")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reportingFor && (
        <ModalShell title={`Report an issue — ${reportingFor.tag}`} onClose={() => setReportingFor(null)} >
          <Field label="Issue title">
            <input required style={inputStyle} value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="e.g. Unusual vibration in motor" />
          </Field>
          <Field label="Description">
            <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} placeholder="What did you notice?" />
          </Field>
          <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  }}
>
  <Btn
    variant="ghost"
    onClick={() => setReportingFor(null)}
  >
    Cancel
  </Btn>

  <Btn onClick={handleSubmit}>
    Submit report
  </Btn>
</div>
        </ModalShell>
      )}
    </div>
  );
}

function ApprovalsQueue({ workorders, assetById, role, onAdvance, onReject, onView }) {
  const stageForRole = role === "admin" ? null : Object.keys(STAGE_OWNER_ROLE).find((s) => STAGE_OWNER_ROLE[s] === role);
  const queue = role === "admin"
    ? workorders.filter((w) => w.approvalStage && w.approvalStage !== "closed" && w.approvalStage !== "rejected")
    : workorders.filter((w) => w.approvalStage === stageForRole);

  const actionLabel = stageForRole === "technician_assigned" ? "Mark Complete" : "Approve";

  return (
    <div>
      <PageHeader eyebrow="APPROVALS" title={role === "admin" ? "All pending approvals" : `Pending your review (${ROLE_LABELS[role]})`} />

      {queue.length === 0 ? (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: 36, textAlign: "center", color: COLORS.ashDim }}>
          <CheckCircle2 size={22} color={COLORS.moss} style={{ marginBottom: 10 }} />
          <div>Nothing waiting on you right now.</div>
        </div>
      ) : (
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 8, overflow: "hidden" }}>
          {queue.map((w, i) => {
            const asset = assetById[w.assetId];
            const canAct = role === "admin" || w.approvalStage === stageForRole;
            return (
              <div key={w.id} className="table-row" style={{ padding: "15px 18px", borderBottom: i < queue.length - 1 ? `1px solid ${COLORS.line}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ cursor: "pointer" }} onClick={() => onView(w)}>
                    <div style={{ color: COLORS.steelLight, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{(w.woNumber || w.reportNumber)}</div>
                    <div style={{ color: COLORS.bone, fontWeight: 600, fontSize: 14, marginTop: 3 }}>{w.title}</div>
                    <div style={{ color: COLORS.ashDim, fontSize: 12, marginTop: 3 }}>
                      {asset ? `${asset.tag} · ${asset.name}` : "—"} · Reported by {w.createdBy || "Unknown"}
                    </div>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                    {isReportStuck(w) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: COLORS.alert }}>
                        <AlertTriangle size={12} /> Stuck
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: APPROVAL_STAGE_COLOR(w.approvalStage) }}>
                      {APPROVAL_STAGE_LABELS[w.approvalStage]}
                    </span>
                  </span>
                </div>
                {canAct && w.approvalStage !== "closed" && w.approvalStage !== "rejected" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Btn onClick={() => onAdvance(w.id)}>{actionLabel}</Btn>
                    <Btn variant="danger" onClick={() => onReject(w.id)}>Reject</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamPage({ profiles, onChangeRole, onUpdateAssetAccess, workers, isAdmin, onWorkersPulled }) {
  const [pulling, setPulling] = useState(false);
  const [pullMsg, setPullMsg] = useState("");

  async function pullTechnicians() {
    setPulling(true);
    setPullMsg("");
    try {
      const res = await fetch(`${LOCAL_SYNC_URL}/pull-resources`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Pull failed");
      setPullMsg(`Pulled ${body.totalFromBC} technicians from Business Central.`);
      if (onWorkersPulled) await onWorkersPulled();
    } catch (err) {
      setPullMsg(`Could not pull from Business Central: ${err.message}. Is bc-local-sync running?`);
    }
    setPulling(false);
  }

  return (
    <div>
      <PageHeader eyebrow="TEAM" title="Manage user roles & asset access" />
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", padding: "10px 16px", fontSize: 11, color: COLORS.ashDim, letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.line}` }}>
          <div>NAME</div><div>EMAIL</div><div>ROLE</div>
        </div>
        {profiles.length === 0 ? (
          <Empty text="No users found yet." />
        ) : (
          profiles.map((p, i) => (
            <div key={p.id} style={{ borderBottom: i < profiles.length - 1 ? `1px solid ${COLORS.line}` : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", padding: "12px 16px", alignItems: "center", fontSize: 13 }}>
                <div style={{ color: COLORS.bone, fontWeight: 500 }}>{p.name}</div>
                <div style={{ color: COLORS.ash }}>{p.email}</div>
                <select
                  style={{ ...inputStyle, fontSize: 12.5 }}
                  value={p.role}
                  onChange={(e) => onChangeRole(p.id, e.target.value)}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              {p.role === "user" && (
                <UserAssetAccessRow profile={p} onUpdateAssetAccess={onUpdateAssetAccess} />
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        <PageHeader
          eyebrow="TECHNICIANS"
          title="Business Central resources"
          action={
            isAdmin ? (
              <Btn onClick={pullTechnicians} style={{ opacity: pulling ? 0.6 : 1 }}>
                {pulling ? "Pulling from Business Central…" : "Pull Technicians from Business Central"}
              </Btn>
            ) : null
          }
        />
        {pullMsg && (
          <div style={{ marginBottom: 14, fontSize: 13, color: pullMsg.startsWith("Pulled") ? COLORS.moss : COLORS.alert }}>
            {pullMsg}
          </div>
        )}
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px", fontSize: 11, color: COLORS.ashDim, letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.line}` }}>
            <div>NO.</div><div>NAME</div><div>WORKER GROUP</div>
          </div>
          {(!workers || workers.length === 0) ? (
            <Empty text="No technicians yet. Pull from Business Central to populate the Technician dropdown." />
          ) : (
            workers.map((w, i) => (
              <div
                key={w.personnel_number}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "10px 16px",
                  fontSize: 13,
                  borderBottom: i < workers.length - 1 ? `1px solid ${COLORS.line}` : "none",
                }}
              >
                <div style={{ color: COLORS.ash }}>{w.personnel_number}</div>
                <div style={{ color: COLORS.bone, fontWeight: 500 }}>{w.worker_name}</div>
                <div style={{ color: COLORS.ash }}>{w.worker_group || "-"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const CheckboxOption = (props) => {
  return (
    <components.Option {...props}>
      <input
        type="checkbox"
        checked={props.isSelected}
        readOnly
        style={{ marginRight: 10 }}
      />
      <span>{props.label}</span>
    </components.Option>
  );
};

function UserAssetAccessRow({ profile, onUpdateAssetAccess }) {
  const [types, setTypes] = useState(profile.assigned_asset_types || []);
  const [seeAll, setSeeAll] = useState(!!profile.see_all_assets);
  const [saved, setSaved] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);

  useEffect(() => {
    setTypes(profile.assigned_asset_types || []);
    setSeeAll(!!profile.see_all_assets);
  }, [profile.id, profile.assigned_asset_types, profile.see_all_assets]);

  useEffect(() => {
  loadAssetTypes();
}, []);

const loadAssetTypes = async () => {
  const { data, error } = await supabase
    .from("assets_bc")
    .select("bc_subclass_code");

  if (error) {
    console.error(error);
    return;
  }

  const uniqueTypes = [
    ...new Set(
      data
        .map((x) => x.bc_subclass_code)
        .filter(Boolean)
    ),
  ].sort();

  setAssetTypes(uniqueTypes);
};

  const toggleType = (t) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSave = () => {
    onUpdateAssetAccess(profile.id, types, seeAll);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{ padding: "10px 16px 14px 16px", background: COLORS.panelAlt, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: COLORS.ashDim, letterSpacing: 0.5 }}>ASSET ACCESS:</span>
      <div style={{ minWidth: 380 }}>
  <Select
    isMulti
    closeMenuOnSelect={false}
    hideSelectedOptions={false}
    components={{ Option: CheckboxOption }}
    menuPlacement="bottom"
    menuPosition="fixed"
    styles={{
  container: (base) => ({
    ...base,
    width: "100%",
    minWidth: 420,
  }),

  control: (base) => ({
    ...base,
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    minHeight: 38,
    boxShadow: "none",
    cursor: "pointer",
    "&:hover": {
      border: `1px solid ${COLORS.line}`,
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "2px 10px",
  }),

  placeholder: (base) => ({
    ...base,
    color: COLORS.ashDim,
    fontSize: 13,
  }),

  input: (base) => ({
    ...base,
    color: COLORS.bone,
  }),

  menu: (base) => ({
    ...base,
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    overflow: "hidden",
    zIndex: 9999,
  }),

  menuList: (base) => ({
    ...base,
    background: COLORS.panelAlt,
    padding: 0,
  }),

  option: (base, state) => ({
    ...base,
    background: state.isFocused
      ? COLORS.panel
      : COLORS.panelAlt,
    color: COLORS.bone,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    cursor: "pointer",
  }),

  multiValue: (base) => ({
    ...base,
    background: COLORS.steel,
    borderRadius: 4,
  }),

  multiValueLabel: (base) => ({
    ...base,
    color: "#0E1013",
    fontWeight: 600,
  }),

  multiValueRemove: (base) => ({
    ...base,
    color: "#0E1013",
    ":hover": {
      background: COLORS.alert,
      color: "#fff",
    },
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: COLORS.ashDim,
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),
}}
    options={assetTypes.map((t) => ({
      value: t,
      label: t,
    }))}
    value={assetTypes
      .filter((t) => types.includes(t))
      .map((t) => ({
        value: t,
        label: t,
      }))}
    onChange={(selected) =>
      setTypes(selected ? selected.map((x) => x.value) : [])
    }
    placeholder="Choose asset types..."
  />
</div>
      
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLORS.steelLight, fontWeight: 600, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={seeAll}
          onChange={(e) => setSeeAll(e.target.checked)}
          style={{ accentColor: COLORS.steel }}
        />
        See all assets
      </label>
      <button
        onClick={handleSave}
        style={{
          background: COLORS.steel, color: "#0E1013", border: "none", borderRadius: 4,
          padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto",
        }}
      >
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}

function ProfilePage({ profile, role, assets, onViewAsset }) {
  return (
    <div>
      <PageHeader eyebrow="PROFILE" title={profile.name} />
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 24, marginBottom: 24, maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.steel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#0E1013" }}>
            {(profile.name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.bone }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: COLORS.ashDim }}>{profile.email}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 10, fontSize: 13 }}>
          <strong>Role</strong>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: COLORS.steelLight }}>
            <ShieldCheck size={14} /> {ROLE_LABELS[role]}
          </span>
        </div>
      </div>

      {role === "user" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.steelLight, marginBottom: 12 }}>Assets allocated to you</div>
          {assets.length === 0 ? (
            <Empty text="No assets allocated yet." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {assets.map((a) => (
                <div key={a.id} onClick={() => onViewAsset(a)} style={{ cursor: "pointer", background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: 14 }}>
                  <Tag text={a.tag} />
                  <div style={{ color: COLORS.bone, fontWeight: 600, marginTop: 8 }}>{a.name}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Modals ---------- */

function ModalShell({ title, onClose, children, onSubmit }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,9,11,0.72)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.lineLight}`, borderRadius: 10, width: 440,
        maxHeight: "85vh", overflowY: "auto", padding: 24,
        boxShadow: "0 30px 70px -20px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 600, color: COLORS.bone, letterSpacing: 0.2 }}>{title}</div>
          <button
            className="btn-ghost"
            onClick={onClose}
            style={{ background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.ashDim, cursor: "pointer" }}
          ><X size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>{children}</form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, color: COLORS.ashDim, marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "9px 11px", color: COLORS.bone, fontSize: 13, fontFamily: "Inter, sans-serif", boxSizing: "border-box" };

function AssetModal({ asset, assets, onSave, onClose }) {
  const [assetTypes, setAssetTypes] = React.useState([]);

  React.useEffect(() => {
    loadAssetTypes();
  }, []);

  const loadAssetTypes = async () => {
    console.log("Loading asset types...");

    const { data, error } = await supabase
      .from("assets_bc")
      .select("bc_subclass_code");

     console.log("Data:", data);
     console.log("Error:", error)

    if (error) {
      console.error(error);
      return;
    }

    const uniqueTypes = [...new Set(
      data
        .map(x => x.bc_subclass_code)
        .filter(Boolean)
    )].sort();

    setAssetTypes(uniqueTypes);
  };
  const [form, setForm] = useState({ ...asset, documents: asset.documents || [] });

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  const addDocument = () => {
    setForm({
      ...form,
      documents: [...form.documents, { name: "", url: "" }],
    });
  };

  const updateDocument = (index, key, value) => {
    const updated = form.documents.map((doc, i) =>
      i === index ? { ...doc, [key]: value } : doc
    );
    setForm({ ...form, documents: updated });
  };

  const removeDocument = (index) => {
    setForm({
      ...form,
      documents: form.documents.filter((_, i) => i !== index),
    });
  };

  const selectStyles = {
  control: (base) => ({
    ...base,
    width: "100%",
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: "1px 2px",
    color: COLORS.bone,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    minHeight: 38,
    boxShadow: "none",
    cursor: "pointer",
    "&:hover": {
      border: `1px solid ${COLORS.line}`,
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),

  singleValue: (base) => ({
    ...base,
    color: COLORS.bone,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
  }),

  input: (base) => ({
    ...base,
    color: COLORS.bone,
  }),

  placeholder: (base) => ({
    ...base,
    color: COLORS.ashDim,
  }),

  menu: (base) => ({
    ...base,
    background: COLORS.panelAlt,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    zIndex: 9999,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
  }),

  option: (base, state) => ({
    ...base,
    background: state.isFocused ? COLORS.panel : COLORS.panelAlt,
    color: COLORS.bone,
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    cursor: "pointer",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: COLORS.ashDim,
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),
};

  return (
    <ModalShell
      title={asset.name ? "Edit asset" : "Add asset"}
      onClose={onClose}
      onSubmit={() => onSave(form)}
    >
      <Field label="Asset Tag">
        <input
          required
          style={inputStyle}
          value={form.tag}
          onChange={set("tag")}
          placeholder="e.g. EXC-1015"
        />
      </Field>

      <Field label="BC Asset ID">
        <input
          style={inputStyle}
          value={form.bcAssetId || ""}
          onChange={set("bcAssetId")}
          placeholder="e.g. AK-101"
        />
        <div style={{ fontSize: 11, color: COLORS.ashDim, marginTop: 6 }}>
          The MaintenanceAssetId of the matching asset in Business Central. Leave blank if this
          asset isn't tracked in BC yet.
        </div>
      </Field>


      <Field label="Asset Name">
        <input
          required
          style={inputStyle}
          value={form.name}
          onChange={set("name")}
          placeholder="e.g. Excavator CAT 6015B"
        />
      </Field>

      <Field label="Type">
        <Select
  options={assetTypes.map(type => ({
    value: type,
    label: type,
  }))}
  value={
    form.type
      ? { value: form.type, label: form.type }
      : null
  }
  onChange={(option) =>
    setForm({ ...form, type: option.value })
  }
  menuPlacement="bottom"
  menuPosition="fixed"
  styles={selectStyles}
  
/>
      </Field>

      <Field label="Location">
        <input
          required
          style={inputStyle}
          value={form.location}
          onChange={set("location")}
          placeholder="e.g. Kagem — Pit 1"
        />
      </Field>

      <Field label="Parent Asset">
  <Select
    isSearchable={false}
    menuPlacement="bottom"
    menuPosition="fixed"
    styles={selectStyles}
    options={[
      { value: "", label: "None" },
      ...assets
        .filter((a) => a.id !== form.id)
        .map((a) => ({
          value: a.id,
          label: `${a.tag} - ${a.name}`,
        })),
    ]}
    value={
      [
        { value: "", label: "None" },
        ...assets
          .filter((a) => a.id !== form.id)
          .map((a) => ({
            value: a.id,
            label: `${a.tag} - ${a.name}`,
          })),
      ].find((x) => x.value === (form.parentId || "")) || {
        value: "",
        label: "None",
      }
    }
    onChange={(option) =>
      setForm({ ...form, parentId: option.value })
    }
    //styles={/* same styles object you used for Asset Type */}
  />
</Field>

      <div style={{ fontSize: 11, color: COLORS.ashDim, marginTop: -6, marginBottom: 6 }}>
        Note: which users can see this asset is now controlled by asset <em>type</em> on the Team page, not per-asset.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        <Field label="Manufacturer">
          <input
            style={inputStyle}
            value={form.manufacturer || ""}
            onChange={set("manufacturer")}
            placeholder="Caterpillar"
          />
        </Field>

        <Field label="Model">
          <input
            style={inputStyle}
            value={form.model || ""}
            onChange={set("model")}
            placeholder="6015B"
          />
        </Field>

        <Field label="Serial Number">
          <input
            style={inputStyle}
            value={form.serialNumber || ""}
            onChange={set("serialNumber")}
            placeholder="CAT6015B001"
          />
        </Field>

        <Field label="Department">
          <select
            style={inputStyle}
            value={form.department || ""}
            onChange={set("department")}
          >
            <option value="">Select</option>
            <option>Mining</option>
            <option>Processing</option>
            <option>Maintenance</option>
            <option>Administration</option>
          </select>
        </Field>

        <Field label="Purchase Date">
          <input
            type="date"
            style={inputStyle}
            value={form.purchaseDate || ""}
            onChange={set("purchaseDate")}
          />
        </Field>

        <Field label="Warranty Expiry">
          <input
            type="date"
            style={inputStyle}
            value={form.warrantyExpiry || ""}
            onChange={set("warrantyExpiry")}
          />
        </Field>

        <Field label="Meter Reading">
          <input
            type="number"
            style={inputStyle}
            value={form.meterReading || ""}
            onChange={set("meterReading")}
            placeholder="1250"
          />
        </Field>

        <Field label="Service Interval">
          <input
            style={inputStyle}
            value={form.serviceInterval || ""}
            onChange={set("serviceInterval")}
            placeholder="250 Hours"
          />
        </Field>

      </div>

      <Field label="Description">
        <textarea
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: "vertical",
          }}
          value={form.description || ""}
          onChange={set("description")}
        />
      </Field>

      {/* Documents */}
      <Field label="Documents">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {form.documents.length === 0 && (
            <div style={{ color: COLORS.ashDim, fontSize: 12.5 }}>
              No documents added yet.
            </div>
          )}

          {form.documents.map((doc, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                style={inputStyle}
                value={doc.name}
                onChange={(e) => updateDocument(i, "name", e.target.value)}
                placeholder="e.g. Operator Manual.pdf"
              />
              <input
                style={inputStyle}
                value={doc.url}
                onChange={(e) => updateDocument(i, "url", e.target.value)}
                placeholder="https://... link to the file"
              />
              <button
                type="button"
                onClick={() => removeDocument(i)}
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.line}`,
                  color: COLORS.alert,
                  borderRadius: 6,
                  padding: "9px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addDocument}
          style={{
            background: "transparent",
            border: `1px dashed ${COLORS.line}`,
            color: COLORS.steelLight,
            borderRadius: 6,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 12.5,
            fontWeight: 600,
            width: "100%",
          }}
        >
          + Add document
        </button>
      </Field>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <Field label="Status">
          <select
            style={inputStyle}
            value={form.status}
            onChange={set("status")}
          >
            {Object.keys(STATUS_META).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Criticality">
          <select
            style={inputStyle}
            value={form.criticality}
            onChange={set("criticality")}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 10,
        }}
      >
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>

        <Btn onClick={() => onSave(form)}>
          Save Asset
        </Btn>
      </div>
    </ModalShell>
  );
}

function WOModal({ wo, assets, workers, onSave, onClose }) {
  const [form, setForm] = useState(wo);
  const filteredWorkers = (workers || []).filter(
  (w) => w.worker_group === form.workerGroup
);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <ModalShell title={wo.title ? "Edit work order" : "New work order"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="WORK ORDER NUMBER"><input style={inputStyle} value={form.woNumber} onChange={set("woNumber")} /></Field>
      <Field label="TITLE"><input required style={inputStyle} value={form.title} onChange={set("title")} placeholder="e.g. Replace hydraulic hose" /></Field>
      <Field label="ASSET">
        <select style={inputStyle} value={form.assetId} onChange={set("assetId")}>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} · {a.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="PRIORITY">
          <select style={inputStyle} value={form.priority} onChange={set("priority")}>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
        </Field>
        <Field label="STATUS">
          <select style={inputStyle} value={form.status} onChange={set("status")}>
            {WO_COLUMNS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="WORKER GROUP">
    <select
      style={inputStyle}
      value={form.workerGroup || ""}
      onChange={(e) =>
        setForm({
          ...form,
          workerGroup: e.target.value,
          assignedTo: "",
        })
      }
    >
      <option value="">Select Worker Group</option>

{[...new Set(
  workers
    .map(w => (w.worker_group || "").trim())
    .filter(group => group !== "")
)]
.map(group => (
  <option key={group} value={group}>
    {group}
  </option>
))}
    </select>
  </Field>

  <Field label="ASSIGNED TECHNICIAN">
    <select
      style={inputStyle}
      value={form.assignedTo || ""}
      onChange={set("assignedTo")}
    >
      <option value="">Select Technician</option>

      {filteredWorkers.map((w) => (
        <option
          key={w.personnel_number}
          value={w.worker_name}
        >
          {w.worker_name}
        </option>
      ))}
    </select>
  </Field>

  

        <Field label="RISK LEVEL">
          <select
            style={inputStyle}
            value={form.riskLevel}
            onChange={set("riskLevel")}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="ESTIMATED HOURS">
          <input
            type="number"
            style={inputStyle}
            value={form.estimatedHours}
            onChange={set("estimatedHours")}
            placeholder="6"
        />
      </Field>

      <Field label="ESTIMATED COST">
        <input
          type="number"
          style={inputStyle}
          value={form.estimatedCost}
          onChange={set("estimatedCost")}
          placeholder="12500"
        />
      </Field>
    </div>

    <Field label="DESCRIPTION">
      <textarea
        style={{ ...inputStyle, minHeight: 80 }}
        value={form.description}
        onChange={set("description")}
        placeholder="Describe the maintenance work..."
      />
    </Field>

    <Field label="PARTS REQUIRED">
      <textarea
        style={{ ...inputStyle, minHeight: 80 }}
        value={form.partsRequired}
        onChange={set("partsRequired")}
        placeholder="Hydraulic Oil&#10;Oil Filter&#10;Seal Kit"
      />
    </Field>

    <Field label="REMARKS">
      <textarea
        style={{ ...inputStyle, minHeight: 70 }}
        value={form.remarks}
        onChange={set("remarks")}
        placeholder="Additional notes..."
      />
    </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave(form)}>Save work order</Btn>
      </div>
    </ModalShell>
  );
}

function ScheduleModal({ sched, assets, onSave, onClose }) {
  const [form, setForm] = useState(sched);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <ModalShell title={sched.taskName ? "Edit schedule item" : "Add schedule item"} onClose={onClose} onSubmit={() => onSave(form)}>
      <Field label="TASK NAME"><input required style={inputStyle} value={form.taskName} onChange={set("taskName")} placeholder="e.g. 250-hour service" /></Field>
      <Field label="ASSET">
        <select style={inputStyle} value={form.assetId} onChange={set("assetId")}>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} · {a.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="FREQUENCY">
          <select style={inputStyle} value={form.frequency} onChange={set("frequency")}>
            <option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Annual</option>
          </select>
        </Field>
        <Field label="NEXT DUE"><input type="date" style={inputStyle} value={form.nextDue} onChange={set("nextDue")} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => {}}>Save schedule item</Btn>
      </div>
    </ModalShell>
  );
}

function AssetDetailsModal({ asset, assets, workorders, onClose }) {
  if (!asset) return null;

  const parent = assets.find((a) => a.id === asset.parentId);
  const children = assets.filter((a) => a.parentId === asset.id);
  const assetWorkOrders = workorders.filter((wo) => wo.assetId === asset.id);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,9,11,0.72)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        padding: "40px 20px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 680,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          background: COLORS.panel,
          border: `1px solid ${COLORS.lineLight}`,
          borderRadius: 10,
          padding: 30,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
            borderBottom: `1px solid ${COLORS.line}`,
            paddingBottom: 15,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.bone,
                letterSpacing: 0.2,
              }}
            >
              {asset.name}
            </div>

            <div
              style={{
                color: COLORS.steelLight,
                marginTop: 5,
              }}
            >
              {asset.tag}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusPill status={asset.status} />

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${COLORS.line}`,
                color: COLORS.bone,
                padding: "8px 14px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Quick Summary */}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 15,
    marginBottom: 25,
  }}
>

  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 8,
      padding: 18,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 26 }}>🟢</div>

    <div
      style={{
        color: COLORS.bone,
        fontWeight: 700,
        marginTop: 8,
      }}
    >
      {asset.status}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 12,
        marginTop: 4,
      }}
    >
      Current Status
    </div>
  </div>

  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 8,
      padding: 18,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 26 }}>⏱</div>

    <div
      style={{
        color: COLORS.bone,
        fontWeight: 700,
        marginTop: 8,
      }}
    >
      {asset.meterReading || 0}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 12,
        marginTop: 4,
      }}
    >
      Meter Hours
    </div>
  </div>

  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 8,
      padding: 18,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 26 }}>🔧</div>

    <div
      style={{
        color: COLORS.bone,
        fontWeight: 700,
        marginTop: 8,
      }}
    >
      {assetWorkOrders.length}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 12,
        marginTop: 4,
      }}
    >
      Work Orders
    </div>
  </div>

  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 8,
      padding: 18,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 26 }}>📅</div>

    <div
      style={{
        color: COLORS.bone,
        fontWeight: 700,
        marginTop: 8,
      }}
    >
      {asset.serviceInterval || "-"}
    </div>

    <div
      style={{
        color: COLORS.ashDim,
        fontSize: 12,
        marginTop: 4,
      }}
    >
      Service Interval
    </div>
  </div>

</div>

        {/* Image + General Information */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 30,
            alignItems: "start",
          }}
        >

          {/* LEFT SIDE */}

          <div
            style={{
              position: "sticky",
              top: 20,
            }}
          ></div>

          <img
            src={asset.image}
            alt={asset.name}
            style={{
              width: "100%",
              height: 220,
              objectFit: "cover",
              borderRadius: 8,
              border: `1px solid ${COLORS.line}`,
            }}
          />

          {/* Quick Actions */}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 10,
    marginTop: 15,
  }}
>

  <Btn style={{ justifyContent: "center", height: 45 }}>
        🔧 Create WO
      </Btn>

      <Btn variant="ghost" style={{ justifyContent: "center", height: 45 }}>
        ⚠ Report
      </Btn>

      <Btn variant="ghost" style={{ justifyContent: "center", height: 45 }}>
        📄 Documents
      </Btn>

      <Btn variant="ghost" style={{ justifyContent: "center", height: 45 }}>
        📷 Photos
      </Btn>
</div>

          <div>

            <h3
              style={{
                color: COLORS.bone,
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              📋 Asset Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 15,
              }}
            >

              <InfoCard title="📍 Location" value={asset.location || "-"} />

              <InfoCard title="🏢 Department" value={asset.department || "-"} />

              <InfoCard title="🏭 Manufacturer" value={asset.manufacturer || "-"} />

              <InfoCard title="⚙ Model" value={asset.model || "-"} />

              <InfoCard title="🔢 Serial Number" value={asset.serialNumber || "-"} />

              <InfoCard title="📦 Asset Tag" value={asset.tag} />

          </div>

        </div>
        </div>

        <div style={{ marginBottom: 30 }}>

  <h3
    style={{
      color: COLORS.bone,
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 18,
    }}
  >
    🔧 Maintenance
  </h3>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 15,
    }}
  >

    <InfoCard
      title="⏱ Meter Reading"
      value={`${asset.meterReading || 0} Hours`}
    />

    <InfoCard
      title="🔄 Service Interval"
      value={asset.serviceInterval || "-"}
    />

    <InfoCard
      title="📅 Purchase Date"
      value={asset.purchaseDate || "-"}
    />

    <InfoCard
      title="🛡 Warranty Expiry"
      value={asset.warrantyExpiry || "-"}
    />

  </div>

</div>

        {/* Description */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>
            Description
          </h3>

          <div
            style={{
              background: COLORS.panelAlt,
              padding: 15,
              borderRadius: 6,
              border: `1px solid ${COLORS.line}`,
              lineHeight: 1.7,
            }}
          >
            {asset.description || "No description available."}
          </div>
        </div>

        {/* Hierarchy */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>
            Hierarchy
          </h3>

          <div
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              padding: 15,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <strong>Parent</strong>

              <div
                style={{
                  marginTop: 6,
                  color: COLORS.bone,
                }}
              >
                {parent ? parent.name : "None"}
              </div>
            </div>

            <div>
              <strong>Children</strong>

              <div style={{ marginTop: 8 }}>
                {children.length === 0 ? (
                  <div style={{ color: COLORS.ash }}>
                    No child assets
                  </div>
                ) : (
                  children.map((child) => (
                    <div
                      key={child.id}
                      style={{
                        padding: "4px 0",
                        color: COLORS.bone,
                      }}
                    >
                      • {child.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>
            Documents
          </h3>

          <div
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {!asset.documents || asset.documents.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  color: COLORS.ash,
                  textAlign: "center",
                }}
              >
                No documents attached.
              </div>
            ) : (
              asset.documents.map((doc, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom:
                      i < asset.documents.length - 1
                        ? `1px solid ${COLORS.line}`
                        : "none",
                  }}
                >
                  <span style={{ color: COLORS.bone, fontSize: 13.5 }}>
                    📄 {doc.name}
                  </span>

                  {doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: COLORS.steelLight,
                        fontSize: 12.5,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      View →
                    </a>
                  ) : (
                    <span style={{ color: COLORS.ashDim, fontSize: 12 }}>
                      No link
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Work Order History */}

<div style={{ marginBottom: 30 }}>

  <h3
    style={{
      color: COLORS.bone,
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 20,
    }}
  >
    🔧 Work Order History
  </h3>

  {assetWorkOrders.length === 0 ? (

    <div
      style={{
        background: COLORS.panelAlt,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 10,
        padding: 30,
        textAlign: "center",
        color: COLORS.ashDim,
      }}
    >
      No Work Orders Available
    </div>

  ) : (

    assetWorkOrders.map((wo) => (

      <div
        key={wo.id}
        style={{
          background: COLORS.panelAlt,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          padding: 18,
          textAlign: "center",
          marginBottom: 15,
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >

          <div>

            <div
              style={{
                color: COLORS.gold,
                fontWeight: 700,
                fontSize: 14,
                
              }}
            >
              {wo.woNumber || wo.reportNumber}
            </div>

            <div
              style={{
                color: COLORS.bone,
                fontSize: 18,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              {wo.title}
            </div>

          </div>

          <WOStatusPill status={wo.status} />

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            marginTop: 18,
            gap: 15,
          }}
        >

          <InfoCard
            title="🔥 Priority"
            value={wo.priority || "-"}
          />

          <InfoCard
            title="👤 Created By"
            value={wo.createdBy || "-"}
          />

          <InfoCard
            title="📅 Status"
            value={wo.status}
          />

        </div>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >

          <Btn
            variant="ghost"
          >
            👁 View Details
          </Btn>

        </div>

      </div>

    ))

  )}

</div>

        {/* Bottom back button */}
        <div
          style={{
            marginTop: 25,
            paddingTop: 20,
            borderTop: `1px solid ${COLORS.line}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.line}`,
              color: COLORS.bone,
              padding: "8px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

 function WorkOrderDetailsModal({
  wo,
  assetById,
  profile,
  isAdmin,
  workers,
  onAddComment,
  onAddAttachment,
  bcItems,
  onItemsPulled,
  onRemoveAttachment,
  onAddChecklistItem,
  onToggleChecklistItem,
  onRemoveChecklistItem,
  onAddLaborEntry,
  onPostLaborToJournal,
  onRemoveLaborEntry,
  onAddMaterial,
  onAddExpense,
  onRemoveMaterial,
  onAssignTechnician,
  onSubmitForApproval,
  onClose,
}) {
  if (!wo) return null;

  const [pullingItems, setPullingItems] = React.useState(false);
  const [pullItemsMsg, setPullItemsMsg] = React.useState("");
  const pullItemsFromBc = async () => {
    setPullingItems(true);
    setPullItemsMsg("");
    try {
      const res = await fetch(`${LOCAL_SYNC_URL}/pull-items`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Pull failed");
      setPullItemsMsg(`Pulled ${body.totalFromBC} items from Business Central.`);
      if (onItemsPulled) await onItemsPulled();
    } catch (err) {
      setPullItemsMsg(`Could not pull from Business Central: ${err.message}. Is bc-local-sync running?`);
    }
    setPullingItems(false);
  };

  const asset = assetById?.[wo.assetId];
  const [workerGroup, setWorkerGroup] = React.useState(wo.workerGroup || "");
  const [technician, setTechnician] = React.useState(wo.assignedTo || "");

  const filteredWorkers = (workers || []).filter(
    (w) => w.worker_group === workerGroup
  );

  const isLocked = wo.approvalStage === "manager_review";
  const isReporter = profile && wo.createdBy === profile.name;
  const canSubmitOnward = isReporter && wo.approvalStage === "user_completion";

  const [comment, setComment] = React.useState("");
  const activity = wo.activity || [];

  const handlePost = () => {
    if (!comment.trim()) return;
    onAddComment(wo.id, comment);
    setComment("");
  };

  // Attachments
  const [attachName, setAttachName] = React.useState("");
  const [attachUrl, setAttachUrl] = React.useState("");
  const handleUploadAttachment = () => {
    if (!attachName.trim()) return;
    onAddAttachment(wo.id, { name: attachName.trim(), url: attachUrl.trim() });
    setAttachName("");
    setAttachUrl("");
  };

  // Checklist
  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    onAddChecklistItem(wo.id, newChecklistItem);
    setNewChecklistItem("");
  };
  const checklist = wo.checklist || [];
  const checklistDone = checklist.filter((c) => c.done).length;

  // Labor Log
  const resolveValidTechnician = (value) =>
    (workers || []).some((w) => w.personnel_number === value) ? value : "";

  const [laborTech, setLaborTech] = React.useState(
    resolveValidTechnician(wo.assignedTo)
  );
  const [laborHours, setLaborHours] = React.useState("");

  React.useEffect(() => {
    setLaborTech(resolveValidTechnician(wo.assignedTo));
  }, [wo.assignedTo, workers]);

  const [laborSubmitting, setLaborSubmitting] = React.useState(false);
  const handleAddLabor = async () => {
    if (!laborTech.trim() || !laborHours || laborSubmitting) return;
    setLaborSubmitting(true);
    try {
      await onAddLaborEntry(wo.id, laborTech, laborHours);
      setLaborHours("");
    } finally {
      setLaborSubmitting(false);
    }
  };

  const [journalSubmitting, setJournalSubmitting] = React.useState(false);
  const handlePostToJournal = async () => {
    if (!laborTech.trim() || !laborHours || journalSubmitting) return;
    setJournalSubmitting(true);
    try {
      await onPostLaborToJournal(wo.id, laborTech, laborHours);
      setLaborHours("");
    } finally {
      setJournalSubmitting(false);
    }
  };

  const laborLog = wo.laborLog || [];
  const totalHours = laborLog.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);

  // Material Consumption
  const [materialItem, setMaterialItem] = React.useState("");
  const [materialQty, setMaterialQty] = React.useState("");

  // Expense
const EXPENSE_CATEGORIES = [
  "Car Rental",
  "Conference",
  "Flights",
  "Fuel",
  "Hotel",
  "Maintenance expenses",
  "Meal",
  "Taxi",
  "Travel",
];

const EXPENSE_OFFSET_ACCOUNTS = {
  "Travel": "601500",
  "Maintenance expenses": "601500",
  "Taxi": "601500",
  "Car Rental": "601501",
  "Conference": "601502",
  "Flights": "601504",
  "Fuel": "601505",
  "Hotel": "601506",
  "Meal": "601507",
};

const [expenseCategory, setExpenseCategory] = React.useState("");
const [expenseAmount, setExpenseAmount] = React.useState("");
const [expenseDate, setExpenseDate] = React.useState(today());
const [expenseDescription, setExpenseDescription] = React.useState("");

const handleAddExpense = async () => {
  if (!expenseCategory || !expenseAmount) {
    alert("Please select a category and enter an amount");
    return;
  }

  // Get Project ID and Activity Number dynamically
  const projId =
    wo.projectId ||
    wo.project_id ||
    wo.proj_id;

  const actNum =
    wo.activityNumber ||
    wo.activity_number ||
    wo.proj_activity;

  if (!projId) {
    alert("Project ID is missing for this work order");
    console.error("Work order:", wo);
    return;
  }

  if (!actNum) {
    alert("Activity Number is missing for this work order");
    console.error("Work order:", wo);
    return;
  }

  try {
    console.log("====================================");
    console.log("CREATING EXPENSE IN BC");
    console.log("Project ID:", projId);
    console.log("Activity Number:", actNum);
    console.log("Category:", expenseCategory);
    console.log("Amount:", Number(expenseAmount));
    console.log("Date:", expenseDate);
    console.log("====================================");

    const { data, error } = await supabase.functions.invoke(
      "create-expense",
      {
        body: {
          projectId: projId,
          activityNumber: actNum,
          category: expenseCategory,
          amount: Number(expenseAmount),
          description:
            expenseDescription.trim() ||
            `Maintenance expense from work order ${wo.id}`,
          date: expenseDate,

          // This is the account that you already tested successfully
          

          projectLineProperty: "Billable",
          currencyCode: "USD",
        },
      }
    );

    console.log("BC Expense Response:", data);

    if (error) {
      console.error("BC Edge Function Error:", error);
      alert(`Failed to create expense in BC:\n${error.message}`);
      return;
    }

    if (!data?.success) {
      console.error("BC Expense Failed:", data);
      alert(
        data?.error ||
        "BC expense journal creation failed"
      );
      return;
    }

    // -----------------------------------------
    // BC SUCCESS
    // -----------------------------------------

    console.log(
      "Expense created successfully:",
      data.journalBatchNumber
    );

    // Save/display expense in your app
    onAddExpense(wo.id, {
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: expenseDate,
      description: expenseDescription.trim(),

      // Keep BC information with the expense
      projectId: projId,
      activityNumber: actNum,
      journalBatchNumber: data.journalBatchNumber,
    });

    // Clear form
    setExpenseCategory("");
    setExpenseAmount("");
    setExpenseDate(today());
    setExpenseDescription("");

    alert(
      `Expense added successfully to BC.\n\nJournal: ${data.journalBatchNumber}`
    );

  } catch (err) {
    console.error("Expense journal error:", err);

    alert(
      `Failed to create BC expense:\n${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

  // Saving (local + BC Sales Line sync) is handled by onAddMaterial
  // itself (see addMaterial in the main component) — this just clears
  // the inputs once the call has been kicked off, same pattern as
  // the Technician Labor Log's "Add".
  const handleAddMaterial = async () => {
    if (!materialItem.trim() || !materialQty) return;
    await onAddMaterial(wo.id, materialItem, materialQty);
    setMaterialItem("");
    setMaterialQty("");
  };

  const materials = wo.materials || [];

  const formatTimestamp = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const datePart = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${datePart} • ${timePart}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,9,11,0.72)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowY: "auto",
        padding: "40px 20px",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 680,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          background: COLORS.panel,
          border: `1px solid ${COLORS.lineLight}`,
          borderRadius: 10,
          padding: 30,
          boxShadow: "0 30px 70px -20px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 25,
            borderBottom: `1px solid ${COLORS.line}`,
            paddingBottom: 15,
          }}
        >
          <div>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 28, fontWeight: 600, color: COLORS.bone, letterSpacing: 0.2 }}>
              {wo.bcWorkOrderId || wo.woNumber || wo.reportNumber}
            </div>

            {wo.bcWorkOrderId && (
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: COLORS.moss,
                  fontWeight: 600,
                  background: COLORS.mossDim,
                  border: `1px solid ${COLORS.moss}33`,
                  borderRadius: 20,
                  padding: "3px 10px 3px 8px",
                }}
              >
                <CheckCircle2 size={13} /> Synced with Business Central
              </div>
            )}

            <div style={{ color: COLORS.steelLight, marginTop: 10, fontSize: 19, fontWeight: 500 }}>
              {wo.title}
            </div>

            {wo.approvalStage && (
              <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: APPROVAL_STAGE_COLOR(wo.approvalStage) }}>
                {APPROVAL_STAGE_LABELS[wo.approvalStage]}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.line}`,
              color: COLORS.bone,
              padding: "8px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
        </div>

        <ApprovalStageTracker wo={wo} />

        {isLocked && (
          <div
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderLeft: `3px solid ${COLORS.steelLight}`,
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 24,
              fontSize: 13,
              color: COLORS.ash,
            }}
          >
            This is a reported issue, not yet an official work order. Attachments, Checklist, Labor Log,
            Material Consumption, and Comments will unlock once a Manager approves it.
          </div>
        )}

        {canSubmitOnward && (
          <div
            style={{
              background: "#2A2415",
              border: `1px solid ${COLORS.ore}`,
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 13.5, color: COLORS.bone, marginBottom: 10, lineHeight: 1.5 }}>
              A Manager approved this and it's now a real work order. Add your checklist, labor hours,
              materials used, and any comments below — then submit it to Issue Department when ready.
            </div>
            <Btn onClick={() => onSubmitForApproval(wo.id)}>Submit to Issue Department</Btn>
          </div>
        )}

        {/* General Information */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 18, textAlign: "center" }}>
            General Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Asset</strong>
              <span>{asset ? `${asset.tag} — ${asset.name}` : "-"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Assigned To</strong>
              <span>{wo.assignedTo || "Unassigned"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Priority</strong>
              <span>{wo.priority}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Status</strong>
              <WOStatusPill status={wo.status} />
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Work Type</strong>
              <span>{wo.workType || "-"}</span>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 18, textAlign: "center" }}>
            Schedule
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Created Date</strong>
              <span>{wo.createdDate || "-"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Due Date</strong>
              <span>{wo.dueDate || "-"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Estimated Hours</strong>
              <span>{wo.estimatedHours || "-"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Estimated Cost</strong>
              <span>{wo.estimatedCost || "-"}</span>
            </div>
            <div style={{ display: "flex" }}>
              <strong style={{ width: 180 }}>Risk Level</strong>
              <span>{wo.riskLevel || "-"}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>Description</h3>
          <div
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 6,
              padding: 15,
              lineHeight: 1.7,
            }}
          >
            {wo.description || "No description available."}
          </div>
        </div>

        {!isLocked && (
          <>
            {/* Attachments */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>Attachments</h3>
              <div
                style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {!wo.attachments || wo.attachments.length === 0 ? (
                  <div style={{ padding: 20, color: COLORS.ash, textAlign: "center" }}>
                    No attachments yet.
                  </div>
                ) : (
                  wo.attachments.map((att, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderBottom: i < wo.attachments.length - 1 ? `1px solid ${COLORS.line}` : "none",
                      }}
                    >
                      <span style={{ color: COLORS.bone, fontSize: 13.5 }}>📎 {att.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {att.url ? (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: COLORS.steelLight, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
                          >
                            View →
                          </a>
                        ) : (
                          <span style={{ color: COLORS.ashDim, fontSize: 12 }}>No link</span>
                        )}
                        <button
                          onClick={() => onRemoveAttachment(wo.id, i)}
                          style={{ background: "transparent", border: "none", color: COLORS.alert, cursor: "pointer", fontSize: 13 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto",
                    gap: 8,
                    padding: 15,
                    borderTop: wo.attachments && wo.attachments.length > 0 ? `1px solid ${COLORS.line}` : "none",
                  }}
                >
                  <input
                    style={inputStyle}
                    placeholder="e.g. Service_Report.pdf"
                    value={attachName}
                    onChange={(e) => setAttachName(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="https://... link to file"
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                  />
                  <button
                    onClick={handleUploadAttachment}
                    disabled={!attachName.trim()}
                    style={{
                      background: attachName.trim() ? COLORS.steel : COLORS.panelAlt,
                      color: attachName.trim() ? "#0E1013" : COLORS.ashDim,
                      border: `1px solid ${attachName.trim() ? COLORS.steel : COLORS.line}`,
                      borderRadius: 4,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: attachName.trim() ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>
                Checklist {checklist.length > 0 ? `(${checklistDone}/${checklist.length})` : ""}
              </h3>
              <div
                style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {checklist.length === 0 ? (
                  <div style={{ padding: 20, color: COLORS.ash, textAlign: "center" }}>
                    No checklist items yet.
                  </div>
                ) : (
                  checklist.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom: i < checklist.length - 1 ? `1px solid ${COLORS.line}` : "none",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => onToggleChecklistItem(wo.id, item.id)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: COLORS.moss }}
                        />
                        <span
                          style={{
                            fontSize: 13.5,
                            color: item.done ? COLORS.ashDim : COLORS.bone,
                            textDecoration: item.done ? "line-through" : "none",
                          }}
                        >
                          {item.text}
                        </span>
                      </label>
                      <button
                        onClick={() => onRemoveChecklistItem(wo.id, item.id)}
                        style={{ background: "transparent", border: "none", color: COLORS.alert, cursor: "pointer", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: 15,
                    borderTop: checklist.length > 0 ? `1px solid ${COLORS.line}` : "none",
                  }}
                >
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="e.g. Lock out equipment"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklistItem(); }}
                  />
                  <button
                    onClick={handleAddChecklistItem}
                    disabled={!newChecklistItem.trim()}
                    style={{
                      background: newChecklistItem.trim() ? COLORS.steel : COLORS.panelAlt,
                      color: newChecklistItem.trim() ? "#0E1013" : COLORS.ashDim,
                      border: `1px solid ${newChecklistItem.trim() ? COLORS.steel : COLORS.line}`,
                      borderRadius: 4,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: newChecklistItem.trim() ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Add item
                  </button>
                </div>
              </div>
            </div>

            {/* Assignment Details */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>Assignment Details</h3>
              <div
                style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", rowGap: 12 }}>
                  <strong style={{ color: COLORS.ash }}>Worker Group</strong>
                  <span style={{ color: COLORS.bone }}>{wo.workerGroup || "-"}</span>

                  <strong style={{ color: COLORS.ash }}>Assigned Technician</strong>
                  <span style={{ color: COLORS.bone }}>
                    {(() => {
                      const firstTech = wo.firstAssignedTechnician || wo.assignedTo;
                      if (!firstTech) return "Unassigned";
                      const w = (workers || []).find((x) => x.personnel_number === firstTech);
                      return w?.worker_name || firstTech;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Technician Assignment Controls */}
            <div style={{ marginBottom: 25 }}>
              <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>Technician Assignment</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <select
                  style={inputStyle}
                  value={workerGroup}
                  onChange={(e) => {
                    setWorkerGroup(e.target.value);
                    setTechnician("");
                  }}
                >
                  <option value="" disabled>Select Worker Group</option>
                  {[...new Set((workers || []).map((w) => (w.worker_group || "").trim()).filter((g) => g !== ""))].map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>

                <select
                  style={inputStyle}
                  value={technician}
                  onChange={(e) => {
                    setTechnician(e.target.value);
                    // Also fill the Labor Log's technician picker, so the
                    // person doesn't have to pick the same name twice.
                    setLaborTech(e.target.value);
                  }}
                >
                  <option value="">Select Technician</option>
                  {filteredWorkers.map((worker) => (
                    <option key={worker.personnel_number} value={worker.personnel_number}>
                      {worker.worker_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <Btn onClick={() => onAssignTechnician(wo.id, workerGroup, technician)}>
                  Save Assignment
                </Btn>
              </div>
            </div>

            {/* Technician Labor Log */}
            <div style={{ marginBottom: 30 }}>
              <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>Technician Labor Log</h3>
              <div
                style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {laborLog.length === 0 ? (
                  <div style={{ padding: 20, color: COLORS.ash, textAlign: "center" }}>
                    No labor logged yet.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 100px 40px",
                        padding: "8px 16px",
                        fontSize: 11,
                        color: COLORS.ashDim,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${COLORS.line}`,
                      }}
                    >
                      <div>TECHNICIAN</div>
                      <div>HOURS</div>
                      <div></div>
                    </div>
                    {laborLog.map((entry, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 100px 40px",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: i < laborLog.length - 1 ? `1px solid ${COLORS.line}` : "none",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: COLORS.bone }}>
                          {workers.find((w) => w.personnel_number === entry.technician)?.worker_name || entry.technician}
                        </div>
                        <div style={{ color: COLORS.ash, fontFamily: "JetBrains Mono, monospace" }}>{entry.hours}</div>
                        <button
                          onClick={() => onRemoveLaborEntry(wo.id, i)}
                          style={{ background: "transparent", border: "none", color: COLORS.alert, cursor: "pointer", fontSize: 13 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderBottom: `1px solid ${COLORS.line}`,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: COLORS.bone }}>Total Hours</span>
                      <span style={{ color: COLORS.steelLight, fontFamily: "JetBrains Mono, monospace" }}>{totalHours}</span>
                    </div>
                  </>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px auto auto", gap: 8, padding: 15 }}>
                  <select style={inputStyle} value={laborTech} onChange={(e) => setLaborTech(e.target.value)}>
                    <option value="">Select Technician</option>
                    {(workers || []).map((w) => (
                      <option key={w.personnel_number} value={w.personnel_number}>
                        {w.worker_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    style={inputStyle}
                    placeholder="Hours"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                  />
                  <button
                    onClick={handleAddLabor}
                    disabled={!laborTech.trim() || !laborHours || laborSubmitting}
                    style={{
                      background: laborTech.trim() && laborHours && !laborSubmitting ? COLORS.steel : COLORS.panelAlt,
                      color: laborTech.trim() && laborHours && !laborSubmitting ? "#0E1013" : COLORS.ashDim,
                      border: `1px solid ${laborTech.trim() && laborHours && !laborSubmitting ? COLORS.steel : COLORS.line}`,
                      borderRadius: 4,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: laborTech.trim() && laborHours && !laborSubmitting ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {laborSubmitting ? "Adding…" : "Add"}
                  </button>
                  <button
                    onClick={handlePostToJournal}
                    disabled={!laborTech.trim() || !laborHours || journalSubmitting}
                    style={{
                      background: laborTech.trim() && laborHours && !journalSubmitting ? COLORS.ore : COLORS.panelAlt,
                      color: laborTech.trim() && laborHours && !journalSubmitting ? "#0E1013" : COLORS.ashDim,
                      border: `1px solid ${laborTech.trim() && laborHours && !journalSubmitting ? COLORS.ore : COLORS.line}`,
                      borderRadius: 4,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: laborTech.trim() && laborHours && !journalSubmitting ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {journalSubmitting ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {/* Material Consumption */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ color: COLORS.steelLight, margin: 0 }}>Material Consumption</h3>
                {isAdmin && (
                  <button
                    onClick={pullItemsFromBc}
                    disabled={pullingItems}
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.line}`,
                      color: COLORS.steelLight,
                      borderRadius: 4,
                      padding: "6px 12px",
                      fontSize: 12,
                      cursor: pullingItems ? "not-allowed" : "pointer",
                      opacity: pullingItems ? 0.6 : 1,
                    }}
                  >
                    {pullingItems ? "Pulling…" : "Pull Items from Business Central"}
                  </button>
                )}
              </div>
              {pullItemsMsg && (
                <div style={{ marginBottom: 10, fontSize: 12.5, color: pullItemsMsg.startsWith("Pulled") ? COLORS.moss : COLORS.alert }}>
                  {pullItemsMsg}
                </div>
              )}
              <div
                style={{
                  background: COLORS.panelAlt,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {materials.length === 0 ? (
                  <div style={{ padding: 20, color: COLORS.ash, textAlign: "center" }}>
                    No materials logged yet.
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 80px 40px",
                        padding: "8px 16px",
                        fontSize: 11,
                        color: COLORS.ashDim,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${COLORS.line}`,
                      }}
                    >
                      <div>ITEM</div>
                      <div>QTY</div>
                      <div></div>
                    </div>
                    {materials.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 40px",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderBottom: i < materials.length - 1 ? `1px solid ${COLORS.line}` : "none",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: COLORS.bone }}>{m.item}</div>
                        <div style={{ color: COLORS.ash, fontFamily: "JetBrains Mono, monospace" }}>{m.qty}</div>
                        <button
                          onClick={() => onRemoveMaterial(wo.id, i)}
                          style={{ background: "transparent", border: "none", color: COLORS.alert, cursor: "pointer", fontSize: 13 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 8, padding: 15 }}>
                  <select
                    style={inputStyle}
                    value={materialItem}
                    onChange={(e) => setMaterialItem(e.target.value)}
                  >
                    <option value="">Select Material</option>
                    {[...new Map((bcItems || []).map((item) => [item.item_id, item])).values()].map((item) => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_id} - {item.product_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    style={inputStyle}
                    placeholder="Qty"
                    value={materialQty}
                    onChange={(e) => setMaterialQty(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddMaterial(); }}
                  />
                  <button
                    onClick={handleAddMaterial}
                    disabled={!materialItem.trim() || !materialQty}
                    style={{
                      background: materialItem.trim() && materialQty ? COLORS.steel : COLORS.panelAlt,
                      color: materialItem.trim() && materialQty ? "#0E1013" : COLORS.ashDim,
                      border: `1px solid ${materialItem.trim() && materialQty ? COLORS.steel : COLORS.line}`,
                      borderRadius: 4,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: materialItem.trim() && materialQty ? "pointer" : "not-allowed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Add Material
                  </button>
                </div>
              </div>
            </div>

            {/* ================= EXPENSE ================= */}
<div style={{ marginBottom: 28 }}>

  <h3
    style={{
      color: COLORS.steelLight,
      fontSize: 22,
      fontWeight: 700,
      margin: "0 0 14px",
      textAlign: "center",
    }}
  >
    Expense
  </h3>

  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 6,
      overflow: "hidden",
    }}
  >

    {/* Expense table header */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 130px 140px 45px",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: `1px solid ${COLORS.line}`,
        color: COLORS.ashDim,
        fontSize: 11,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
      }}
    >
      <div>Category</div>
      <div>Amount</div>
      <div>Date</div>
      <div></div>
    </div>

    {/* Existing expenses */}
    {(wo.expenses || []).map((expense, index) => (
      <div
        key={expense.id || index}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 130px 140px 45px",
          alignItems: "center",
          minHeight: 52,
          padding: "0 16px",
          borderBottom: `1px solid ${COLORS.line}`,
          fontSize: 13,
        }}
      >
        <div
          style={{
            color: COLORS.bone,
            fontWeight: 500,
          }}
        >
          {expense.category}
        </div>

        <div
          style={{
            color: COLORS.bone,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {Number(expense.amount || 0).toFixed(2)}
        </div>

        <div style={{ color: COLORS.ash }}>
          {expense.date}
        </div>

        <button
          onClick={() => {
            const updatedExpenses = (wo.expenses || []).filter(
              (_, i) => i !== index
            );

            patchWorkOrder(
              wo.id,
              () => ({
                expenses: updatedExpenses,
              }),
              {
                action: `Removed expense: ${expense.category}`,
                actor: profile.name,
                timestamp: now(),
              }
            );
          }}
          title="Remove expense"
          style={{
            background: "transparent",
            border: "none",
            color: "#ff5c5c",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>
    ))}

    {/* Empty state */}
    {(wo.expenses || []).length === 0 && (
      <div
        style={{
          padding: "20px 16px",
          textAlign: "center",
          color: COLORS.ashDim,
          fontSize: 13,
        }}
      >
        No expenses logged yet.
      </div>
    )}

    {/* Add expense row */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 130px 125px",
        gap: 8,
        padding: 14,
        alignItems: "center",
      }}
    >

      {/* Category */}
      <select
        value={expenseCategory}
        onChange={(e) => setExpenseCategory(e.target.value)}
        style={{
          ...inputStyle,
          width: "100%",
          height: 38,
          cursor: "pointer",
        }}
      >
        <option value="">Select Category</option>

        <option value="Car Rental">Car Rental</option>
        <option value="Conference">Conference</option>
        <option value="Flights">Flights</option>
        <option value="Fuel">Fuel</option>
        <option value="Hotel">Hotel</option>
        <option value="Maintenance expenses">
          Maintenance expenses
        </option>
        <option value="Meal">Meal</option>
        <option value="Taxi">Taxi</option>
        <option value="Travel">Travel</option>
      </select>

      {/* Amount */}
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Amount"
        value={expenseAmount}
        onChange={(e) => setExpenseAmount(e.target.value)}
        style={{
          ...inputStyle,
          height: 38,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {/* Date */}
      <input
        type="date"
        value={expenseDate}
        onChange={(e) => setExpenseDate(e.target.value)}
        style={{
          ...inputStyle,
          height: 38,
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {/* Add button */}
      <button
        onClick={handleAddExpense}
        disabled={!expenseCategory || !expenseAmount}
        style={{
          height: 38,
          borderRadius: 4,
          border: `1px solid ${
            expenseCategory && expenseAmount
              ? COLORS.steel
              : COLORS.line
          }`,
          background:
            expenseCategory && expenseAmount
              ? COLORS.steel
              : "transparent",
          color:
            expenseCategory && expenseAmount
              ? "#111"
              : COLORS.ashDim,
          fontSize: 12,
          fontWeight: 600,
          cursor:
            expenseCategory && expenseAmount
              ? "pointer"
              : "not-allowed",
          whiteSpace: "nowrap",
        }}
      >
        + Add Expense
      </button>
    </div>

    {/* Description */}
    <div
      style={{
        padding: "0 14px 14px",
      }}
    >
      <input
        type="text"
        placeholder="Expense description (optional)"
        value={expenseDescription}
        onChange={(e) =>
          setExpenseDescription(e.target.value)
        }
        style={{
          ...inputStyle,
          width: "100%",
          height: 38,
          boxSizing: "border-box",
        }}
      />
    </div>

  </div>
</div>

            

            {/* Comments / Activity Timeline Section */}
<div style={{ marginBottom: 30 }}>
  <h3 style={{ color: COLORS.steelLight, marginBottom: 15 }}>
    Comments & Activity
  </h3>
  <div
    style={{
      background: COLORS.panelAlt,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 6,
      padding: 15,
    }}
  >
    {/* Post Comment Input */}
    <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
      <input
        style={{ ...inputStyle, flex: 1 }}
        placeholder="Write a comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handlePost();
        }}
      />
      <button
        onClick={handlePost}
        disabled={!comment.trim()}
        style={{
          background: comment.trim() ? COLORS.steel : COLORS.panelAlt,
          color: comment.trim() ? "#0E1013" : COLORS.ashDim,
          border: `1px solid ${comment.trim() ? COLORS.steel : COLORS.line}`,
          borderRadius: 4,
          padding: "9px 16px",
          fontWeight: 600,
          cursor: comment.trim() ? "pointer" : "not-allowed",
        }}
      >
        Post
      </button>

      
    </div>

              {/* Activity Feed / Timeline */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activity.length === 0 ? (
                  <div style={{ color: COLORS.ash, fontSize: 13, textAlign: "center", padding: 10 }}>
                    No comments or activity logged yet.
                  </div>
                ) : (
                  activity.map((act, index) => {
                    // Extracts author/actor from Supabase JSON or user comment object
                    const authorName =
                      typeof act === "object"
                        ? act.actor || act.author || act.user || "User"
                        : "User";

                    // Extracts activity action/text/comment
                    const logMessage =
                      typeof act === "object"
                        ? act.action || act.text || act.comment || act.message || ""
                        : String(act);

                    const rawTime = typeof act === "object" ? (act.timestamp || act.date || act.created_at) : null;
                    const timeString = rawTime ? formatTimestamp(rawTime) : "";

                    return (
                      <div
                        key={index}
                        style={{
                          borderBottom:
                            index < activity.length - 1
                              ? `1px solid ${COLORS.line}`
                              : "none",
                          paddingBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: COLORS.ashDim,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <strong style={{ color: COLORS.steelLight }}>{authorName}</strong>
                          {timeString && <span>• {timeString}</span>}
                        </div>
                        
                        {/* Activity Message Text */}
                        <div
                          style={{
                            fontSize: 13.5,
                            color: COLORS.bone,
                            marginTop: 4,
                            lineHeight: 1.4,
                          }}
                        >
                          {logMessage}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function MeterReadingPage({ assets, onSave }) {
  const [values, setValues] = React.useState({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Meter Readings</h2>
        <p className="text-gray-400">
          Update daily meter readings for all assets.
        </p>
      </div>

      <div className="rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-3">Asset</th>
              <th className="text-left p-3">Current Meter</th>
              <th className="text-left p-3">New Reading</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t border-gray-800">
                <td className="p-3">
                  {asset.assetId || asset.id}
                </td>

                <td className="p-3">
                  {asset.meterReading || 0} km
                </td>

                <td className="p-3">
                  <input
                    type="number"
                    className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-32"
                    value={values[asset.id] || ""}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [asset.id]: e.target.value,
                      })
                    }
                  />
                </td>

                <td className="p-3">
                  <button
                    className="bg-blue-600 px-4 py-2 rounded"
                    onClick={() =>
                      onSave(asset.id, Number(values[asset.id]))
                    }
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
