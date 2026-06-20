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

// ── MASTER CLASS ──
export class CognitiveEngine {
  constructor(overrides = {}) {
    this.config = { ...COGNITIVE_CONFIG, ...overrides }
  }

  run(text) {
    const cfg = this.config

    // Module 1: Cognitive load decay (operates on full text)
    let result = cognitiveLoadDecay(text, cfg)

    // Module 4: Retrospective amendment (operates on full text)
    result = retrospectiveAmendment(result, cfg)

    // Split into sentences for sentence-level modules
    let sentences = result.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [result]

    // Module 2: Egocentric sequencing
    sentences = egocentricSequencing(sentences, cfg)

    // Module 3: Affective prosody
    sentences = affectiveProsody(sentences, cfg)

    // Module 5: Salience distortion
    sentences = salienceDistortion(sentences, cfg)

    return sentences.join(' ')
  }
}

export { COGNITIVE_CONFIG }
