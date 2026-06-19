import { useState, useRef, useEffect } from 'react'
import {
  Wand2, ScanSearch, Type, Copy, Check, Trash2,
  ArrowLeft, AlertCircle, FileText, Sparkles, ChevronRight
} from 'lucide-react'
import { runDetection } from './detector'
import { runHumanizer } from './humanizer'

const MAX_WORDS = 2500

const HIGHLIGHT_COLORS = {
  transition: '#1e3a5f',
  rhythm: '#1a3a2a',
  vocab: '#2d1b4e',
  formal: '#3a2800',
  'high-confidence': '#3a1a1a',
}

const LEGEND_ITEMS = [
  { key: 'transition', label: 'Transition / Hedging', color: '#1e3a5f' },
  { key: 'rhythm', label: 'Robotic Rhythm', color: '#1a3a2a' },
  { key: 'vocab', label: 'AI Vocabulary', color: '#2d1b4e' },
  { key: 'formal', label: 'Formal / Zero Contractions', color: '#3a2800' },
  { key: 'high-confidence', label: 'High-Confidence AI', color: '#3a1a1a' },
]

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightSpans(originalText, spans) {
  if (!spans || spans.length === 0) return escapeHtml(originalText)

  // Build array of all highlight positions
  const positions = []
  for (const span of spans) {
    const color = HIGHLIGHT_COLORS[span.category] || HIGHLIGHT_COLORS['high-confidence']
    let startIdx = 0
    while (true) {
      const idx = originalText.indexOf(span.text, startIdx)
      if (idx === -1) break
      positions.push({
        start: idx,
        end: idx + span.text.length,
        color,
        category: span.category,
        reason: span.reason,
      })
      startIdx = idx + 1
    }
  }

  // Sort by start position, longer spans first for overlap resolution
  positions.sort((a, b) => a.start - b.start || b.end - a.end)

  // Remove overlapping positions (keep first/longest)
  const filtered = []
  let lastEnd = -1
  for (const pos of positions) {
    if (pos.start >= lastEnd) {
      filtered.push(pos)
      lastEnd = pos.end
    }
  }

  // Build highlighted HTML
  let result = ''
  let cursor = 0
  for (const pos of filtered) {
    if (pos.start > cursor) {
      result += escapeHtml(originalText.slice(cursor, pos.start))
    }
    result += `<mark style="background:${pos.color};border-radius:3px;padding:1px 3px" title="${escapeHtml(pos.reason)}">${escapeHtml(originalText.slice(pos.start, pos.end))}</mark>`
    cursor = pos.end
  }
  if (cursor < originalText.length) {
    result += escapeHtml(originalText.slice(cursor))
  }
  return result
}

function getScoreColor(score) {
  if (score < 30) return 'green'
  if (score <= 60) return 'yellow'
  return 'red'
}

export default function App() {
  const [mode, setMode] = useState('humanize')
  const [inputText, setInputText] = useState('')
  const [style, setStyle] = useState('Professional')
  const [difficulty, setDifficulty] = useState('Medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Humanize output
  const [humanizedText, setHumanizedText] = useState('')

  // Detect output
  const [detectResult, setDetectResult] = useState(null)

  const [copied, setCopied] = useState(false)

  const humanizeBtnRef = useRef(null)
  const detectBtnRef = useRef(null)
  const sliderRef = useRef(null)

  const words = countWords(inputText)
  const overLimit = words > MAX_WORDS

  // Update slider position on mode change
  useEffect(() => {
    const activeBtn = mode === 'humanize' ? humanizeBtnRef.current : detectBtnRef.current
    const slider = sliderRef.current
    if (activeBtn && slider) {
      slider.style.left = activeBtn.offsetLeft + 'px'
      slider.style.width = activeBtn.offsetWidth + 'px'
    }
  }, [mode])

  const handleHumanize = () => {
    if (!inputText.trim() || overLimit) return
    setLoading(true)
    setError(null)
    setHumanizedText('')

    // Use setTimeout to let the UI show loading state before heavy computation
    setTimeout(() => {
      try {
        const result = runHumanizer(inputText, style, difficulty)
        setHumanizedText(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 80)
  }

  const handleDetect = () => {
    if (!inputText.trim() || overLimit) return
    setLoading(true)
    setError(null)
    setDetectResult(null)

    setTimeout(() => {
      try {
        const result = runDetection(inputText)
        const highlightedHtml = highlightSpans(inputText, result.spans)
        setDetectResult({ ...result, highlightedHtml })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 80)
  }

  const handleCopy = () => {
    const textToCopy = mode === 'humanize'
      ? humanizedText
      : detectResult
        ? `AI Score: ${detectResult.score}%\n${detectResult.verdict}`
        : ''
    if (!textToCopy) return
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasOutput = mode === 'humanize' ? !!humanizedText : !!detectResult

  return (
    <>
      {/* NAVBAR */}
      <header className="navbar">
        <a href="https://aorbub.com" className="nav-brand" target="_blank" rel="noreferrer">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="5" cy="5" r="2.5" fill="#6366f1" />
            <circle cx="15" cy="5" r="2.5" fill="#6366f1" />
            <circle cx="5" cy="15" r="2.5" fill="#6366f1" />
            <circle cx="15" cy="15" r="2.5" fill="#6366f1" />
          </svg>
          <span>HumanizerIQ</span>
          <span className="nav-brand-sub">by Aorbub</span>
        </a>
        <div className="nav-right">
          <a href="https://aorbub.com" className="nav-back" target="_blank" rel="noreferrer">
            <ArrowLeft size={14} />
            All Tools
          </a>
        </div>
      </header>

      {/* MODE TOGGLE */}
      <div className="mode-toggle-container">
        <div className="mode-toggle">
          <div className="mode-toggle-slider" ref={sliderRef} />
          <button
            ref={humanizeBtnRef}
            className={`mode-toggle-btn ${mode === 'humanize' ? 'active' : ''}`}
            onClick={() => { setMode('humanize'); setError(null) }}
          >
            <Wand2 size={16} />
            Humanize
          </button>
          <button
            ref={detectBtnRef}
            className={`mode-toggle-btn ${mode === 'detect' ? 'active' : ''}`}
            onClick={() => { setMode('detect'); setError(null) }}
          >
            <ScanSearch size={16} />
            Detect
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="app-main">
        {/* LEFT PANEL — INPUT */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Type size={14} />
              Input Text
            </div>
          </div>

          <div className="textarea-wrapper">
            <textarea
              className="text-input"
              placeholder={
                mode === 'humanize'
                  ? 'Paste your AI-generated text here...'
                  : 'Paste any text to analyze for AI patterns...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              spellCheck={false}
            />
            <div className="textarea-footer">
              <span className={`word-count ${overLimit ? 'over' : words > MAX_WORDS * 0.9 ? 'warning' : ''}`}>
                {words.toLocaleString()} / {MAX_WORDS.toLocaleString()} words
              </span>
              {inputText && (
                <button className="clear-btn" onClick={() => { setInputText(''); setError(null); setHumanizedText(''); setDetectResult(null) }}>
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* CONTROLS — only in Humanize mode */}
          {mode === 'humanize' && (
            <>
              <div className="control-group">
                <span className="control-label">Style</span>
                <div className="pill-tabs">
                  {['Academic', 'Professional', 'Casual'].map((s) => (
                    <button
                      key={s}
                      className={`pill-tab ${style === s ? 'active' : ''}`}
                      onClick={() => setStyle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="control-group">
                <span className="control-label">Difficulty</span>
                <div className="pill-tabs">
                  {['Easy', 'Medium', 'Hard'].map((d) => (
                    <button
                      key={d}
                      className={`pill-tab ${difficulty === d ? 'active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CTA */}
          {mode === 'humanize' ? (
            <button
              className={`cta-btn ${loading ? 'loading' : ''}`}
              disabled={!inputText.trim() || overLimit || loading}
              onClick={handleHumanize}
            >
              {loading ? <span className="spinner" /> : <Sparkles size={18} />}
              {loading ? 'Humanizing...' : 'Humanize'}
            </button>
          ) : (
            <button
              className={`cta-btn ${loading ? 'loading' : ''}`}
              disabled={!inputText.trim() || overLimit || loading}
              onClick={handleDetect}
            >
              {loading ? <span className="spinner" /> : <ScanSearch size={18} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          )}
        </div>

        {/* RIGHT PANEL — OUTPUT */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={14} />
              {mode === 'humanize' ? 'Humanized Output' : 'Detection Results'}
            </div>
            {hasOutput && (
              <button
                className={`copy-output-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="output-area">
            {/* HUMANIZE OUTPUT */}
            {mode === 'humanize' && (
              humanizedText ? (
                <div className="output-text">{humanizedText}</div>
              ) : (
                !loading && !error && (
                  <div className="output-placeholder">
                    <Sparkles size={48} />
                    <p>
                      Paste AI-generated text on the left,<br />
                      choose your style &amp; difficulty,<br />
                      then click <strong>Humanize</strong>.
                    </p>
                  </div>
                )
              )
            )}

            {/* DETECT OUTPUT */}
            {mode === 'detect' && (
              detectResult ? (
                <div className="detection-result">
                  {/* Score */}
                  <div className="score-display">
                    <div className="score-label">AI Probability Score</div>
                    <div className={`score-value ${getScoreColor(detectResult.score)}`}>
                      {detectResult.score}%
                    </div>
                    <div className="score-verdict">{detectResult.verdict}</div>
                    <div className="score-bar-track">
                      <div
                        className={`score-bar-fill ${getScoreColor(detectResult.score)}`}
                        style={{ width: `${detectResult.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary chips */}
                  {detectResult.summary && (
                    <div className="detection-summary">
                      <div className="summary-chip">
                        <span className="summary-chip-count">{detectResult.summary.transition_count}</span>
                        <span className="summary-chip-label">Transitions</span>
                      </div>
                      <div className="summary-chip">
                        <span className="summary-chip-count">{detectResult.summary.rhythm_count}</span>
                        <span className="summary-chip-label">Rhythm</span>
                      </div>
                      <div className="summary-chip">
                        <span className="summary-chip-count">{detectResult.summary.vocab_count}</span>
                        <span className="summary-chip-label">Vocab</span>
                      </div>
                      <div className="summary-chip">
                        <span className="summary-chip-count">{detectResult.summary.formal_count}</span>
                        <span className="summary-chip-label">Formal</span>
                      </div>
                      <div className="summary-chip">
                        <span className="summary-chip-count">{detectResult.summary.high_confidence_count}</span>
                        <span className="summary-chip-label">High Conf.</span>
                      </div>
                    </div>
                  )}

                  {/* Highlighted text */}
                  {detectResult.highlightedHtml && (
                    <div
                      className="output-text"
                      dangerouslySetInnerHTML={{ __html: detectResult.highlightedHtml }}
                    />
                  )}

                  {/* Legend */}
                  <div className="legend">
                    {LEGEND_ITEMS.map((item) => (
                      <span key={item.key} className="legend-pill">
                        <span className="legend-dot" style={{ background: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                !loading && !error && (
                  <div className="output-placeholder">
                    <ScanSearch size={48} />
                    <p>
                      Paste any text on the left,<br />
                      then click <strong>Analyze</strong> to detect<br />
                      AI-generated patterns.
                    </p>
                  </div>
                )
              )
            )}

            {/* Loading state */}
            {loading && (
              <div className="output-placeholder">
                <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <p>{mode === 'humanize' ? 'Rewriting your text...' : 'Analyzing patterns...'}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <div>
          <span className="footer-brand">HumanizerIQ</span>
          © 2026 Huzefa Haveliwala
        </div>
        <a href="https://aorbub.com" target="_blank" rel="noreferrer">
          Part of the Aorbub Suite <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
        </a>
      </footer>
    </>
  )
}
