"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatAsInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseInputValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthGrid(anchorDate) {
  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const inCurrent = d.getMonth() === anchorDate.getMonth();
    cells.push({ date: d, inCurrent });
  }
  return cells;
}

export default function DateInput({ value, onChange, placeholder = "", className = "", autoFocus = false, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = useMemo(() => parseInputValue(value), [value]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewAnchor, setViewAnchor] = useState(() => selectedDate ? startOfDay(selectedDate) : today);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [popupLeft, setPopupLeft] = useState(0);
  const [popupTop, setPopupTop] = useState(0);
  const [draftDate, setDraftDate] = useState(() => selectedDate || today);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);

  useEffect(() => {
    // Keep calendar anchored to selected month or today if cleared
    const base = selectedDate ? startOfDay(selectedDate) : today;
    setViewAnchor(base);
    setDraftDate(base);
  }, [selectedDate, today]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (autoFocus && buttonRef.current) {
      buttonRef.current.focus();
      setIsOpen(true);
    }
  }, [autoFocus]);

  // Recalculate popover position when opened or on window resize/scroll
  useEffect(() => {
    function computePosition() {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popWidth = 280;
      const popHeight = 280;
      const margin = 8;
      // Prefer below
      let top = rect.bottom + margin;
      // If not enough space below, open above
      if (viewportHeight - rect.bottom < popHeight + margin && rect.top >= popHeight + margin) {
        top = rect.top - popHeight - margin;
      }
      let left = rect.left;
      // Clamp horizontally
      if (left + popWidth + margin > viewportWidth) left = viewportWidth - popWidth - margin;
      if (left < margin) left = margin;
      setPopupLeft(Math.max(0, Math.floor(left)));
      setPopupTop(Math.max(0, Math.floor(top)));
    }
    if (isOpen) {
      computePosition();
      window.addEventListener("resize", computePosition);
      window.addEventListener("scroll", computePosition, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition);
    };
  }, [isOpen]);

  const cells = useMemo(() => getMonthGrid(viewAnchor), [viewAnchor]);

  function handleSelect(date) {
    if (!date) return;
    const next = startOfDay(date);
    setDraftDate(next);
  }

  const displayValue = value || "";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className={
          className ||
          "rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-left w-full outline-none focus:border-black/40"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {displayValue || placeholder || "Select date"}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={
            "fixed z-[9999] h-[280px] w-[280px] overflow-hidden rounded-md border border-black/20 bg-white p-2 text-black shadow-2xl flex flex-col"
          }
          style={{ left: popupLeft, top: popupTop }}
        >
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setViewAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded px-2 py-1 text-sm hover:bg-black/5"
              aria-label="Previous month"
            >
              «
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
                  onClick={() => { setShowMonthMenu((v) => !v); setShowYearMenu(false); }}
                >
                  {viewAnchor.toLocaleString(undefined, { month: "long" })} ▾
                </button>
                {showMonthMenu && (
                  <div className="absolute left-1/2 z-10 mt-1 w-40 -translate-x-1/2 rounded-md border border-black/10 bg-white p-2 shadow-xl">
                    <div className="grid grid-cols-3 gap-1 text-sm">
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                        <button
                          key={m}
                          type="button"
                          className="rounded px-2 py-1 hover:bg-black/5"
                          onClick={() => { setViewAnchor((d) => new Date(d.getFullYear(), i, 1)); setShowMonthMenu(false); }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm hover:bg-black/10"
                  onClick={() => { setShowYearMenu((v) => !v); setShowMonthMenu(false); }}
                >
                  {viewAnchor.getFullYear()} ▾
                </button>
                {showYearMenu && (() => {
                  const base = viewAnchor.getFullYear();
                  const years = Array.from({ length: 11 }, (_, i) => base - 5 + i);
                  return (
                    <div className="absolute left-1/2 z-10 mt-1 w-28 -translate-x-1/2 rounded-md border border-black/10 bg-white p-1 shadow-xl">
                      <div className="max-h-56 overflow-y-auto">
                        {years.map((y) => (
                          <button key={y} type="button" className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-black/5" onClick={() => { setViewAnchor((d) => new Date(y, d.getMonth(), 1)); setShowYearMenu(false); }}>
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded px-2 py-1 text-sm hover:bg-black/5"
              aria-label="Next month"
            >
              »
            </button>
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 px-1 text-[11px] text-black/60">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((label, i) => (
              <div key={i} className={"text-center " + (i === 0 || i === 6 ? "text-red-500" : "")}>{label}</div>
            ))}
          </div>

          <div className="mt-1 grid flex-1 min-h-0 gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)" }}>
            {cells.map((cell, idx) => {
              const d = cell.date;
              const isInMonth = cell.inCurrent;
              const isToday = d.getTime() === today.getTime();
              const isSelected = draftDate && d.getTime() === startOfDay(draftDate).getTime();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(d)}
                  className={
                    "flex h-full w-full items-center justify-center rounded text-sm transition-colors " +
                    (isSelected
                      ? "bg-black text-white"
                      : isToday
                      ? "ring-1 ring-black/30"
                      : "hover:bg-black/5") +
                    (isWeekend ? " text-red-500" : (isInMonth ? " text-black" : " text-black/30"))
                  }
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-full bg-black/5 px-3 py-1 text-[12px] hover:bg-black/10"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="rounded-full bg-green-500 px-3 py-1 text-[12px] text-white hover:bg-green-600"
              onClick={() => {
                if (draftDate) onChange?.(formatAsInputValue(draftDate));
                setIsOpen(false);
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


