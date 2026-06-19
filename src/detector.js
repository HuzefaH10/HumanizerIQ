// ============================================================
// HumanizerIQ — DETECTOR ENGINE
// Pure client-side AI text detection. No API calls.
// 10 independent modules that scan for AI writing patterns.
// ============================================================

// ── AI VOCABULARY FINGERPRINT DATABASE ──────────────────────

const AI_VOCAB = {
  critical: [
    "delve", "delves", "delving", "delved",
    "tapestry", "nuanced", "multifaceted",
    "bustling", "harnessing", "showcasing",
    "revolutionize", "revolutionizing",
    "meticulous", "meticulously",
    "commendable", "pivotal", "intricate",
    "intricacies", "underscore", "underscores",
    "paramount", "embark", "embarks", "embarking",
    "foster", "fosters", "fostering",
    "leverage", "leverages", "leveraging",
    "robust", "robustness", "paradigm",
    "realm", "realms", "beacon",
    "testament", "noteworthy", "groundbreaking",
    "cutting-edge", "state-of-the-art",
    "game-changing", "synergy", "holistic",
    "scalable", "transformative", "dynamic",
    "innovative", "streamline", "streamlines"
  ],
  phrases: [
    "shed light on", "shed light",
    "in the realm of", "in today's",
    "in today's world", "in today's fast-paced",
    "it is worth noting", "it's worth noting",
    "it is important to note", "it's important to note",
    "it is crucial to", "it's crucial to",
    "it is essential to", "it's essential to",
    "needless to say", "goes without saying",
    "stands as a", "serves as a",
    "at its core", "in conclusion",
    "to summarize", "in summary",
    "as previously mentioned", "as mentioned above",
    "in the context of", "with that being said",
    "that being said", "having said that",
    "on the other hand", "it goes without saying",
    "a testament to", "a wide range of",
    "a variety of", "in order to",
    "due to the fact that", "in light of",
    "with respect to", "with regard to",
    "in terms of", "by means of"
  ]
}

// ── TRANSITION WORD DATABASE ────────────────────────────────

const TRANSITIONS = {
  additive: ["furthermore", "moreover", "additionally", "in addition",
             "also", "besides", "likewise", "similarly", "equally"],
  contrast: ["however", "nevertheless", "nonetheless", "on the contrary",
             "conversely", "notwithstanding", "despite this", "even so"],
  causal: ["therefore", "consequently", "as a result", "thus", "hence",
           "accordingly", "for this reason", "this leads to"],
  sequence: ["firstly", "secondly", "thirdly", "finally", "subsequently",
             "previously", "initially", "ultimately", "lastly"],
  emphasis: ["indeed", "certainly", "undoubtedly", "unquestionably",
             "without doubt", "of course", "naturally", "obviously"]
}

// ── CONTRACTION PAIRS ───────────────────────────────────────

const CONTRACTION_PAIRS = [
  { expanded: "do not", contracted: "don't" },
  { expanded: "does not", contracted: "doesn't" },
  { expanded: "did not", contracted: "didn't" },
  { expanded: "will not", contracted: "won't" },
  { expanded: "would not", contracted: "wouldn't" },
  { expanded: "could not", contracted: "couldn't" },
  { expanded: "should not", contracted: "shouldn't" },
  { expanded: "is not", contracted: "isn't" },
  { expanded: "are not", contracted: "aren't" },
  { expanded: "was not", contracted: "wasn't" },
  { expanded: "were not", contracted: "weren't" },
  { expanded: "have not", contracted: "haven't" },
  { expanded: "has not", contracted: "hasn't" },
  { expanded: "had not", contracted: "hadn't" },
  { expanded: "it is", contracted: "it's" },
  { expanded: "it has", contracted: "it's" },
  { expanded: "that is", contracted: "that's" },
  { expanded: "there is", contracted: "there's" },
  { expanded: "they are", contracted: "they're" },
  { expanded: "we are", contracted: "we're" },
  { expanded: "you are", contracted: "you're" },
  { expanded: "i am", contracted: "i'm" },
  { expanded: "i will", contracted: "i'll" },
  { expanded: "i would", contracted: "i'd" },
  { expanded: "i have", contracted: "i've" }
]

// ── PASSIVE VOICE PATTERNS ──────────────────────────────────

const PASSIVE_PATTERNS = [
  /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi,
  /\b(is|are|was|were)\s+\w+en\b/gi,
  /\bhas been\s+\w+(ed|en)\b/gi,
  /\bhave been\s+\w+(ed|en)\b/gi,
  /\bhad been\s+\w+(ed|en)\b/gi,
  /\bwill be\s+\w+(ed|en)\b/gi
]

// ── HEDGING PHRASES ─────────────────────────────────────────

const HEDGING_PHRASES = [
  "it is important to note that",
  "it's important to note that",
  "it is worth noting that",
  "it's worth noting that",
  "it should be noted that",
  "one should note that",
  "it is essential to understand",
  "it is crucial to recognize",
  "it is vital to",
  "one must consider",
  "it can be argued that",
  "some might say that",
  "it could be suggested",
  "research suggests that",
  "studies have shown that",
  "according to research",
  "experts believe that",
  "it has been observed that",
  "it is generally accepted"
]

// ── FORMALITY MARKERS ───────────────────────────────────────

const FORMAL_MARKERS = [
  "therefore", "subsequently", "consequently", "thus", "hence",
  "whereby", "wherein", "herein", "thereof", "hitherto",
  "heretofore", "aforementioned", "notwithstanding", "inasmuch"
]

const INFORMAL_MARKERS = [
  "pretty", "kind of", "sort of", "basically", "literally",
  "actually", "honestly", "tbh", "you know", "stuff",
  "things", "a lot", "tons of", "way more", "way less"
]


// ============================================================
// STEP 1: TEXT PREPROCESSING
// ============================================================

function preprocessText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  const totalWords = words.length
  const totalSentences = sentences.length

  return { sentences, words, paragraphs, totalWords, totalSentences }
}


// ============================================================
// MODULE 1: AI Vocabulary Fingerprint Scanner
// ============================================================

function detectAIVocab(text) {
  const lower = text.toLowerCase()
  const flagged = []
  let score = 0

  // Scan critical words
  AI_VOCAB.critical.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = [...text.matchAll(regex)]
    matches.forEach(m => {
      score += 2
      flagged.push({
        text: m[0],
        index: m.index,
        type: 'vocab',
        detail: `AI fingerprint word: "${word}"`
      })
    })
  })

  // Scan phrases
  AI_VOCAB.phrases.forEach(phrase => {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      score += 3
      flagged.push({
        text: text.substring(idx, idx + phrase.length),
        index: idx,
        type: 'vocab',
        detail: `AI fingerprint phrase: "${phrase}"`
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  })

  return { flagged, score, count: flagged.length }
}


// ============================================================
// MODULE 2: Transition Word Overuse Detector
// ============================================================

function detectTransitions(sentences) {
  let count = 0
  const flagged = []

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase().trim()
    for (const category in TRANSITIONS) {
      TRANSITIONS[category].forEach(transition => {
        if (lower.startsWith(transition) || lower.includes(`, ${transition}`)) {
          count++
          flagged.push({
            text: sentence.trim(),
            type: 'transition',
            detail: `Transition overuse: "${transition}"`
          })
        }
      })
    }
  })

  const ratio = sentences.length > 0 ? count / sentences.length : 0
  return {
    count,
    flagged,
    score: ratio > 0.15 ? ratio * 40 : ratio * 20
  }
}


// ============================================================
// MODULE 3: Sentence Length Uniformity Detector
// ============================================================

function detectRhythmUniformity(sentences) {
  if (sentences.length < 3) return { stdDev: 99, clusters: [], score: 0, flagged: [] }

  const lengths = sentences.map(s => s.trim().split(/\s+/).length)

  // Standard deviation
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / lengths.length
  const stdDev = Math.sqrt(variance)

  // Find clusters of similar-length sentences (3+ in a row within 4 words)
  const clusters = []
  let currentCluster = [0]

  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= 4) {
      currentCluster.push(i)
    } else {
      if (currentCluster.length >= 3) clusters.push([...currentCluster])
      currentCluster = [i]
    }
  }
  if (currentCluster.length >= 3) clusters.push([...currentCluster])

  const uniformityScore = stdDev < 5 ? 30 : stdDev < 8 ? 15 : 0
  const clusterScore = clusters.length * 8

  const flagged = []
  clusters.forEach(cluster => {
    cluster.forEach(i => {
      flagged.push({
        text: sentences[i].trim(),
        type: 'rhythm',
        detail: `Uniform sentence length pattern (stdDev: ${stdDev.toFixed(1)})`
      })
    })
  })

  return {
    stdDev,
    clusters: clusters.map(c => c.map(i => sentences[i])),
    score: uniformityScore + clusterScore,
    flagged
  }
}


// ============================================================
// MODULE 4: Contraction Absence Detector
// ============================================================

function detectContractionAbsence(text) {
  let opportunitiesMissed = 0
  const flaggedSpans = []

  CONTRACTION_PAIRS.forEach(pair => {
    const regex = new RegExp(`\\b${pair.expanded}\\b`, 'gi')
    const matches = [...text.matchAll(regex)]
    opportunitiesMissed += matches.length
    matches.forEach(m => {
      flaggedSpans.push({
        text: m[0],
        index: m.index,
        type: 'formal',
        detail: `"${pair.expanded}" → should be "${pair.contracted}"`
      })
    })
  })

  return {
    opportunitiesMissed,
    flaggedSpans,
    flagged: flaggedSpans,
    score: Math.min(opportunitiesMissed * 2, 25)
  }
}


// ============================================================
// MODULE 5: Passive Voice Clustering Detector
// ============================================================

function detectPassiveVoice(sentences) {
  let passiveCount = 0
  const flagged = []

  sentences.forEach(sentence => {
    let isPassive = false
    PASSIVE_PATTERNS.forEach(pattern => {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0
      if (pattern.test(sentence)) isPassive = true
    })
    if (isPassive) {
      passiveCount++
      flagged.push({
        text: sentence.trim(),
        type: 'formal',
        detail: 'Passive voice construction'
      })
    }
  })

  const ratio = sentences.length > 0 ? passiveCount / sentences.length : 0
  return {
    passiveCount,
    flagged,
    score: ratio > 0.25 ? (ratio - 0.25) * 60 : 0
  }
}


// ============================================================
// MODULE 6: Paragraph Symmetry Detector
// ============================================================

function detectParagraphSymmetry(paragraphs) {
  if (paragraphs.length < 2) return { score: 0, flagged: [], stdDev: 99 }

  const lengths = paragraphs.map(p => p.trim().split(/\s+/).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / lengths.length
  const stdDev = Math.sqrt(variance)

  const score = (paragraphs.length > 3 && stdDev < 20) ? 15 : 0

  return { stdDev, score, paragraphs: lengths, flagged: [] }
}


// ============================================================
// MODULE 7: Hedging Phrase Detector
// ============================================================

function detectHedging(text) {
  const lower = text.toLowerCase()
  const flagged = []

  HEDGING_PHRASES.forEach(phrase => {
    let idx = lower.indexOf(phrase)
    while (idx !== -1) {
      flagged.push({
        text: text.substring(idx, idx + phrase.length),
        index: idx,
        type: 'transition',
        detail: `Hedging filler: "${phrase}"`
      })
      idx = lower.indexOf(phrase, idx + 1)
    }
  })

  return { flagged, score: flagged.length * 4 }
}


// ============================================================
// MODULE 8: Punctuation Pattern Detector
// ============================================================

function detectPunctuationPatterns(text, sentences) {
  const emDashes = (text.match(/—/g) || []).length
  const semicolons = (text.match(/;/g) || []).length

  const wordCount = text.split(/\s+/).length
  const emDashRatio = wordCount > 0 ? emDashes / (wordCount / 100) : 0

  const flagged = []
  let score = 0

  if (emDashRatio > 1.5) {
    score += 10
    let idx = text.indexOf('—')
    while (idx !== -1) {
      const start = Math.max(0, idx - 20)
      const end = Math.min(text.length, idx + 20)
      flagged.push({
        text: text.substring(start, end).trim(),
        index: idx,
        type: 'vocab',
        detail: 'Em dash overuse'
      })
      idx = text.indexOf('—', idx + 1)
    }
  }

  if (sentences.length > 0 && semicolons / sentences.length > 0.2) {
    score += 8
  }

  return { emDashes, semicolons, score, flagged }
}


// ============================================================
// MODULE 9: Repetitive Sentence Opener Detector
// ============================================================

function detectRepetitiveOpeners(sentences) {
  const openers = sentences.map(s => {
    const words = s.trim().split(/\s+/)
    return words.slice(0, 2).join(' ').toLowerCase()
  })

  const openerCounts = {}
  openers.forEach(o => { openerCounts[o] = (openerCounts[o] || 0) + 1 })

  const flagged = []
  let score = 0

  Object.entries(openerCounts).forEach(([opener, count]) => {
    if (count >= 3) {
      score += count * 3
      sentences.forEach(s => {
        if (s.trim().toLowerCase().startsWith(opener)) {
          flagged.push({
            text: s.trim(),
            type: 'rhythm',
            detail: `Opener "${opener}" repeated ${count} times`
          })
        }
      })
    }
  })

  return { openerCounts, score, flagged }
}


// ============================================================
// MODULE 10: Formality Consistency Detector
// ============================================================

function detectFormalityConsistency(text) {
  const lower = text.toLowerCase()
  let formalCount = 0
  let informalCount = 0

  FORMAL_MARKERS.forEach(m => { if (lower.includes(m)) formalCount++ })
  INFORMAL_MARKERS.forEach(m => { if (lower.includes(m)) informalCount++ })

  const purelyFormal = formalCount > 3 && informalCount === 0

  return {
    formalCount,
    informalCount,
    score: purelyFormal ? 12 : 0,
    flagged: [],
    detail: purelyFormal
      ? 'Zero register variation — consistent AI formality'
      : 'Normal register variation'
  }
}


// ============================================================
// FINAL SCORE CALCULATOR
// ============================================================

function calculateFinalScore(moduleResults) {
  const rawScore = Object.values(moduleResults).reduce(
    (sum, m) => sum + (m.score || 0), 0
  )

  const normalized = Math.min(Math.round(rawScore * 1.8), 100)

  let verdict, color
  if (normalized < 20) {
    verdict = 'Likely Human Written'
    color = '#22c55e'
  } else if (normalized < 40) {
    verdict = 'Mostly Human with AI Touches'
    color = '#84cc16'
  } else if (normalized < 60) {
    verdict = 'Mixed — AI Assisted'
    color = '#eab308'
  } else if (normalized < 80) {
    verdict = 'Likely AI Generated'
    color = '#f97316'
  } else {
    verdict = 'Almost Certainly AI Generated'
    color = '#ef4444'
  }

  return { score: normalized, verdict, color }
}


// ============================================================
// HIGH-CONFIDENCE FLAGGING
// Sentences with 3+ signals from any category → high-confidence
// ============================================================

function flagHighConfidence(allFlagged, sentences) {
  const sentenceSignals = {}

  // Count signals per sentence text
  allFlagged.forEach(f => {
    const key = f.text.trim()
    if (!sentenceSignals[key]) sentenceSignals[key] = new Set()
    sentenceSignals[key].add(f.type)
  })

  const highConfidence = []
  // Also count by checking which flagged items fall within which sentence
  sentences.forEach(sentence => {
    const trimmed = sentence.trim()
    let signalCount = 0
    const signalTypes = new Set()

    allFlagged.forEach(f => {
      if (trimmed.includes(f.text) || f.text.includes(trimmed)) {
        signalCount++
        signalTypes.add(f.type)
      }
    })

    if (signalCount >= 3 || signalTypes.size >= 3) {
      highConfidence.push({
        text: trimmed,
        type: 'high-confidence',
        detail: `${signalCount} AI signals detected (${[...signalTypes].join(', ')})`
      })
    }
  })

  return highConfidence
}


// ============================================================
// MASTER DETECTION FUNCTION
// ============================================================

export function runDetection(text) {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      verdict: 'No text to analyze',
      spans: [],
      summary: {
        transition_count: 0,
        rhythm_count: 0,
        vocab_count: 0,
        formal_count: 0,
        high_confidence_count: 0
      }
    }
  }

  const { sentences, paragraphs } = preprocessText(text)

  // Run all 10 modules
  const vocabResult = detectAIVocab(text)
  const transitionResult = detectTransitions(sentences)
  const rhythmResult = detectRhythmUniformity(sentences)
  const contractionResult = detectContractionAbsence(text)
  const passiveResult = detectPassiveVoice(sentences)
  const paragraphResult = detectParagraphSymmetry(paragraphs)
  const hedgingResult = detectHedging(text)
  const punctuationResult = detectPunctuationPatterns(text, sentences)
  const openerResult = detectRepetitiveOpeners(sentences)
  const formalityResult = detectFormalityConsistency(text)

  // Combine all module scores
  const moduleResults = {
    vocab: vocabResult,
    transition: transitionResult,
    rhythm: rhythmResult,
    contraction: contractionResult,
    passive: passiveResult,
    paragraph: paragraphResult,
    hedging: hedgingResult,
    punctuation: punctuationResult,
    opener: openerResult,
    formality: formalityResult
  }

  // Calculate final score
  const { score, verdict } = calculateFinalScore(moduleResults)

  // Collect all flagged spans
  const allFlagged = [
    ...vocabResult.flagged,
    ...transitionResult.flagged,
    ...rhythmResult.flagged,
    ...(contractionResult.flagged || contractionResult.flaggedSpans),
    ...passiveResult.flagged,
    ...hedgingResult.flagged,
    ...punctuationResult.flagged,
    ...openerResult.flagged
  ]

  // Flag high-confidence sentences
  const highConfidence = flagHighConfidence(allFlagged, sentences)

  // Merge all spans, deduplicate by text
  const allSpans = [...allFlagged, ...highConfidence]
  const seenTexts = new Set()
  const dedupedSpans = []

  // Prefer high-confidence over other types
  const sortedSpans = allSpans.sort((a, b) => {
    if (a.type === 'high-confidence' && b.type !== 'high-confidence') return -1
    if (b.type === 'high-confidence' && a.type !== 'high-confidence') return 1
    return 0
  })

  sortedSpans.forEach(span => {
    const key = span.text.trim()
    if (!seenTexts.has(key)) {
      seenTexts.add(key)
      dedupedSpans.push({
        text: span.text,
        category: span.type,
        reason: span.detail
      })
    }
  })

  // Build summary counts
  const summary = {
    transition_count: transitionResult.count + hedgingResult.flagged.length,
    rhythm_count: rhythmResult.flagged.length + openerResult.flagged.length,
    vocab_count: vocabResult.count,
    formal_count: (contractionResult.flagged || contractionResult.flaggedSpans).length + passiveResult.passiveCount,
    high_confidence_count: highConfidence.length
  }

  return { score, verdict, spans: dedupedSpans, summary }
}

// Export constants for the humanizer to reuse
export { AI_VOCAB, TRANSITIONS, CONTRACTION_PAIRS, HEDGING_PHRASES }
