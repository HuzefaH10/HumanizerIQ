// HumanizerIQ — Cognitive Simulation Layer
// Runs AFTER the existing transform pipeline as a post-processing pass.

const COGNITIVE_CONFIG = {
  cognitiveLoad:        0.6,
  affectiveState:       'neutral',
  contextualEllipsis:   0.4,
  salienceBias:         0.5,
  audienceAwareness:    0.4,
  experientialDepth:    0.3,
  energyDecay:          0.4,
  style:                'professional',
  difficulty:           'medium'
}

// ── MODULE 1: Cognitive Load & Syntactic Decay ──
function cognitiveLoadDecay(text, config) {
  if (config.difficulty === 'easy') return text

  const parallelPattern = /\b(to \w+,\s*to \w+,\s*and to \w+|\w+ing,\s*\w+ing,\s*and \w+ing)\b/gi

  return text.replace(parallelPattern, (match) => {
    if (Math.random() > config.cognitiveLoad) return match
    const parts = match.split(/,\s*(?:and\s*)?/)
    const last = parts[parts.length - 1]
    const casualEndings = [
      `and hopefully ${last} as well`,
      `and generally just ${last} better`,
      `and make ${last} work properly`,
      `while also dealing with ${last}`
    ]
    parts[parts.length - 1] = casualEndings[Math.floor(Math.random() * casualEndings.length)]
    return parts.join(', ')
  })
}

// ── MODULE 2: Egocentric Information Sequencing ──
function egocentricSequencing(sentences, config) {
  if (config.difficulty === 'easy') return sentences

  const causeEffectPatterns = [
    /^Because ([^,]+),\s*(.+)$/i,
    /^Since ([^,]+),\s*(.+)$/i,
    /^As a result of ([^,]+),\s*(.+)$/i,
    /^Due to ([^,]+),\s*(.+)$/i
  ]

  return sentences.map(sentence => {
    if (Math.random() > 0.25) return sentence

    for (const pattern of causeEffectPatterns) {
      const match = sentence.match(pattern)
      if (match) {
        const cause = match[1]
        const effect = match[2]
        const connectors = [
          `${effect} — mostly because of ${cause}`,
          `${effect}, which happened due to ${cause} anyway`,
          `${effect}. That came down to ${cause}, really.`
        ]
        return connectors[Math.floor(Math.random() * connectors.length)]
      }
    }
    return sentence
  })
}

// ── MODULE 3: Affective Prosody ──
function affectiveProsody(sentences, config) {
  if (config.affectiveState === 'neutral') return sentences

  return sentences.map((sentence, i) => {
    if (Math.random() > 0.2) return sentence

    if (config.affectiveState === 'urgent') {
      return sentence
        .replace(/,\s*and\s*/gi, '. ')
        .replace(/,\s*but\s*/gi, '. But ')
        .replace(/\s+which\s+/gi, '. It ')
        .replace(/\s+that\s+enables\s+/gi, '. This ')
    }

    if (config.affectiveState === 'reflective') {
      const trailers = [
        ', and it kind of just sits there',
        ', and I\'m not sure it fully resolves',
        ', and maybe that\'s okay actually',
        ', or at least that\'s how it felt at the time'
      ]
      return sentence.replace(/\.$/, trailers[Math.floor(Math.random() * trailers.length)] + '.')
    }

    if (config.affectiveState === 'frustrated') {
      const interjections = ['Honestly, ', 'Look, ', 'Here\'s the thing — ', 'Strangely enough, ']
      if (i % 4 === 0) return interjections[Math.floor(Math.random() * interjections.length)] + sentence
    }

    return sentence
  })
}

// ── MODULE 4: Retrospective Amendment ──
function retrospectiveAmendment(text, config) {
  if (config.difficulty === 'easy') return text

  const absolutePatterns = [
    { pattern: /\balways\b/gi, amendment: '— or almost always, in my experience —' },
    { pattern: /\bcompletely\b/gi, amendment: '— well, mostly —' },
    { pattern: /\beveryone\b/gi, amendment: '— or at least most people —' },
    { pattern: /\bnever\b/gi, amendment: '— or rarely, anyway —' },
    { pattern: /\bentirely\b/gi, amendment: '— well, largely —' },
    { pattern: /\bperfectly\b/gi, amendment: '— or near enough —' },
    { pattern: /\ball\b/gi, amendment: '— most, at least —' }
  ]

  let result = text
  let amendmentCount = 0
  const maxAmendments = Math.floor(text.split(/\s+/).length / 150) + 1

  absolutePatterns.forEach(({ pattern, amendment }) => {
    if (amendmentCount >= maxAmendments) return
    result = result.replace(pattern, (match) => {
      if (Math.random() > 0.35 || amendmentCount >= maxAmendments) return match
      amendmentCount++
      return `${match} ${amendment}`
    })
  })

  return result
}

// ── MODULE 5: Salience Distortion & Attention Asymmetry ──
function salienceDistortion(sentences, config) {
  if (config.difficulty === 'easy') return sentences
  if (sentences.length < 4) return sentences

  const concreteMarkers = /\b(click|open|select|enter|choose|drag|press|type|scroll|find)\b/i
  const abstractMarkers = /\b(concept|theory|framework|methodology|approach|paradigm)\b/i

  return sentences.map((sentence, i) => {
    if (concreteMarkers.test(sentence) && Math.random() < config.salienceBias) {
      const expansions = [
        ' You know the one — it\'s easy to miss at first.',
        ' Takes a second to find if you\'re new to it.',
        ' Worth double-checking before moving on.'
      ]
      return sentence.replace(/\.$/, expansions[Math.floor(Math.random() * expansions.length)])
    }

    if (abstractMarkers.test(sentence) && Math.random() < config.salienceBias * 0.5) {
      const compressions = [
        ' You get the idea.',
        ' Standard stuff.',
        ' Most people know this part already.'
      ]
      return sentence.replace(/\.$/, compressions[Math.floor(Math.random() * compressions.length)])
    }

    return sentence
  })
}

// ── MODULE 6: Chunked Reasoning Boundaries ──
function chunkedReasoning(sentences, config) {
  if (config.difficulty === 'easy') return sentences
  if (sentences.length < 6) return sentences

  const miniConclusions = [
    'So that\'s the core of it.',
    'Anyway, that part makes sense.',
    'That\'s basically the gist.',
    'Which brings up the next point.',
    'Worth keeping in mind going forward.'
  ]

  let result = [...sentences]
  const chunkSize = Math.floor(3 + Math.random() * 2)

  for (let i = chunkSize; i < result.length - 1; i += chunkSize) {
    if (Math.random() < 0.4) {
      result.splice(i, 0, miniConclusions[Math.floor(Math.random() * miniConclusions.length)])
      i++
    }
  }

  return result
}

// ── MODULE 7: Episodic Memory & Visuomotor Grounding ──
const VISUOMOTOR_REPLACEMENTS = [
  { pattern: /\bthe data (?:clearly )?(?:demonstrates|shows|indicates)\b/gi,
    replace: 'if you look at how these numbers line up' },
  { pattern: /\bit is evident that\b/gi,
    replace: 'you can see pretty clearly that' },
  { pattern: /\bthis concept underpins\b/gi,
    replace: 'this idea gives us a solid place to stand when looking at' },
  { pattern: /\bresearch confirms\b/gi,
    replace: 'the numbers back this up' },
  { pattern: /\banalysis reveals\b/gi,
    replace: 'when you dig into it' },
  { pattern: /\bit can be observed that\b/gi,
    replace: 'you start to notice that' },
  { pattern: /\bstatistics demonstrate\b/gi,
    replace: 'the numbers tell a pretty clear story' },
  { pattern: /\bevidence suggests\b/gi,
    replace: 'everything points to' }
]

function visuomotorGrounding(text, config) {
  let result = text
  VISUOMOTOR_REPLACEMENTS.forEach(({ pattern, replace }) => {
    result = result.replace(pattern, () => {
      return Math.random() < 0.6 ? replace : pattern.source
    })
  })
  return result
}

// ── MODULE 8: Functional Analogy Injection ──
const ANALOGY_TRIGGERS = {
  'network bandwidth': 'a crowded hallway where everyone\'s trying to squeeze through one door at the same time',
  'database query': 'asking someone to find a specific book in a massive library with no catalog',
  'cache': 'keeping your most-used stuff on your desk instead of filing it away every time',
  'encryption': 'locking a message in a box and only giving the key to the right person',
  'api': 'a waiter taking your order to the kitchen — you don\'t go back there yourself',
  'algorithm': 'a recipe — follow the steps and you get the same result every time',
  'machine learning': 'teaching by example rather than writing out every rule explicitly',
  'recursion': 'a mirror reflecting another mirror — it keeps going until something stops it',
  'server': 'a really fast computer in a room somewhere that handles requests all day',
  'cloud': 'someone else\'s computer that you rent and access over the internet'
}

function analogyInjection(text, config) {
  if (config.style === 'academic') return text

  let result = text
  Object.entries(ANALOGY_TRIGGERS).forEach(([trigger, analogy]) => {
    const pattern = new RegExp(`\\b${trigger}\\b`, 'gi')
    result = result.replace(pattern, (match) => {
      if (Math.random() > 0.3) return match
      return `${match} — think of it like ${analogy}`
    })
  })
  return result
}

// ── MODULE 9: Cognitive Energy Decay ──
function cognitiveEnergyDecay(sentences, config) {
  if (config.difficulty === 'easy') return sentences
  if (sentences.length < 8) return sentences

  const decayStartIndex = Math.floor(sentences.length * 0.65)

  return sentences.map((sentence, i) => {
    if (i < decayStartIndex) return sentence

    const decayProgress = (i - decayStartIndex) / (sentences.length - decayStartIndex)
    const decayProbability = decayProgress * config.energyDecay

    if (Math.random() > decayProbability) return sentence

    const decayTransforms = [
      s => s.replace(/\b(specifically|particularly|especially|notably)\s+/gi, ''),
      s => s.length > 100 ? s.substring(0, s.lastIndexOf(' ', 80)) + ' — you get the idea.' : s,
      s => s.replace(/\.$/, ' — or something along those lines.'),
      s => s.replace(/\b(\d+(?:\.\d+)?)\s*(percent|%)/gi, 'a fair amount')
    ]

    const transform = decayTransforms[Math.floor(Math.random() * decayTransforms.length)]
    return transform(sentence)
  })
}

// ── MODULE 10: Goal-First Thought Modeling ──
function goalFirstModeling(paragraphs, config) {
  const GOAL_SIGNALS = {
    persuade:   ['should', 'must', 'important', 'critical', 'essential', 'need to'],
    explain:    ['works by', 'means that', 'refers to', 'is defined as', 'in other words'],
    warn:       ['careful', 'avoid', 'danger', 'risk', 'problem', 'issue', 'mistake'],
    reflect:    ['I think', 'I believe', 'in my experience', 'looking back', 'it seems'],
    justify:    ['because', 'reason', 'therefore', 'which is why', 'this is why']
  }

  return paragraphs.map((para, idx) => {
    const lower = para.toLowerCase()
    let detectedGoal = 'explain'
    let maxSignals = 0

    Object.entries(GOAL_SIGNALS).forEach(([goal, signals]) => {
      const count = signals.filter(s => lower.includes(s)).length
      if (count > maxSignals) { maxSignals = count; detectedGoal = goal }
    })

    if (detectedGoal === 'warn' && Math.random() < 0.4) {
      return para + ' Seriously, don\'t skip this part.'
    }
    if (detectedGoal === 'persuade' && Math.random() < 0.3 && idx > 0) {
      return 'Here\'s the thing — ' + para.charAt(0).toLowerCase() + para.slice(1)
    }

    return para
  })
}

// ── MODULE 11: Knowledge Boundary Expression ──
const KNOWLEDGE_BOUNDARY_INJECTIONS = [
  'I understand this part fairly well, though beyond that it gets a bit fuzzy.',
  'That\'s roughly where my knowledge starts running out, honestly.',
  'I\'m less clear on the specifics beyond this point.',
  'The details get complicated from here — I won\'t pretend I have all of them.',
  'This is where it gets outside my immediate experience.'
]

function knowledgeBoundaryExpression(sentences, config) {
  if (config.style === 'academic') return sentences
  if (sentences.length < 5) return sentences

  const result = [...sentences]
  const insertAt = Math.floor(sentences.length * 0.6)

  if (Math.random() < 0.25) {
    result.splice(insertAt, 0,
      KNOWLEDGE_BOUNDARY_INJECTIONS[Math.floor(Math.random() * KNOWLEDGE_BOUNDARY_INJECTIONS.length)]
    )
  }

  return result
}

// ── MODULE 12: Social Audience Modeling ──
const AUDIENCE_OPENERS = {
  familiar:   ['If you already know this, skip ahead.', 'You probably know this already, but —',
                'This might be obvious if you\'ve done it before.'],
  newcomer:   ['If you\'re new to this,', 'For anyone unfamiliar,', 'Just to set the context —'],
  peer:       ['As you can imagine,', 'You\'ve probably run into this before.',
                'You know how it goes —']
}

function socialAudienceModeling(sentences, config) {
  if (config.style === 'academic') return sentences
  if (Math.random() > config.audienceAwareness) return sentences

  const result = [...sentences]
  const category = ['familiar', 'newcomer', 'peer'][Math.floor(Math.random() * 3)]
  const openers = AUDIENCE_OPENERS[category]
  const opener = openers[Math.floor(Math.random() * openers.length)]

  if (result.length > 3) result.splice(1, 0, opener)

  return result
}

// ── MODULE 13: Affect Leakage ──
const AFFECT_LEAKAGE = {
  positive: ['surprisingly enough,', 'which is actually pretty cool,',
             'and this is the interesting part —', 'here\'s what got me —'],
  negative: ['strangely enough,', 'it bothered me that', 'which is frustrating because',
             'weirdly,', 'oddly enough,'],
  neutral:  ['as it turns out,', 'interestingly,', 'which is worth noting —',
             'come to think of it,']
}

function affectLeakage(sentences, config) {
  if (config.style === 'academic') return sentences

  let leakageCount = 0
  const maxLeakage = Math.max(1, Math.floor(sentences.length / 8))

  return sentences.map(sentence => {
    if (leakageCount >= maxLeakage) return sentence
    if (Math.random() > 0.15) return sentence

    const category = config.affectiveState === 'frustrated' ? 'negative' :
                     config.affectiveState === 'reflective' ? 'positive' : 'neutral'
    const leakages = AFFECT_LEAKAGE[category]
    const leakage = leakages[Math.floor(Math.random() * leakages.length)]

    leakageCount++
    return leakage.charAt(0).toUpperCase() + leakage.slice(1) + ' ' +
           sentence.charAt(0).toLowerCase() + sentence.slice(1)
  })
}

// ── MODULE 14: Memory Reconstruction Artifacts ──
const RECALL_MARKERS = [
  'if I remember correctly,',
  'I think the order here might be slightly off, but —',
  'roughly speaking,',
  'I don\'t remember exactly when this became clear, but',
  'somewhere along the way,'
]

function memoryReconstructionArtifacts(sentences, config) {
  if (config.style === 'academic') return sentences
  if (config.difficulty === 'easy') return sentences

  let count = 0
  const max = 1

  return sentences.map(sentence => {
    if (count >= max) return sentence
    if (Math.random() > 0.12) return sentence

    count++
    const marker = RECALL_MARKERS[Math.floor(Math.random() * RECALL_MARKERS.length)]
    return marker.charAt(0).toUpperCase() + marker.slice(1) + ' ' +
           sentence.charAt(0).toLowerCase() + sentence.slice(1)
  })
}

// ── MODULE 15: Cognitive Dissonance Markers ──
const DISSONANCE_BRIDGES = [
  'I know this sounds counterintuitive, but',
  'It seems contradictory, and honestly it kind of is —',
  'This might seem to conflict with what I said earlier, but',
  'Oddly enough, both of these things can be true at once.',
  'I know it sounds odd, but it works.'
]

function cognitiveDissonanceMarkers(sentences, config) {
  if (config.style === 'academic') return sentences
  if (config.difficulty !== 'hard') return sentences
  if (sentences.length < 6) return sentences

  const result = [...sentences]

  if (Math.random() < 0.2) {
    const insertAt = Math.floor(sentences.length * 0.5)
    const bridge = DISSONANCE_BRIDGES[Math.floor(Math.random() * DISSONANCE_BRIDGES.length)]
    result[insertAt] = bridge + ' — ' + result[insertAt].charAt(0).toLowerCase() + result[insertAt].slice(1)
  }

  return result
}

// ── MASTER CLASS ──
export class CognitiveEngine {
  constructor(config = {}) {
    this.config = { ...COGNITIVE_CONFIG, ...config }
  }

  run(text) {
    const cfg = this.config

    // Split into paragraphs
    let paragraphs = text.split(/\n\n+/)

    // Paragraph-level: Module 10
    paragraphs = goalFirstModeling(paragraphs, cfg)

    // Process each paragraph through sentence-level modules
    paragraphs = paragraphs.map(para => {
      let sentences = para.match(/[^.!?]+[.!?]+/g) || [para]

      sentences = egocentricSequencing(sentences, cfg)
      sentences = affectiveProsody(sentences, cfg)
      sentences = salienceDistortion(sentences, cfg)
      sentences = chunkedReasoning(sentences, cfg)
      sentences = cognitiveEnergyDecay(sentences, cfg)
      sentences = knowledgeBoundaryExpression(sentences, cfg)
      sentences = socialAudienceModeling(sentences, cfg)
      sentences = affectLeakage(sentences, cfg)
      sentences = memoryReconstructionArtifacts(sentences, cfg)
      sentences = cognitiveDissonanceMarkers(sentences, cfg)

      return sentences.join(' ')
    })

    // Rejoin paragraphs
    let result = paragraphs.join('\n\n')

    // Text-level transforms
    result = cognitiveLoadDecay(result, cfg)
    result = retrospectiveAmendment(result, cfg)
    result = visuomotorGrounding(result, cfg)
    result = analogyInjection(result, cfg)

    // Cleanup
    result = result
      .replace(/\s{2,}/g, ' ')
      .replace(/\s([.,!?])/g, '$1')
      .replace(/([.!?])\s*([a-z])/g, (m, p, c) => `${p} ${c.toUpperCase()}`)
      .trim()

    return result
  }
}

export { COGNITIVE_CONFIG }
