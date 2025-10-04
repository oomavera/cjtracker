"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DateInput from "./components/DateInput";
import { isSupabaseConfigured, fetchAllCustomers, mapStateToRows, reduceRowsToState, upsertCustomers, deleteCustomer as dbDelete } from "../lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInputToLocalMidnight(value) {
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function diffDaysLocal(startDate, now) {
  const a = startOfLocalDay(startDate).getTime();
  const b = startOfLocalDay(now).getTime();
  const diff = Math.floor((b - a) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
}

function isoToDateInputValue(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function percentBetweenDates(bookISO, cleanISO, nowDate) {
  const book = startOfLocalDay(new Date(bookISO)).getTime();
  const clean = startOfLocalDay(new Date(cleanISO)).getTime();
  const now = startOfLocalDay(nowDate).getTime();
  if (!Number.isFinite(book) || !Number.isFinite(clean)) return 0;
  if (clean <= book) return now >= clean ? 100 : 0;
  const pct = Math.floor(((now - book) / (clean - book)) * 100);
  return Math.max(0, Math.min(100, pct));
}

export default function Page() {
  const [leads, setLeads] = useState([]);
  const [todayTick, setTodayTick] = useState(() => startOfLocalDay(new Date()).getTime());
  const [nameInput, setNameInput] = useState("");
  const PLATFORMS = ["LSA","FACEBOOK","THUMBTACK","ORGANIC","GOOGLE ADS","REFERRAL"];
  const [platformInput, setPlatformInput] = useState(PLATFORMS[0]);
  const [dateInput, setDateInput] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);
  // NO REBOOK state
  const [nrLeads, setNrLeads] = useState([]);
  const [nrNameInput, setNrNameInput] = useState("");
  const [nrDateInput, setNrDateInput] = useState("");
  const [nrPlatformInput, setNrPlatformInput] = useState(PLATFORMS[0]);
  const [nrSelectedDay, setNrSelectedDay] = useState(null);
  const [nrEditingId, setNrEditingId] = useState(null);
  const [closed, setClosed] = useState([]);
  const [saidNo, setSaidNo] = useState([]);
  const [selectedPercent, setSelectedPercent] = useState(null);
  const [editingClosedId, setEditingClosedId] = useState(null);
  const [closedName, setClosedName] = useState("");
  const [bookInput, setBookInput] = useState("");
  const [cleanInput, setCleanInput] = useState("");
  const [closedPlatform, setClosedPlatform] = useState(PLATFORMS[0]);
  const [showClosedConfirmTouch, setShowClosedConfirmTouch] = useState(false);
  const [showClosedConfirmNotes, setShowClosedConfirmNotes] = useState(false);
  const [closedConfirmNotes, setClosedConfirmNotes] = useState("");
  const [closedConfirmCopyMsg, setClosedConfirmCopyMsg] = useState("");

  // Load saved notes for Closed confirmation touchpoint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isSupabaseConfigured()) {
          const { getTouchpointNote } = await import("../lib/db");
          const { content } = await getTouchpointNote("closed:0");
          if (!cancelled) setClosedConfirmNotes(content || "");
          return;
        }
      } catch {}
      try {
        const saved = localStorage.getItem("cjtracker:touch:closed:0:notes");
        if (!cancelled && typeof saved === "string") setClosedConfirmNotes(saved);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveClosedConfirmNotes() {
    try {
      if (isSupabaseConfigured()) {
        const { setTouchpointNote } = await import("../lib/db");
        await setTouchpointNote("closed:0", closedConfirmNotes || "");
      } else {
        localStorage.setItem("cjtracker:touch:closed:0:notes", closedConfirmNotes || "");
      }
    } catch {}
  }

  async function copyClosedConfirmNotes() {
    try {
      await navigator.clipboard.writeText(closedConfirmNotes || "");
      setClosedConfirmCopyMsg("Copied");
      setTimeout(() => setClosedConfirmCopyMsg(""), 1200);
    } catch {}
  }

  // Pending transitions and data views
  const [pendingCloseFor, setPendingCloseFor] = useState(null);
  const [pendingCloseStage, setPendingCloseStage] = useState(null);
  const [pendingBook, setPendingBook] = useState("");
  const [pendingClean, setPendingClean] = useState("");
  const [nrPendingCloseFor, setNrPendingCloseFor] = useState(null);
  const [nrPendingCloseStage, setNrPendingCloseStage] = useState(null);
  const [nrPendingBook, setNrPendingBook] = useState("");
  const [nrPendingClean, setNrPendingClean] = useState("");
  const [viewLeadDataId, setViewLeadDataId] = useState(null);
  const [viewNrDataId, setViewNrDataId] = useState(null);
  const [viewClosedDataId, setViewClosedDataId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { list: 'leads'|'nr'|'closed', id }

  // Add form toggles
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showNrForm, setShowNrForm] = useState(false);
  const [showClosedForm, setShowClosedForm] = useState(false);
  const [showSaidNoForm, setShowSaidNoForm] = useState(false);
  const [snNameInput, setSnNameInput] = useState("");
  const [snPlatformInput, setSnPlatformInput] = useState(PLATFORMS[0]);
  const [snDateInput, setSnDateInput] = useState("");
  const [snSelectedDay, setSnSelectedDay] = useState(null);
  const [snEditingId, setSnEditingId] = useState(null);

  useEffect(() => {
    (async () => {
      if (isSupabaseConfigured()) {
        try {
          const rows = await fetchAllCustomers();
          if (Array.isArray(rows) && rows.length > 0) {
            const next = reduceRowsToState(rows);
            setLeads(next.leads);
            setNrLeads(next.nrLeads);
            setClosed(next.closed);
            setSaidNo(next.saidNo);
            return;
          }
          // Supabase is empty: fall back to localStorage, then push up to Supabase once
          try {
            const lsLeads = JSON.parse(localStorage.getItem("cjtracker:leads") || "[]");
            const lsNr = JSON.parse(localStorage.getItem("cjtracker:norebook") || "[]");
            const lsClosed = JSON.parse(localStorage.getItem("cjtracker:closed") || "[]");
            const lsSaidNo = JSON.parse(localStorage.getItem("cjtracker:saidno") || "[]");
            const withDefaults = {
              leads: Array.isArray(lsLeads) ? lsLeads.map((l) => ({ ...l, journeyState: l.journeyState || "Not Closed" })) : [],
              nrLeads: Array.isArray(lsNr) ? lsNr.map((l) => ({ ...l, journeyState: l.journeyState || "Not REBOOKED" })) : [],
              closed: Array.isArray(lsClosed) ? lsClosed.map((l) => ({ ...l, journeyState: l.journeyState || "Closed1" })) : [],
              saidNo: Array.isArray(lsSaidNo) ? lsSaidNo.map((l) => ({ ...l, journeyState: l.journeyState || "SAID NO" })) : [],
            };
            setLeads(withDefaults.leads);
            setNrLeads(withDefaults.nrLeads);
            setClosed(withDefaults.closed);
            setSaidNo(withDefaults.saidNo);
            // Push local data up
            const rowsToUpsert = mapStateToRows(withDefaults);
            upsertCustomers(rowsToUpsert);
            return;
          } catch {}
        } catch {}
      }
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("cjtracker:leads");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const withJourney = parsed.map((l) => ({
              ...l,
              journeyState: l.journeyState || "Not Closed",
            }));
            setLeads(withJourney);
          }
        } else {
          const todayStart = startOfLocalDay(new Date()).getTime();
          const fourDaysAgo = new Date(todayStart - 4 * MS_PER_DAY);
          setLeads([
            {
              id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              name: "AJ",
              startDate: fourDaysAgo.toISOString(),
              journeyState: "Not Closed",
            },
          ]);
        }
      } catch {
        setLeads([]);
      }
    })();
  }, []);

  // One-time migration: if Supabase is configured, push any existing localStorage data to Supabase, then clear localStorage
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      if (localStorage.getItem("cjtracker:migrated") === "1") return;
      const lsLeads = JSON.parse(localStorage.getItem("cjtracker:leads") || "[]");
      const lsNr = JSON.parse(localStorage.getItem("cjtracker:norebook") || "[]");
      const lsClosed = JSON.parse(localStorage.getItem("cjtracker:closed") || "[]");
      const lsSaidNo = JSON.parse(localStorage.getItem("cjtracker:saidno") || "[]");
      const snapshot = {
        leads: Array.isArray(lsLeads) ? lsLeads : [],
        nrLeads: Array.isArray(lsNr) ? lsNr : [],
        closed: Array.isArray(lsClosed) ? lsClosed : [],
        saidNo: Array.isArray(lsSaidNo) ? lsSaidNo : [],
      };
      const hasAny = snapshot.leads.length || snapshot.nrLeads.length || snapshot.closed.length || snapshot.saidNo.length;
      if (!hasAny) return;
      const rows = mapStateToRows(snapshot);
      upsertCustomers(rows)
        .then(() => {
          try {
            localStorage.setItem("cjtracker:migrated", "1");
            localStorage.removeItem("cjtracker:leads");
            localStorage.removeItem("cjtracker:norebook");
            localStorage.removeItem("cjtracker:closed");
            localStorage.removeItem("cjtracker:saidno");
          } catch {}
        })
        .catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try { localStorage.setItem("cjtracker:leads", JSON.stringify(leads)); } catch {}
    }
    if (isSupabaseConfigured()) {
      const rows = mapStateToRows({ leads, nrLeads, closed, saidNo });
      upsertCustomers(rows);
    }
  }, [leads]);

  // NO REBOOK: load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cjtracker:norebook");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const withJourney = parsed.map((l) => ({
            ...l,
            journeyState: l.journeyState || "Not REBOOKED",
          }));
          setNrLeads(withJourney);
        }
      }
    } catch {}
  }, []);
  // SAID NO: load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cjtracker:saidno");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const withJourney = parsed.map((l) => ({
            ...l,
            journeyState: l.journeyState || "SAID NO",
          }));
          setSaidNo(withJourney);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try { localStorage.setItem("cjtracker:saidno", JSON.stringify(saidNo)); } catch {}
    }
    if (isSupabaseConfigured()) {
      const rows = mapStateToRows({ leads, nrLeads, closed, saidNo });
      upsertCustomers(rows);
    }
  }, [saidNo]);


  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try { localStorage.setItem("cjtracker:norebook", JSON.stringify(nrLeads)); } catch {}
    }
    if (isSupabaseConfigured()) {
      const rows = mapStateToRows({ leads, nrLeads, closed, saidNo });
      upsertCustomers(rows);
    }
  }, [nrLeads]);

  useEffect(() => {
    function scheduleNextMidnight() {
      const now = new Date();
      const start = startOfLocalDay(now);
      const next = new Date(start.getTime() + MS_PER_DAY);
      const delay = Math.max(1000, next.getTime() - now.getTime());
      const t = setTimeout(() => {
        setTodayTick(startOfLocalDay(new Date()).getTime());
      }, delay);
      return t;
    }
    const timeoutId = scheduleNextMidnight();
    return () => clearTimeout(timeoutId);
  }, []);

  const totalDays = 90;
  const pixelsPerDay = 32;
  const leftPadding = 24;
  const rightPadding = 24;
  const width = leftPadding + rightPadding + totalDays * pixelsPerDay;
  const notClosedScrollRef = useRef(null);
  const noRebookScrollRef = useRef(null);

  const groups = useMemo(() => {
    const map = new Map();
    for (const lead of leads) {
      const day = diffDaysLocal(new Date(lead.startDate), new Date(todayTick));
      const clampedDay = Math.max(0, Math.min(totalDays, day));
      const bucket = map.get(clampedDay) || [];
      bucket.push({ ...lead, clampedDay });
      map.set(clampedDay, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [leads, todayTick]);

  const countsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of groups) m.set(dayIndex, bucket.length);
    return m;
  }, [groups]);

  // NO REBOOK groups/maps (0-90)
  const nrGroups = useMemo(() => {
    const map = new Map();
    for (const item of nrLeads) {
      const day = diffDaysLocal(new Date(item.startDate), new Date(todayTick));
      const clampedDay = Math.max(0, Math.min(totalDays, day));
      const bucket = map.get(clampedDay) || [];
      bucket.push({ ...item, clampedDay });
      map.set(clampedDay, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [nrLeads, todayTick]);

  const nrCountsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of nrGroups) m.set(dayIndex, bucket.length);
    return m;
  }, [nrGroups]);

  const nrBucketsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of nrGroups) m.set(dayIndex, bucket);
    return m;
  }, [nrGroups]);

  // SAID NO groups/maps (still bucketed by days, labeled in months)
  const saidNoGroups = useMemo(() => {
    const map = new Map();
    for (const item of saidNo) {
      const day = diffDaysLocal(new Date(item.startDate), new Date(todayTick));
      const clampedDay = Math.max(0, Math.min(180, day)); // 6 months ~ 180 days for bucket cap
      const bucket = map.get(clampedDay) || [];
      bucket.push({ ...item, clampedDay });
      map.set(clampedDay, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [saidNo, todayTick]);

  const saidNoCountsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of saidNoGroups) m.set(dayIndex, bucket.length);
    return m;
  }, [saidNoGroups]);

  const saidNoBucketsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of saidNoGroups) m.set(dayIndex, bucket);
    return m;
  }, [saidNoGroups]);

  const bucketsByDay = useMemo(() => {
    const m = new Map();
    for (const [dayIndex, bucket] of groups) m.set(dayIndex, bucket);
    return m;
  }, [groups]);

  // Closed groups/maps (0-100%)
  const closedGroups = useMemo(() => {
    const map = new Map();
    const today = new Date();
    for (const item of closed) {
      const pct = percentBetweenDates(item.bookDate, item.cleanDate, today);
      const clamped = Math.max(0, Math.min(100, pct));
      const bucket = map.get(clamped) || [];
      bucket.push({ ...item, pct: clamped });
      map.set(clamped, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [closed]);

  const countsByPct = useMemo(() => {
    const m = new Map();
    for (const [pct, bucket] of closedGroups) m.set(pct, bucket.length);
    return m;
  }, [closedGroups]);

  const bucketsByPct = useMemo(() => {
    const m = new Map();
    for (const [pct, bucket] of closedGroups) m.set(pct, bucket);
    return m;
  }, [closedGroups]);

  const ALL_STATES = [
    "Not Closed",
    "Not REBOOKED",
    "Closed1",
    "Closed2",
    "Closed3",
    "Closed4",
  ];

  function createHistoryEntry(prevState, startedAtISO, endedAtISO) {
    try {
      const days = diffDaysLocal(new Date(startedAtISO), new Date(endedAtISO));
      return { state: prevState, startedAt: startedAtISO, endedAt: endedAtISO, daysInState: days };
    } catch {
      return { state: prevState, startedAt: startedAtISO, endedAt: endedAtISO, daysInState: 0 };
    }
  }

  function handleLeadStateChange(lead, nextState) {
    if (!nextState || nextState === lead.journeyState) return;
    const nowISO = startOfLocalDay(new Date()).toISOString();
    const historyEntry = createHistoryEntry(lead.journeyState || "Not Closed", lead.startDate, nowISO);
    const nextHistory = Array.isArray(lead.history) ? [...lead.history, historyEntry] : [historyEntry];

    if (nextState.startsWith("Closed")) {
      // Require explicit book/clean dates
      setPendingCloseFor({ ...lead, history: nextHistory });
      setPendingCloseStage(nextState);
      setPendingBook(isoToDateInputValue(nowISO));
      setPendingClean(isoToDateInputValue(nowISO));
      return;
    }

    // Remove from leads
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));

    if (nextState === "Not REBOOKED") {
      const moved = {
        id: lead.id,
        name: lead.name,
        startDate: nowISO,
        platform: lead.platform,
        journeyState: "Not REBOOKED",
        history: nextHistory,
      };
      setNrLeads((prev) => [...prev, moved]);
      return;
    }

    // Otherwise remain Not Closed (should not happen due to early return), but safe-guard
    setLeads((prev) => [...prev, { ...lead, journeyState: "Not Closed", history: nextHistory }]);
  }

  function handleNrStateChange(item, nextState) {
    if (!nextState || nextState === item.journeyState) return;
    const nowISO = startOfLocalDay(new Date()).toISOString();
    const historyEntry = createHistoryEntry(item.journeyState || "Not REBOOKED", item.startDate, nowISO);
    const nextHistory = Array.isArray(item.history) ? [...item.history, historyEntry] : [historyEntry];

    if (nextState.startsWith("Closed")) {
      setNrPendingCloseFor({ ...item, history: nextHistory });
      setNrPendingCloseStage(nextState);
      setNrPendingBook(isoToDateInputValue(nowISO));
      setNrPendingClean(isoToDateInputValue(nowISO));
      return;
    }

    // Remove from nr list
    setNrLeads((prev) => prev.filter((l) => l.id !== item.id));

    if (nextState === "Not Closed") {
      const moved = {
        id: item.id,
        name: item.name,
        startDate: nowISO,
        platform: item.platform,
        journeyState: "Not Closed",
        history: nextHistory,
      };
      setLeads((prev) => [...prev, moved]);
      return;
    }

    // Otherwise remain Not REBOOKED
    setNrLeads((prev) => [...prev, { ...item, journeyState: "Not REBOOKED", history: nextHistory }]);
  }

  function handleClosedStateChange(item, nextState) {
    if (!nextState || nextState === item.journeyState) return;
    const nowISO = startOfLocalDay(new Date()).toISOString();
    const stageStart = item.journeyStageStartedAt || item.bookDate || nowISO;
    const historyEntry = createHistoryEntry(item.journeyState || "Closed1", stageStart, nowISO);
    const nextHistory = Array.isArray(item.history) ? [...item.history, historyEntry] : [historyEntry];

    if (nextState.startsWith("Closed")) {
      setClosed((prev) => prev.map((i) => (i.id === item.id ? { ...i, journeyState: nextState, history: nextHistory, journeyStageStartedAt: nowISO } : i)));
      return;
    }

    // Move out of closed
    setClosed((prev) => prev.filter((i) => i.id !== item.id));

    if (nextState === "Not Closed") {
      const moved = {
        id: item.id,
        name: item.name,
        startDate: nowISO,
        platform: item.platform,
        journeyState: "Not Closed",
        history: nextHistory,
      };
      setLeads((prev) => [...prev, moved]);
      return;
    }

    // To Not REBOOKED
    const moved = {
      id: item.id,
      name: item.name,
      startDate: nowISO,
      platform: item.platform,
      journeyState: "Not REBOOKED",
      history: nextHistory,
    };
    setNrLeads((prev) => [...prev, moved]);
  }

  function handleSaidNoStateChange(item, nextState) {
    if (!nextState || nextState === item.journeyState) return;
    const nowISO = startOfLocalDay(new Date()).toISOString();
    const historyEntry = createHistoryEntry(item.journeyState || "SAID NO", item.startDate, nowISO);
    const nextHistory = Array.isArray(item.history) ? [...item.history, historyEntry] : [historyEntry];

    // Remove from said no
    setSaidNo((prev) => prev.filter((l) => l.id !== item.id));

    if (nextState === "Not Closed") {
      const moved = { id: item.id, name: item.name, startDate: nowISO, platform: item.platform, journeyState: "Not Closed", history: nextHistory };
      setLeads((prev) => [...prev, moved]);
      return;
    }
    if (nextState === "Not REBOOKED") {
      const moved = { id: item.id, name: item.name, startDate: nowISO, platform: item.platform, journeyState: "Not REBOOKED", history: nextHistory };
      setNrLeads((prev) => [...prev, moved]);
      return;
    }
    if (nextState.startsWith("Closed")) {
      const moved = { id: item.id, name: item.name, bookDate: nowISO, cleanDate: nowISO, platform: item.platform, journeyState: nextState, history: nextHistory, journeyStageStartedAt: nowISO };
      setClosed((prev) => [...prev, moved]);
      return;
    }
    // Default: return to Said No
    setSaidNo((prev) => [...prev, { ...item, journeyState: "SAID NO", history: nextHistory }]);
  }

  function confirmLeadClose() {
    if (!pendingCloseFor || !pendingCloseStage || !pendingBook || !pendingClean) return;
    const book = parseDateInputToLocalMidnight(pendingBook).toISOString();
    const clean = parseDateInputToLocalMidnight(pendingClean).toISOString();
    // Remove from leads
    setLeads((prev) => prev.filter((l) => l.id !== pendingCloseFor.id));
    const moved = {
      id: pendingCloseFor.id,
      name: pendingCloseFor.name,
      bookDate: book,
      cleanDate: clean,
      platform: pendingCloseFor.platform,
      journeyState: pendingCloseStage,
      history: pendingCloseFor.history,
      journeyStageStartedAt: book,
    };
    setClosed((prev) => [...prev, moved]);
    setPendingCloseFor(null);
    setPendingCloseStage(null);
    setPendingBook("");
    setPendingClean("");
  }

  function cancelLeadClose() {
    setPendingCloseFor(null);
    setPendingCloseStage(null);
    setPendingBook("");
    setPendingClean("");
  }

  function confirmNrClose() {
    if (!nrPendingCloseFor || !nrPendingCloseStage || !nrPendingBook || !nrPendingClean) return;
    const book = parseDateInputToLocalMidnight(nrPendingBook).toISOString();
    const clean = parseDateInputToLocalMidnight(nrPendingClean).toISOString();
    // Remove from NR leads
    setNrLeads((prev) => prev.filter((l) => l.id !== nrPendingCloseFor.id));
    const moved = {
      id: nrPendingCloseFor.id,
      name: nrPendingCloseFor.name,
      bookDate: book,
      cleanDate: clean,
      platform: nrPendingCloseFor.platform,
      journeyState: nrPendingCloseStage,
      history: nrPendingCloseFor.history,
      journeyStageStartedAt: book,
    };
    setClosed((prev) => [...prev, moved]);
    setNrPendingCloseFor(null);
    setNrPendingCloseStage(null);
    setNrPendingBook("");
    setNrPendingClean("");
  }

  function cancelNrClose() {
    setNrPendingCloseFor(null);
    setNrPendingCloseStage(null);
    setNrPendingBook("");
    setNrPendingClean("");
  }

  function confirmDeleteYes() {
    if (!confirmDelete) return;
    const { list, id } = confirmDelete;
    if (list === 'leads') setLeads((prev) => prev.filter((l) => l.id !== id));
    if (list === 'nr') setNrLeads((prev) => prev.filter((l) => l.id !== id));
    if (list === 'closed') setClosed((prev) => prev.filter((l) => l.id !== id));
    if (list === 'saidno') setSaidNo((prev) => prev.filter((l) => l.id !== id));
    try { dbDelete(id); } catch {}
    setConfirmDelete(null);
  }

  function confirmDeleteNo() { setConfirmDelete(null); }

  function addLead(e) {
    e.preventDefault();
    if (!nameInput.trim() || !dateInput) return;
    const date = parseDateInputToLocalMidnight(dateInput);
    const next = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: nameInput.trim(),
      startDate: date.toISOString(),
      platform: platformInput,
      journeyState: "Not Closed",
    };
    setLeads((prev) => [...prev, next]);
    setNameInput("");
    setDateInput("");
    setPlatformInput(PLATFORMS[0]);
  }

  function addNrLead(e) {
    e.preventDefault();
    if (!nrNameInput.trim() || !nrDateInput) return;
    const date = parseDateInputToLocalMidnight(nrDateInput);
    const next = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: nrNameInput.trim(),
      startDate: date.toISOString(),
      platform: nrPlatformInput,
      journeyState: "Not REBOOKED",
    };
    setNrLeads((prev) => [...prev, next]);
    setNrNameInput("");
    setNrDateInput("");
    setNrPlatformInput(PLATFORMS[0]);
  }

  function addSaidNo(e) {
    e.preventDefault();
    if (!snNameInput.trim() || !snDateInput) return;
    const date = parseDateInputToLocalMidnight(snDateInput);
    const next = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: snNameInput.trim(),
      startDate: date.toISOString(),
      platform: snPlatformInput,
      journeyState: "SAID NO",
    };
    setSaidNo((prev) => [...prev, next]);
    setSnNameInput("");
    setSnPlatformInput(PLATFORMS[0]);
    setSnDateInput("");
  }

  // Closed timeline: load/save
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cjtracker:closed");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const withJourney = arr.map((l) => ({
            ...l,
            journeyState: l.journeyState || "Closed1",
            journeyStageStartedAt: l.journeyStageStartedAt || l.bookDate || l.cleanDate || undefined,
          }));
          setClosed(withJourney);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      try { localStorage.setItem("cjtracker:closed", JSON.stringify(closed)); } catch {}
    }
    if (isSupabaseConfigured()) {
      const rows = mapStateToRows({ leads, nrLeads, closed, saidNo });
      upsertCustomers(rows);
    }
  }, [closed]);

  function addClosed(e) {
    e.preventDefault();
    if (!closedName.trim() || !bookInput || !cleanInput) return;
    const book = parseDateInputToLocalMidnight(bookInput);
    const clean = parseDateInputToLocalMidnight(cleanInput);
    const item = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: closedName.trim(),
      bookDate: book.toISOString(),
      cleanDate: clean.toISOString(),
      platform: closedPlatform,
      journeyState: "Closed1",
    };
    setClosed((prev) => [...prev, item]);
    setClosedName("");
    setBookInput("");
    setCleanInput("");
    setClosedPlatform(PLATFORMS[0]);
  }

  return (
    <main className="p-6 min-h-screen bg-black text-white">
      {/* Gmail Lead Notifications Setup */}
      <div className="mb-8 p-4 border border-blue-500 rounded-lg bg-blue-950/20">
        <h2 className="text-lg font-semibold text-blue-300 mb-2">📧 Gmail Lead Notifications</h2>
        <p className="text-sm text-blue-200 mb-3">Get instant Telegram notifications for "New Direct Lead" emails</p>
        <a 
          href="/quick-setup" 
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          🔗 Setup Gmail → Telegram Automation
        </a>
      </div>

      {/* Closed timeline (moved to top) */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Closed</h2>
        <p className="text-sm text-white/60">0% — 100% (Book → Clean)</p>
        <button type="button" onClick={() => setShowClosedForm((v) => !v)} className="rounded-md border border-white/30 bg-white px-3 py-1 text-sm text-black hover:bg-white/90">
          {showClosedForm ? "Close" : "Add"}
        </button>
      </section>
      {showClosedForm && (
      <form onSubmit={addClosed} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Name</span>
          <input value={closedName} onChange={(e) => setClosedName(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="Lead name" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Platform</span>
          <select value={closedPlatform} onChange={(e) => setClosedPlatform(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40">
            {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Book date (0%)</span>
          <DateInput value={bookInput} onChange={setBookInput} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Clean date (100%)</span>
          <DateInput value={cleanInput} onChange={setCleanInput} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" />
        </label>
        <button type="submit" className="h-[38px] rounded-md border border-white/20 bg-white px-3 text-sm text-black hover:bg-white/90">Add closed</button>
      </form>
      )}

      {(() => {
        const totalPct = 100;
        const pixelsPerPct = 10;
        const leftPad = 24;
        const rightPad = 24;
        const widthPct = leftPad + rightPad + totalPct * pixelsPerPct;
        return (
          <div className="relative mt-6 h-[600px] overflow-x-auto overflow-y-visible rounded-lg border border-black/20 bg-black p-6">
            <div className="absolute left-6 right-6 top-[120px] h-[2px] bg-white/25" />
            <div className="relative h-full" style={{ minWidth: widthPct }}>
              {Array.from({ length: totalPct + 1 }).map((_, p) => {
                const x = leftPad + p * pixelsPerPct;
                const count = countsByPct.get(p) || 0;
                const bucket = bucketsByPct.get(p) || [];
                return (
                  <div key={p}>
                    <div className="absolute top-24 h-7 w-px bg-white/30" style={{ left: x }} />
                    {p % 10 === 0 && (
                      <>
                        <div className="absolute top-32 -translate-x-1/2 text-xs text-white/70" style={{ left: x }}>
                          {p}%
                        </div>
                        <div className="absolute top-14 h-2 w-2 -translate-x-1/2 rounded-full bg-white" style={{ left: x }} />
                        {p === 0 && (
                          <div className="absolute top-40 -translate-x-1/2" style={{ left: x }}>
                            <button
                              type="button"
                              title="Closed confirmation"
                              onClick={() => setShowClosedConfirmTouch((v) => !v)}
                              className="grid place-items-center rounded-full border border-white/40 bg-white/10 p-1 text-white hover:bg-white/20 focus:outline-none"
                            >
                              {/* Hand icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M7.5 11.25V6.75a1.5 1.5 0 1 1 3 0v3.25h.75V4.5a1.5 1.5 0 1 1 3 0v5.5h.75V6a1.5 1.5 0 1 1 3 0v7.5a5.25 5.25 0 0 1-5.25 5.25H11.7c-.89 0-1.744-.353-2.373-.981l-2.994-2.994A2.25 2.25 0 0 1 5.625 13.5h1.875Z" />
                              </svg>
                            </button>
                            {showClosedConfirmTouch && (
                              <div className={`absolute ${x < 200 ? "left-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 z-50 w-[320px] max-w-[95vw] rounded-md border border-white/20 bg-white p-3 text-black shadow-xl`}>
                                <div className="mb-1 flex items-center justify-between">
                                  <div className="text-sm font-medium">Closed confirmation</div>
                                  <button type="button" onClick={() => setShowClosedConfirmTouch(false)} className="rounded px-1 text-xs hover:bg-black/5">×</button>
                                </div>
                                <div className="mb-2 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowClosedConfirmNotes((v) => !v)}
                                    className="rounded border border-black/20 bg-white px-2 py-1 text-xs hover:bg-black/5"
                                  >Copy</button>
                                </div>
                                <ul className="list-disc pl-5 text-sm">
                                  <li className="mb-1">Send SMS thanking them for booking, include clean date/time, ask to save your number, and note you will be very communicable.</li>
                                  <li className="mb-1">Send email with the same information.</li>
                                  <li className="mb-1">If you onboarded on the call, tell them in SMS you will send a preference summary within 48 hours.</li>
                                  <li>If you scheduled an onboarding call, include the onboarding call date/time in the SMS and the email.</li>
                                </ul>
                                {showClosedConfirmNotes && (
                                  <div className="mt-3 rounded border border-black/20 bg-black/5 p-2">
                                    <label className="mb-1 block text-xs text-black/70">Notes</label>
                                    <textarea
                                      value={closedConfirmNotes}
                                      onChange={(e) => setClosedConfirmNotes(e.target.value)}
                                      className="h-28 w-full resize-vertical rounded border border-black/20 bg-white p-2 text-xs outline-none"
                                      placeholder="Write your SMS / email text here..."
                                    />
                                    <div className="mt-2 flex items-center gap-2">
                                      <button type="button" onClick={saveClosedConfirmNotes} className="rounded border border-black/20 bg-white px-2 py-1 text-xs hover:bg-black/5">Save</button>
                                      <button type="button" onClick={copyClosedConfirmNotes} className="rounded border border-black/20 bg-white px-2 py-1 text-xs hover:bg-black/5">Copy to clipboard</button>
                                      {closedConfirmCopyMsg && <span className="text-xs text-black/60">{closedConfirmCopyMsg}</span>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {count > 0 && (
                      <div className="absolute top-5 -translate-x-1/2" style={{ left: x }}>
                        <div className="relative">
                          <button type="button" onClick={() => setSelectedPercent(p)} className="grid justify-items-center focus:outline-none">
                            <div className="mx-auto h-3 w-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
                            <div className="mt-1 rounded-full border border-white/30 bg-white/10 px-1.5 py-[2px] text-[10px] leading-none text-white">
                              +{count}
                            </div>
                          </button>
                          {selectedPercent === p && (
                            <div className={`absolute ${x < 200 ? "left-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 z-50 w-[320px] max-w-[95vw] rounded-md border border-white/20 bg-white p-2 text-black shadow-xl`}>
                              <div className="mb-1 flex items-center justify-between">
                                <div className="text-xs font-medium">{p}% — {count} lead{count > 1 ? "s" : ""}</div>
                                <button type="button" onClick={() => { setSelectedPercent(null); setEditingClosedId(null); }} className="rounded px-1 text-xs hover:bg-black/5">×</button>
                              </div>
                              <ul className="grid gap-2">
                                {bucket.map((item) => (
                                  <li key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                                    {editingClosedId === item.id ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <DateInput
                                          autoFocus
                                          value={isoToDateInputValue(item.bookDate)}
                                          onChange={(nextValue) => {
                                            const newISO = parseDateInputToLocalMidnight(nextValue).toISOString();
                                            setClosed((prev) => prev.map((i) => (i.id === item.id ? { ...i, bookDate: newISO } : i)));
                                          }}
                                          className="shrink-0 rounded-md border border-black/20 bg-white px-2 py-1 text-[11px]"
                                        />
                                        <DateInput
                                          value={isoToDateInputValue(item.cleanDate)}
                                          onChange={(nextValue) => {
                                            const newISO = parseDateInputToLocalMidnight(nextValue).toISOString();
                                            setClosed((prev) => prev.map((i) => (i.id === item.id ? { ...i, cleanDate: newISO } : i)));
                                          }}
                                          className="shrink-0 rounded-md border border-black/20 bg-white px-2 py-1 text-[11px]"
                                        />
                                        <select value={item.platform || ""} onChange={(e) => {
                                          const val = e.target.value;
                                          setClosed((prev) => prev.map((i) => (i.id === item.id ? { ...i, platform: val } : i)));
                                        }} className="shrink-0 rounded-md border border-black/20 bg-white px-2 py-1 text-[11px]">
                                          <option value="">Platform</option>
                                          {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
                                        </select>
                                        <button type="button" onClick={() => setEditingClosedId(null)} className="shrink-0 rounded border border-black/20 px-2 py-1 text-[11px] hover:bg-black/5">Done</button>
                                      </div>
                                    ) : (
                                      <button type="button" onClick={() => setEditingClosedId(item.id)} className="text-left text-xs underline underline-offset-2">
                                        {item.name}
                                      </button>
                                    )}
                                    <div className="flex items-center justify-end gap-2">
                                      <select
                                        value={item.journeyState || "Closed1"}
                                        onChange={(e) => handleClosedStateChange(item, e.target.value)}
                                        className="rounded border border-black/20 bg-white px-1.5 py-[2px] text-[10px]"
                                      >
                                        <option value="Closed1">Closed1</option>
                                        <option value="Closed2">Closed2</option>
                                        <option value="Closed3">Closed3</option>
                                        <option value="Closed4">Closed4</option>
                                        <option value="Not Closed">Not Closed</option>
                                        <option value="Not REBOOKED">Not REBOOKED</option>
                                      </select>
                                      <button type="button" onClick={() => setConfirmDelete({ list: 'closed', id: item.id })} className="rounded border border-red-400 bg-white px-1.5 py-[2px] text-[10px] text-red-600 hover:bg-red-50">Delete</button>
                                      <span className="text-[10px] text-black/60">{item.platform || "-"}</span>
                                      <span className="text-[10px] text-black/60">{p}%</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* NO REBOOK timeline (second) */}
      <section className="mt-12 space-y-2">
        <h2 className="text-lg font-semibold">NO REBOOK</h2>
        <p className="text-sm text-white/60">Day 0 – Day 90</p>
        <button type="button" onClick={() => setShowNrForm((v) => !v)} className="rounded-md border border-white/30 bg-white px-3 py-1 text-sm text-black hover:bg-white/90">
          {showNrForm ? "Close" : "Add"}
        </button>
      </section>
      {showNrForm && (
      <form onSubmit={addNrLead} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Name</span>
          <input value={nrNameInput} onChange={(e) => setNrNameInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="Lead name" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Platform</span>
          <select value={nrPlatformInput} onChange={(e) => setNrPlatformInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40">
            {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Start date (Day 0)</span>
          <DateInput value={nrDateInput} onChange={setNrDateInput} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" />
        </label>
        <button type="submit" className="h-[38px] rounded-md border border-white/20 bg-white px-3 text-sm text-black hover:bg-white/90">Add no rebook</button>
      </form>
      )}
      <div ref={noRebookScrollRef} className="relative mt-6 h-[600px] overflow-x-auto overflow-y-visible rounded-lg border border-black/20 bg-black p-6">
        <div className="absolute left-6 right-6 top-[120px] h-[2px] bg-white/25" />
        <div className="relative h-full" style={{ minWidth: width }}>
          {Array.from({ length: totalDays + 1 }).map((_, d) => {
            const x = leftPadding + d * pixelsPerDay;
            const count = nrCountsByDay.get(d) || 0;
            const bucket = nrBucketsByDay.get(d) || [];
            return (
              <div key={d}>
                <div className="absolute top-24 h-7 w-px bg-white/30" style={{ left: x }} />
                {d % 5 === 0 && (
                  <>
                    <div className="absolute top-32 -translate-x-1/2 text-xs text-white/70" style={{ left: x }}>
                      Day {d}
                    </div>
                    <div className="absolute top-14 h-2 w-2 -translate-x-1/2 rounded-full bg-white" style={{ left: x }} />
                  </>
                )}
                {count > 0 && (
                  <div className="absolute top-5 -translate-x-1/2" style={{ left: x }}>
                    <div className="relative">
                      <button type="button" onClick={() => { setNrSelectedDay(d); const el = noRebookScrollRef.current; if (el) { const xPos = leftPadding + d * pixelsPerDay; const popupWidth = 280; const target = Math.max(0, xPos - popupWidth * 0.6); el.scrollTo({ left: target, behavior: "smooth" }); } }} className="grid justify-items-center focus:outline-none">
                        <div className="mx-auto h-3 w-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
                        <div className="mt-1 rounded-full border border-white/30 bg-white/10 px-1.5 py-[2px] text-[10px] leading-none text-white">
                          +{count}
                        </div>
                      </button>
                      {nrSelectedDay === d && (
                        <div className={`absolute ${x < 160 ? "left-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 z-50 w-[280px] max-w-[95vw] rounded-md border border-black/20 bg-white p-2 text-black shadow-xl`}>
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-xs font-medium">Day {d} — {count} lead{count > 1 ? "s" : ""}</div>
                            <button type="button" onClick={() => { setNrSelectedDay(null); setNrEditingId(null); }} className="rounded px-1 text-xs hover:bg-black/5">×</button>
                          </div>
                          <ul className="grid gap-1">
                            {bucket.map((item) => (
                              <li key={item.id} className="flex items-center justify-between gap-2">
                                {nrEditingId === item.id ? (
                                  <DateInput
                                    autoFocus
                                    value={isoToDateInputValue(item.startDate)}
                                    onChange={(nextValue) => {
                                      const newISO = parseDateInputToLocalMidnight(nextValue).toISOString();
                                      setNrLeads((prev) => prev.map((l) => (l.id === item.id ? { ...l, startDate: newISO } : l)));
                                      setNrEditingId(null);
                                    }}
                                    className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <button type="button" onClick={() => setNrEditingId(item.id)} className="text-left text-xs underline underline-offset-2">
                                    {item.name}
                                  </button>
                                )}
                                <div className="flex items-center gap-2">
                                  <select
                                    value={item.journeyState || "Not REBOOKED"}
                                    onChange={(e) => handleNrStateChange(item, e.target.value)}
                                    className="rounded border border-black/20 bg-white px-1.5 py-[2px] text-[10px]"
                                  >
                                    <option value="Not Closed">Not Closed</option>
                                    <option value="Not REBOOKED">Not REBOOKED</option>
                                    <option value="Closed1">Closed1</option>
                                    <option value="Closed2">Closed2</option>
                                    <option value="Closed3">Closed3</option>
                                    <option value="Closed4">Closed4</option>
                                  </select>
                                  <button type="button" onClick={() => setConfirmDelete({ list: 'nr', id: item.id })} className="rounded border border-red-400 bg-white px-1.5 py-[2px] text-[10px] text-red-600 hover:bg-red-50">Delete</button>
                                  <button type="button" onClick={() => setViewNrDataId(item.id)} className="rounded border border-black/20 px-1.5 py-[2px] text-[10px] hover:bg-black/5">Data</button>
                                  <span className="text-[10px] text-black/60">{item.platform || "-"} • Day {d}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* NOT CLOSED timeline (third) */}
      <section className="mt-12 space-y-2">
        <h2 className="text-lg font-semibold">NOT CLOSED</h2>
        <p className="text-sm text-white/60">Day 0 – Day 90</p>
        <button type="button" onClick={() => setShowLeadForm((v) => !v)} className="rounded-md border border-white/30 bg-white px-3 py-1 text-sm text-black hover:bg-white/90">
          {showLeadForm ? "Close" : "Add"}
        </button>
      </section>

      {showLeadForm && (
      <form onSubmit={addLead} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Name</span>
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="Lead name" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Platform</span>
          <select value={platformInput} onChange={(e) => setPlatformInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40">
            {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Start date (Day 0)</span>
          <DateInput value={dateInput} onChange={setDateInput} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" />
        </label>
        <button type="submit" className="h-[38px] rounded-md border border-white/20 bg-white px-3 text-sm text-black hover:bg-white/90">Add lead</button>
      </form>
      )}

      <div ref={notClosedScrollRef} className="relative mt-6 h-[600px] overflow-x-auto overflow-y-visible rounded-lg border border-black/20 bg-black p-6">
        <div className="absolute left-6 right-6 top-[120px] h-[2px] bg-white/25" />
        <div className="relative h-full" style={{ minWidth: width }}>
          {Array.from({ length: totalDays + 1 }).map((_, d) => {
            const x = leftPadding + d * pixelsPerDay;
            const count = countsByDay.get(d) || 0;
            const bucket = bucketsByDay.get(d) || [];
            return (
              <div key={d}>
                <div className="absolute top-24 h-7 w-px bg-white/30" style={{ left: x }} />
                {d % 5 === 0 && (
                  <>
                    <div className="absolute top-32 -translate-x-1/2 text-xs text-white/70" style={{ left: x }}>
                      Day {d}
                    </div>
                    <div className="absolute top-14 h-2 w-2 -translate-x-1/2 rounded-full bg-white" style={{ left: x }} />
                  </>
                )}
                {count > 0 && (
                  <div className="absolute top-5 -translate-x-1/2" style={{ left: x }}>
                    <div className="relative">
                      <button type="button" onClick={() => { setSelectedDay(d); const el = notClosedScrollRef.current; if (el) { const xPos = leftPadding + d * pixelsPerDay; const popupWidth = 280; const target = Math.max(0, xPos - popupWidth * 0.6); el.scrollTo({ left: target, behavior: "smooth" }); } }} className="grid justify-items-center focus:outline-none">
                        <div className="mx-auto h-3 w-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
                        <div className="mt-1 rounded-full border border-white/30 bg-white/10 px-1.5 py-[2px] text-[10px] leading-none text-white">
                          +{count}
                        </div>
                      </button>
                      {selectedDay === d && (
                        <div className={`absolute ${x < 160 ? "left-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 z-50 w-[280px] max-w-[95vw] rounded-md border border-black/20 bg-white p-2 text-black shadow-xl`}>
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-xs font-medium">Day {d} — {count} lead{count > 1 ? "s" : ""}</div>
                            <button type="button" onClick={() => { setSelectedDay(null); setEditingLeadId(null); }} className="rounded px-1 text-xs hover:bg-black/5">×</button>
                          </div>
                          <ul className="grid gap-2">
                            {bucket.map((lead) => (
                              <li key={lead.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                                {editingLeadId === lead.id ? (
                                  <DateInput
                                    autoFocus
                                    value={isoToDateInputValue(lead.startDate)}
                                    onChange={(nextValue) => {
                                      const newISO = parseDateInputToLocalMidnight(nextValue).toISOString();
                                      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, startDate: newISO } : l)));
                                      setEditingLeadId(null);
                                    }}
                                    className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <button type="button" onClick={() => setEditingLeadId(lead.id)} className="text-left text-xs underline underline-offset-2">
                                    {lead.name}
                                  </button>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={lead.journeyState || "Not Closed"}
                                    onChange={(e) => handleLeadStateChange(lead, e.target.value)}
                                    className="rounded border border-black/20 bg-white px-1.5 py-[2px] text-[10px]"
                                  >
                                    <option value="Not Closed">Not Closed</option>
                                    <option value="Not REBOOKED">Not REBOOKED</option>
                                    <option value="Closed1">Closed1</option>
                                    <option value="Closed2">Closed2</option>
                                    <option value="Closed3">Closed3</option>
                                    <option value="Closed4">Closed4</option>
                                  </select>
                                  <button type="button" onClick={() => setConfirmDelete({ list: 'leads', id: lead.id })} className="rounded border border-red-400 bg-white px-1.5 py-[2px] text-[10px] text-red-600 hover:bg-red-50">Delete</button>
                                  <button type="button" onClick={() => setViewLeadDataId(lead.id)} className="rounded border border-black/20 px-1.5 py-[2px] text-[10px] hover:bg-black/5">Data</button>
                                  <span className="text-[10px] text-black/60">{lead.platform || "-"}</span>
                                  <span className="text-[10px] text-black/60">Day {d}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SAID NO timeline */}
      <section className="mt-12 space-y-2">
        <h2 className="text-lg font-semibold">SAID NO</h2>
        <p className="text-sm text-white/60">Month 0 – Month 6</p>
        <button type="button" onClick={() => setShowSaidNoForm((v) => !v)} className="rounded-md border border-white/30 bg-white px-3 py-1 text-sm text-black hover:bg-white/90">{showSaidNoForm ? "Close" : "Add"}</button>
      </section>

      {showSaidNoForm && (
      <form onSubmit={addSaidNo} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Name</span>
          <input value={snNameInput} onChange={(e) => setSnNameInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" placeholder="Lead name" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Platform</span>
          <select value={snPlatformInput} onChange={(e) => setSnPlatformInput(e.target.value)} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40">
            {PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-white/70">Start date (Day 0)</span>
          <DateInput value={snDateInput} onChange={setSnDateInput} className="rounded-md border border-white/20 bg-[#e5e7eb] text-black px-3 py-2 text-sm outline-none focus:border-white/40" />
        </label>
        <button type="submit" className="h-[38px] rounded-md border border-white/20 bg-white px-3 text-sm text-black hover:bg-white/90">Add said no</button>
      </form>
      )}

      <div className="relative mt-6 h-[600px] overflow-x-auto overflow-y-visible rounded-lg border border-black/20 bg-black p-6">
        <div className="absolute left-6 right-6 top-[120px] h-[2px] bg-white/25" />
        {(() => {
          const totalMonths = 6;
          const daysRange = 180; // approx 6 months
          const pxPerDay = pixelsPerDay; // keep density comparable
          const minWidth = leftPadding + rightPadding + daysRange * pxPerDay;
          return (
            <div className="relative h-full" style={{ minWidth }}>
              {Array.from({ length: daysRange + 1 }).map((_, day) => {
                const x = leftPadding + day * pxPerDay;
                const count = saidNoCountsByDay.get(day) || 0;
                const bucket = saidNoBucketsByDay.get(day) || [];
                const monthLabelEvery = Math.floor(30);
                const showMonth = day % monthLabelEvery === 0;
                const monthIndex = Math.floor(day / 30);
                return (
                  <div key={day}>
                    <div className="absolute top-24 h-7 w-px bg-white/30" style={{ left: x }} />
                    {showMonth && (
                      <>
                        <div className="absolute top-32 -translate-x-1/2 text-xs text-white/70" style={{ left: x }}>
                          Month {monthIndex}
                        </div>
                        <div className="absolute top-14 h-2 w-2 -translate-x-1/2 rounded-full bg-white" style={{ left: x }} />
                      </>
                    )}
                    {count > 0 && (
                      <div className="absolute top-5 -translate-x-1/2" style={{ left: x }}>
                        <div className="relative">
                          <button type="button" onClick={() => setSnSelectedDay(day)} className="grid justify-items-center focus:outline-none">
                            <div className="mx-auto h-3 w-3 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.25)]" />
                            <div className="mt-1 rounded-full border border-white/30 bg-white/10 px-1.5 py-[2px] text-[10px] leading-none text-white">
                              +{count}
                            </div>
                          </button>
                          {snSelectedDay === day && (
                            <div className={`absolute ${x < 160 ? "left-0" : "left-1/2 -translate-x-1/2"} top-full mt-2 z-50 w-[280px] max-w-[95vw] rounded-md border border-black/20 bg-white p-2 text-black shadow-xl`}>
                              <div className="mb-1 flex items-center justify-between">
                                <div className="text-xs font-medium">Month {monthIndex} — {count} lead{count > 1 ? "s" : ""}</div>
                                <button type="button" onClick={() => { setSnSelectedDay(null); setSnEditingId(null); }} className="rounded px-1 text-xs hover:bg-black/5">×</button>
                              </div>
                              <ul className="grid gap-1">
                                {bucket.map((item) => (
                                  <li key={item.id} className="flex items-center justify-between gap-2">
                                    {snEditingId === item.id ? (
                                      <DateInput
                                        autoFocus
                                        value={isoToDateInputValue(item.startDate)}
                                        onChange={(nextValue) => {
                                          const newISO = parseDateInputToLocalMidnight(nextValue).toISOString();
                                          setSaidNo((prev) => prev.map((l) => (l.id === item.id ? { ...l, startDate: newISO } : l)));
                                          setSnEditingId(null);
                                        }}
                                        className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs"
                                      />
                                    ) : (
                                      <button type="button" onClick={() => setSnEditingId(item.id)} className="text-left text-xs underline underline-offset-2">
                                        {item.name}
                                      </button>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={item.journeyState || "SAID NO"}
                                        onChange={(e) => handleSaidNoStateChange(item, e.target.value)}
                                        className="rounded border border-black/20 bg-white px-1.5 py-[2px] text-[10px]"
                                      >
                                        <option value="SAID NO">SAID NO</option>
                                        <option value="Not Closed">Not Closed</option>
                                        <option value="Not REBOOKED">Not REBOOKED</option>
                                        <option value="Closed1">Closed1</option>
                                        <option value="Closed2">Closed2</option>
                                        <option value="Closed3">Closed3</option>
                                        <option value="Closed4">Closed4</option>
                                      </select>
                                      <button type="button" onClick={() => setConfirmDelete({ list: 'saidno', id: item.id })} className="rounded border border-red-400 bg-white px-1.5 py-[2px] text-[10px] text-red-600 hover:bg-red-50">Delete</button>
                                      <span className="text-[10px] text-black/60">{item.platform || "-"} • Day {day}</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal: Confirm Close from Not Closed */}
      {pendingCloseFor && (
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-black/20 bg-white p-3 text-black shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Close deal for {pendingCloseFor.name}</div>
              <button type="button" onClick={cancelLeadClose} className="rounded px-1 text-xs hover:bg-black/5">×</button>
            </div>
            <div className="grid gap-2">
              <label className="grid gap-1 text-xs">
                <span className="text-black/70">Book date (0%)</span>
                <DateInput value={pendingBook} onChange={setPendingBook} className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs" />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-black/70">Clean date (100%)</span>
                <DateInput value={pendingClean} onChange={setPendingClean} className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs" />
              </label>
              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={cancelLeadClose} className="rounded border border-black/20 px-2 py-1 text-xs hover:bg-black/5">Cancel</button>
                <button type="button" disabled={!pendingBook || !pendingClean} onClick={confirmLeadClose} className="rounded border border-black/20 bg-black px-2 py-1 text-xs text-white disabled:opacity-40">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Close from Not REBOOKED */}
      {nrPendingCloseFor && (
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-black/20 bg-white p-3 text-black shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Close deal for {nrPendingCloseFor.name}</div>
              <button type="button" onClick={cancelNrClose} className="rounded px-1 text-xs hover:bg-black/5">×</button>
            </div>
            <div className="grid gap-2">
              <label className="grid gap-1 text-xs">
                <span className="text-black/70">Book date (0%)</span>
                <DateInput value={nrPendingBook} onChange={setNrPendingBook} className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs" />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-black/70">Clean date (100%)</span>
                <DateInput value={nrPendingClean} onChange={setNrPendingClean} className="rounded-md border border-black/20 bg-white px-2 py-1 text-xs" />
              </label>
              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={cancelNrClose} className="rounded border border-black/20 px-2 py-1 text-xs hover:bg-black/5">Cancel</button>
                <button type="button" disabled={!nrPendingBook || !nrPendingClean} onClick={confirmNrClose} className="rounded border border-black/20 bg-black px-2 py-1 text-xs text-white disabled:opacity-40">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Journey Data */}
      {(viewLeadDataId || viewNrDataId || viewClosedDataId) && (() => {
        const item = viewLeadDataId ? leads.find(l => l.id === viewLeadDataId)
          : viewNrDataId ? nrLeads.find(l => l.id === viewNrDataId)
          : closed.find(l => l.id === viewClosedDataId);
        if (!item) return null;
        const history = Array.isArray(item.history) ? item.history : [];
        return (
          <div className="fixed inset-0 z-[999] grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-md border border-black/20 bg-white p-3 text-black shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Journey Data — {item.name}</div>
                <button
                  type="button"
                  onClick={() => { setViewLeadDataId(null); setViewNrDataId(null); setViewClosedDataId(null); }}
                  className="rounded px-1 text-xs hover:bg-black/5"
                >×</button>
              </div>
              <div className="grid gap-2">
                <div className="text-xs">Current state: <span className="font-medium">{item.journeyState || "?"}</span></div>
                <ul className="grid gap-1">
                  {history.length === 0 ? (
                    <li className="text-xs text-black/60">No prior history</li>
                  ) : history.map((h, idx) => (
                    <li key={idx} className="text-xs">
                      <span className="font-medium">{h.state}</span> • {h.daysInState} day{h.daysInState === 1 ? "" : "s"}
                      <span className="text-black/60"> — {isoToDateInputValue(h.startedAt)} → {isoToDateInputValue(h.endedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md border border-black/20 bg-white p-3 text-black shadow-2xl">
            <div className="mb-2 text-sm font-medium">Are you sure you want to delete this customer?</div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={confirmDeleteNo} className="rounded border border-black/20 px-2 py-1 text-xs hover:bg-black/5">No</button>
              <button type="button" onClick={confirmDeleteYes} className="rounded border border-red-400 bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
