// ============================================================
// HumanizerIQ — HUMANIZER ENGINE
// Pure client-side text humanization. No API calls.
// Systematically destroys AI writing patterns based on
// style (Academic/Professional/Casual) and difficulty
// (Easy/Medium/Hard).
// ============================================================

import { AI_VOCAB, TRANSITIONS, CONTRACTION_PAIRS, HEDGING_PHRASES } from './detector'

// ── REPLACEMENT MAPS ────────────────────────────────────────

const VOCAB_REPLACEMENTS = {
  'delve': 'explore',
  'delves': 'explores',
  'delving': 'exploring',
  'delved': 'explored',
  'tapestry': 'mix',
  'nuanced': 'subtle',
  'multifaceted': 'complex',
  'bustling': 'busy',
  'harnessing': 'using',
  'showcasing': 'showing',
  'revolutionize': 'change',
  'revolutionizing': 'changing',
  'meticulous': 'careful',
  'meticulously': 'carefully',
  'commendable': 'impressive',
  'pivotal': 'key',
  'intricate': 'detailed',
  'intricacies': 'details',
  'underscore': 'highlight',
  'underscores': 'highlights',
  'paramount': 'critical',
  'embark': 'start',
  'embarks': 'starts',
  'embarking': 'starting',
  'foster': 'encourage',
  'fosters': 'encourages',
  'fostering': 'encouraging',
  'leverage': 'use',
  'leverages': 'uses',
  'leveraging': 'using',
  'robust': 'strong',
  'robustness': 'strength',
  'paradigm': 'model',
  'realm': 'area',
  'realms': 'areas',
  'beacon': 'example',
  'testament': 'proof',
  'noteworthy': 'notable',
  'groundbreaking': 'new',
  'cutting-edge': 'modern',
  'state-of-the-art': 'modern',
  'game-changing': 'important',
  'synergy': 'cooperation',
  'holistic': 'complete',
  'scalable': 'flexible',
  'transformative': 'powerful',
  'dynamic': 'active',
  'innovative': 'creative',
  'streamline': 'simplify',
  'streamlines': 'simplifies'
}

const TRANSITION_REPLACEMENTS = {
  'furthermore': ['Also,', 'Plus,', 'And', ''],
  'moreover': ['And', 'Plus,', 'On top of that,', ''],
  'additionally': ['Also,', 'Plus,', 'And', ''],
  'in addition': ['Also,', 'Plus,', ''],
  'however': ['But', 'Still,', 'That said,', 'Though'],
  'nevertheless': ['Still,', 'But', 'Even so,'],
  'nonetheless': ['Still,', 'Even so,', 'But'],
  'therefore': ['So', 'Because of this,', 'That means'],
  'consequently': ['So', 'As a result,', 'Because of this,'],
  'thus': ['So', 'This means', ''],
  'hence': ['So', 'That\'s why', ''],
  'accordingly': ['So', 'Because of that,', ''],
  'firstly': ['First,', 'First off,', 'To start,'],
  'secondly': ['Second,', 'Next,', 'Then,'],
  'thirdly': ['Third,', 'After that,', 'Then,'],
  'subsequently': ['Then,', 'After that,', 'Next,'],
  'ultimately': ['In the end,', 'Eventually,', 'Finally,'],
  'indeed': ['Really,', 'In fact,', ''],
  'certainly': ['Sure,', 'Of course,', ''],
  'undoubtedly': ['Clearly,', 'No question,', ''],
  'in conclusion': ['So', 'All in all,', 'Bottom line:'],
  'to summarize': ['So', 'In short,', 'Basically,'],
  'in summary': ['So', 'In short,', 'Put simply,']
}

// Casual-specific replacements (more conversational)
const CASUAL_TRANSITION_REPLACEMENTS = {
  'furthermore': ['Plus,', 'Oh, and', 'And yeah,', ''],
  'moreover': ['And honestly,', 'Plus,', 'Also —', ''],
  'additionally': ['Oh, and', 'Plus,', ''],
  'however': ['But honestly,', 'Thing is though,', 'But'],
  'nevertheless': ['Still though,', 'But yeah,', 'Even so —'],
  'therefore': ['So yeah,', 'So basically,', 'Which means'],
  'consequently': ['So basically,', 'Which meant', ''],
  'in conclusion': ['Anyway,', 'So yeah —', 'Long story short,'],
  'indeed': ['Honestly,', 'For real,', ''],
  'certainly': ['Definitely,', 'For sure,', '']
}

// ── HEDGING REMOVAL ─────────────────────────────────────────

const HEDGING_REMOVALS = {
  'it is important to note that': '',
  "it's important to note that": '',
  'it is worth noting that': '',
  "it's worth noting that": '',
  'it should be noted that': '',
  'one should note that': '',
  'it is essential to understand that': '',
  'it is crucial to recognize that': '',
  'it is vital to understand that': '',
  'it is generally accepted that': '',
  'it has been observed that': '',
  'needless to say,': '',
  'it goes without saying that': ''
}

// ── FORMAL SYNONYM DOWNGRADES ───────────────────────────────

const FORMAL_SYNONYMS = {
  'utilize': 'use',
  'utilizes': 'uses',
  'utilizing': 'using',
  'utilized': 'used',
  'utilization': 'use',
  'commence': 'start',
  'commences': 'starts',
  'commencing': 'starting',
  'commenced': 'started',
  'endeavor': 'try',
  'endeavors': 'tries',
  'endeavoring': 'trying',
  'endeavored': 'tried',
  'facilitate': 'help',
  'facilitates': 'helps',
  'facilitating': 'helping',
  'facilitated': 'helped',
  'ascertain': 'find out',
  'elucidate': 'explain',
  'ameliorate': 'improve',
  'promulgate': 'promote',
  'disseminate': 'share',
  'cognizant': 'aware',
  'necessitate': 'need',
  'necessitates': 'needs',
  'predominantly': 'mostly',
  'subsequent': 'next',
  'subsequently': 'then',
  'prior to': 'before',
  'in order to': 'to',
  'due to the fact that': 'because',
  'in light of': 'given',
  'with respect to': 'about',
  'with regard to': 'about',
  'in terms of': 'for',
  'by means of': 'through',
  'a wide range of': 'many',
  'a variety of': 'various',
  'a plethora of': 'many',
  'a myriad of': 'many'
}


// ============================================================
// CORE TRANSFORM FUNCTIONS
// ============================================================

/**
 * Replace AI vocabulary with human alternatives
 */
function replaceAIVocab(text) {
  let result = text
  // Replace phrases first (longer matches first)
  const sortedPhrases = Object.entries({ ...FORMAL_SYNONYMS, ...VOCAB_REPLACEMENTS })
    .sort((a, b) => b[0].length - a[0].length)

  sortedPhrases.forEach(([from, to]) => {
    const regex = new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi')
    result = result.replace(regex, (match) => {
      // Preserve original capitalization
      if (match[0] === match[0].toUpperCase() && to.length > 0) {
        return to[0].toUpperCase() + to.slice(1)
      }
      return to
    })
  })

  return result
}

/**
 * Replace transition phrases
 */
function replaceTransitions(text, style) {
  let result = text
  const replacements = style === 'Casual'
    ? { ...TRANSITION_REPLACEMENTS, ...CASUAL_TRANSITION_REPLACEMENTS }
    : TRANSITION_REPLACEMENTS

  Object.entries(replacements).forEach(([from, toOptions]) => {
    // Match at start of sentence or after comma
    const regex = new RegExp(`(^|(?<=\\.\\s|!\\s|\\?\\s))${escapeRegex(from)}\\b[,]?\\s*`, 'gim')
    result = result.replace(regex, (match, prefix) => {
      const replacement = toOptions[Math.floor(Math.random() * toOptions.length)]
      if (replacement === '') return prefix
      return prefix + replacement + ' '
    })
  })

  return result
}

/**
 * Add contractions where natural
 */
function addContractions(text) {
  let result = text

  CONTRACTION_PAIRS.forEach(pair => {
    const regex = new RegExp(`\\b${pair.expanded}\\b`, 'gi')
    result = result.replace(regex, (match) => {
      // Preserve capitalization of first word
      const contracted = pair.contracted
      if (match[0] === match[0].toUpperCase()) {
        return contracted[0].toUpperCase() + contracted.slice(1)
      }
      return contracted
    })
  })

  return result
}

/**
 * Remove hedging openers
 */
function removeHedging(text) {
  let result = text

  Object.entries(HEDGING_REMOVALS).forEach(([phrase, replacement]) => {
    const regex = new RegExp(escapeRegex(phrase) + '\\s*', 'gi')
    result = result.replace(regex, (match) => {
      return replacement
    })
  })

  // Clean up: capitalize the letter after removal
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, sep, letter) => {
    return sep + letter.toUpperCase()
  })

  // Clean up sentence starts
  result = result.replace(/(^\s*)([a-z])/gm, (_, space, letter) => {
    return space + letter.toUpperCase()
  })

  return result
}

/**
 * Break sentence length uniformity by splitting long sentences
 * and occasionally merging short ones
 */
function varySentenceLength(sentences, intensity) {
  if (sentences.length < 3) return sentences

  const result = []
  let i = 0

  while (i < sentences.length) {
    const sentence = sentences[i].trim()
    const wordCount = sentence.split(/\s+/).length

    // Split long sentences (>25 words) at natural break points
    if (wordCount > 25 && intensity >= 2) {
      const splitPoints = [
        ', which ', ', and ', ', but ', '; ', ', while ',
        ', although ', ', because ', ', since ', ', where '
      ]
      let didSplit = false
      for (const point of splitPoints) {
        const idx = sentence.indexOf(point)
        if (idx > 10 && idx < sentence.length - 10) {
          const part1 = sentence.substring(0, idx) + '.'
          let part2 = sentence.substring(idx + point.length).trim()
          // Capitalize the second part
          part2 = part2[0].toUpperCase() + part2.slice(1)
          // For certain conjunctions, keep the connector
          if (point.includes('but')) part2 = 'But ' + part2.toLowerCase()
          if (point.includes('and') && Math.random() > 0.5) part2 = 'And ' + part2.toLowerCase()
          result.push(part1)
          result.push(part2)
          didSplit = true
          break
        }
      }
      if (!didSplit) result.push(sentence)
    }
    // Merge very short consecutive sentences (<8 words each)
    else if (wordCount < 8 && i + 1 < sentences.length && intensity >= 2) {
      const nextSentence = sentences[i + 1].trim()
      const nextWordCount = nextSentence.split(/\s+/).length
      if (nextWordCount < 8 && Math.random() > 0.5) {
        // Merge with a connector
        const connectors = [' — ', ', and ', '. ']
        const connector = connectors[Math.floor(Math.random() * connectors.length)]
        const merged = sentence.replace(/[.!?]+$/, '') + connector +
          (connector === '. ' ? nextSentence : nextSentence[0].toLowerCase() + nextSentence.slice(1))
        result.push(merged)
        i += 2
        continue
      } else {
        result.push(sentence)
      }
    } else {
      result.push(sentence)
    }
    i++
  }

  return result
}

/**
 * Break paragraph symmetry — randomly merge/split paragraphs
 */
function breakParagraphSymmetry(paragraphs) {
  if (paragraphs.length <= 2) return paragraphs

  const result = []

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim()
    if (!p) continue

    const sentences = p.match(/[^.!?]+[.!?]+/g) || [p]

    // If a paragraph has many sentences, sometimes split it
    if (sentences.length > 5 && Math.random() > 0.6) {
      const splitPoint = Math.floor(sentences.length * (0.3 + Math.random() * 0.4))
      result.push(sentences.slice(0, splitPoint).join(' '))
      result.push(sentences.slice(splitPoint).join(' '))
    }
    // Occasionally merge short paragraphs with the next
    else if (sentences.length <= 2 && i + 1 < paragraphs.length && Math.random() > 0.5) {
      result.push(p + ' ' + paragraphs[i + 1].trim())
      i++ // skip next
    } else {
      result.push(p)
    }
  }

  return result
}

/**
 * Inject fragments and rhetorical questions (HARD mode)
 */
function injectHumanQuirks(text, style) {
  let sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const wordCount = text.split(/\s+/).length

  // Add one fragment per ~200 words
  const fragmentCount = Math.max(1, Math.floor(wordCount / 200))
  const fragments = style === 'Casual'
    ? ['Big difference.', 'Not even close.', 'Worth thinking about.', 'Simple as that.',
       'That matters.', 'A lot.', 'No question.', 'Real talk.', 'Huge.']
    : ['A critical distinction.', 'Worth considering.', 'Not always the case.',
       'The key takeaway.', 'A meaningful shift.', 'No small feat.']

  for (let f = 0; f < fragmentCount && sentences.length > 3; f++) {
    const insertAt = Math.floor(Math.random() * (sentences.length - 2)) + 1
    const fragment = fragments[Math.floor(Math.random() * fragments.length)]
    sentences.splice(insertAt, 0, ' ' + fragment)
  }

  // Add a rhetorical question every ~300 words
  if (wordCount > 150) {
    const questions = style === 'Casual'
      ? ['So what does that actually mean?', 'But does it really work that way?',
         'Why does this matter?', 'Sound familiar?', 'Make sense?']
      : ['But what does this mean in practice?', 'Why does this matter?',
         'What are the real implications?', 'Is this always the case?']

    const qInsertAt = Math.floor(sentences.length * (0.4 + Math.random() * 0.3))
    const question = questions[Math.floor(Math.random() * questions.length)]
    sentences.splice(qInsertAt, 0, ' ' + question)
  }

  return sentences.join('')
}

/**
 * Ensure no two consecutive sentences have the same structure (HARD mode)
 * Checks for same first word or same word count (±2)
 */
function diversifySentenceStructure(sentences) {
  const result = [...sentences]

  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1].trim()
    const curr = result[i].trim()

    const prevWords = prev.split(/\s+/)
    const currWords = curr.split(/\s+/)

    // If same opener, restructure
    if (prevWords[0] && currWords[0] &&
        prevWords[0].toLowerCase() === currWords[0].toLowerCase()) {
      // Try to rearrange: move a clause to the front
      const commaIdx = curr.indexOf(', ')
      if (commaIdx > 5 && commaIdx < curr.length - 10) {
        const beforeComma = curr.substring(0, commaIdx)
        const afterComma = curr.substring(commaIdx + 2)
        result[i] = afterComma[0].toUpperCase() + afterComma.slice(1) + ' — ' +
                    beforeComma[0].toLowerCase() + beforeComma.slice(1) + '.'
      }
    }

    // If very similar length (±2 words), don't touch — let sentence splitting handle it
  }

  return result
}


// ============================================================
// UTILITY
// ============================================================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanupText(text) {
  return text
    // Fix double spaces
    .replace(/  +/g, ' ')
    // Fix space before punctuation
    .replace(/\s+([.!?,;:])/g, '$1')
    // Fix missing space after punctuation
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    // Fix double periods
    .replace(/\.{2,}/g, '.')
    // Fix orphaned commas
    .replace(/, ,/g, ',')
    // Ensure paragraphs have proper spacing
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim()
}


// ============================================================
// MASTER HUMANIZE FUNCTION
// ============================================================

/**
 * @param {string} text - Input text
 * @param {string} style - 'Academic' | 'Professional' | 'Casual'
 * @param {string} difficulty - 'Easy' | 'Medium' | 'Hard'
 * @returns {string} Humanized text
 */
export function runHumanizer(text, style = 'Professional', difficulty = 'Medium') {
  if (!text || text.trim().length === 0) return ''

  const intensityMap = { Easy: 1, Medium: 2, Hard: 3 }
  const intensity = intensityMap[difficulty] || 2

  let result = text

  // ── STEP 1: Always apply (all difficulties) ──────────────

  // 1a. Replace AI vocabulary fingerprints
  result = replaceAIVocab(result)

  // 1b. Replace transition phrases
  result = replaceTransitions(result, style)

  // 1c. Add contractions (skip for Academic/Easy)
  if (!(style === 'Academic' && intensity === 1)) {
    result = addContractions(result)
  }

  // 1d. Remove hedging openers
  result = removeHedging(result)

  // ── STEP 2: Medium and Hard ───────────────────────────────

  if (intensity >= 2) {
    // 2a. Vary sentence length
    const sentences = result.match(/[^.!?]+[.!?]+/g) || [result]
    const varied = varySentenceLength(sentences, intensity)
    result = varied.join(' ')

    // 2b. Break paragraph symmetry
    const paragraphs = result.split(/\n\n+/).filter(p => p.trim().length > 0)
    if (paragraphs.length > 2) {
      const rebalanced = breakParagraphSymmetry(paragraphs)
      result = rebalanced.join('\n\n')
    }

    // 2c. Diversify sentence structure (restructure ~40% of sentences)
    const sentencesForDiversity = result.match(/[^.!?]+[.!?]+/g) || [result]
    const diversified = diversifySentenceStructure(sentencesForDiversity)
    result = diversified.join(' ')
  }

  // ── STEP 3: Hard only ─────────────────────────────────────

  if (intensity >= 3) {
    // 3a. Inject fragments and rhetorical questions
    result = injectHumanQuirks(result, style)

    // 3b. For casual mode, add mild informal touches
    if (style === 'Casual') {
      result = result
        .replace(/\bvery important\b/gi, 'really important')
        .replace(/\bsignificant\b/gi, 'big')
        .replace(/\bnumerous\b/gi, 'a bunch of')
        .replace(/\bapproximately\b/gi, 'about')
        .replace(/\bdemonstrate\b/gi, 'show')
        .replace(/\bdemonstrates\b/gi, 'shows')
        .replace(/\bpurchase\b/gi, 'buy')
        .replace(/\bpurchases\b/gi, 'buys')
        .replace(/\bpossess\b/gi, 'have')
        .replace(/\bpossesses\b/gi, 'has')
        .replace(/\bobtain\b/gi, 'get')
        .replace(/\bobtains\b/gi, 'gets')
        .replace(/\brequire\b/gi, 'need')
        .replace(/\brequires\b/gi, 'needs')
        .replace(/\bconstitute\b/gi, 'make up')
        .replace(/\bconstitutes\b/gi, 'makes up')
    }

    // Even in Academic mode at Hard, inject mild informality
    if (style === 'Academic') {
      // Just add occasional contractions to break the monotony
      result = addContractions(result)
    }
  }

  // ── FINAL CLEANUP ─────────────────────────────────────────

  result = cleanupText(result)

  // Fix any sentences that start with lowercase after all transforms
  result = result.replace(/(^|[.!?]\s+)([a-z])/gm, (_, prefix, letter) => {
    return prefix + letter.toUpperCase()
  })

  return result
}
