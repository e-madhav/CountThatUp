import React, { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'

const STORAGE_KEY = 'calm-countdown:target'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalInputValue(date) {
  const off = date.getTimezoneOffset()
  const local = new Date(date.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

function diffParts(targetMs, nowMs) {
  const total = Math.max(0, targetMs - nowMs)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((total / (1000 * 60)) % 60)
  const seconds = Math.floor((total / 1000) % 60)
  return { days, hours, minutes, seconds, total }
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: Math.round((i / 16) * 100 + (i % 3) * 2.2) % 100,
  size: 2 + ((i * 37) % 5),
  duration: 14 + ((i * 13) % 12),
  delay: -((i * 7) % 20),
}))

export default function App() {
  const [stored, setStored] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [label, setLabel] = useState(stored?.label ?? '')
  const [pendingDate, setPendingDate] = useState(
    stored?.target ? toLocalInputValue(new Date(stored.target)) : ''
  )
  const [now, setNow] = useState(() => Date.now())
  const tickRef = useRef(null)

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  const nowFloor = useMemo(() => {
    const d = new Date()
    d.setSeconds(0, 0)
    return toLocalInputValue(d)
  }, [])

  const maxDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 3)
    return toLocalInputValue(d)
  }, [])

  const parts = stored ? diffParts(stored.target, now) : null
  const arrived = stored && parts.total <= 0

  function handleBegin(e) {
    e.preventDefault()
    if (!pendingDate) return
    const targetMs = new Date(pendingDate).getTime()
    if (Number.isNaN(targetMs) || targetMs <= Date.now()) return
    const record = { target: targetMs, start: Date.now(), label: label.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    setStored(record)
  }

  function handleChangeTarget() {
    localStorage.removeItem(STORAGE_KEY)
    setStored(null)
  }

  const progress = useMemo(() => {
    if (!stored) return 0
    const total = stored.target - stored.start
    const elapsed = now - stored.start
    if (total <= 0) return 1
    return Math.min(1, Math.max(0, elapsed / total))
  }, [stored, now])

  const RADIUS = 168
  const CIRC = 2 * Math.PI * RADIUS

  return (
    <div className="stage">
      <div className="particles" aria-hidden="true">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {!stored && (
        <form className="setup" onSubmit={handleBegin}>
          <p className="eyebrow">a quiet countdown</p>
          <h1>What are you waiting for?</h1>
          <p className="lede">
            Set a moment, near or far, and let it count itself down &mdash; days,
            hours, minutes and seconds, quietly, until it arrives.
          </p>

          <label className="field">
            <span>Name it (optional)</span>
            <input
              type="text"
              placeholder="e.g. Graduation day"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>When</span>
            <input
              type="datetime-local"
              value={pendingDate}
              min={nowFloor}
              max={maxDate}
              onChange={(e) => setPendingDate(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="begin" disabled={!pendingDate}>
            Begin the count
          </button>
          <p className="hint">You can set a moment up to three years from now.</p>
        </form>
      )}

      {stored && !arrived && (
        <div className="countdown">
          {stored.label && <p className="event-label">{stored.label}</p>}

          <div className="glow-wrap">
            <div className="breathe" aria-hidden="true" />
            <svg className="ring" viewBox="0 0 360 360" aria-hidden="true">
              <circle className="ring-track" cx="180" cy="180" r={RADIUS} />
              <circle
                className="ring-progress"
                cx="180"
                cy="180"
                r={RADIUS}
                style={{
                  strokeDasharray: CIRC,
                  strokeDashoffset: CIRC * (1 - progress),
                }}
              />
            </svg>

            <div className="units">
              <Unit value={parts.days} label="days" />
              <Divider />
              <Unit value={pad(parts.hours)} label="hours" />
              <Divider />
              <Unit value={pad(parts.minutes)} label="minutes" />
              <Divider />
              <Unit value={pad(parts.seconds)} label="seconds" pulse />
            </div>
          </div>

          <button className="change-link" onClick={handleChangeTarget}>
            Change moment
          </button>
        </div>
      )}

      {stored && arrived && (
        <div className="arrived">
          <div className="glow-wrap">
            <div className="breathe breathe--slow" aria-hidden="true" />
            <p className="arrived-text">
              {stored.label ? stored.label : 'The moment'}
              <br />
              has arrived
            </p>
          </div>
          <button className="change-link" onClick={handleChangeTarget}>
            Set a new moment
          </button>
        </div>
      )}
    </div>
  )
}

function Unit({ value, label, pulse }) {
  return (
    <div className="unit">
      <span key={pulse ? value : undefined} className={pulse ? 'digits pulse' : 'digits'}>
        {value}
      </span>
      <span className="unit-label">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="divider">:</span>
}
