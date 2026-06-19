// ============================================================
// HumanizerIQ — HUMANIZER ENGINE (v2)
// Pure client-side text humanization. No API calls.
// Systematically destroys AI writing patterns with:
//   - Vocabulary replacement
//   - Contraction injection
//   - Sentence length variation
//   - Human quirk injection (Hard)
//   - Full edge case handling
// ============================================================

import { runDetection } from './detector'

// ============================================================
// VOCABULARY REPLACEMENT MAP
// Sorted longest-first at apply time so multi-word phrases
// match before their sub-words.
// ============================================================

const VOCAB_REPLACEMENTS = {
  // Multi-word phrases (must replace before single words)
  "delve into": "explore",
  "embark on": "start",
  "embark upon": "begin",
  "testament to": "proof of",
  "it is worth noting that": "",
  "it's worth noting that": "",
  "it is important to note that": "",
  "it's important to note that": "",
  "it is crucial to": "you need to",
  "it's crucial to": "you need to",
  "it is essential to": "you should",
  "it's essential to": "you should",
  "it should be noted that": "",
  "it has been observed that": "",
  "it is generally accepted that": "",
  "needless to say": "",
  "it goes without saying that": "",
  "in order to": "to",
  "due to the fact that": "because",
  "in light of": "given",
  "with respect to": "about",
  "with regard to": "about",
  "in terms of": "for",
  "by means of": "using",
  "a wide range of": "many",
  "a variety of": "various",
  "a plethora of": "many",
  "a myriad of": "many",
  "in the realm of": "in",
  "in today's world": "today",
  "in today's fast-paced": "in today's",
  "shed light on": "explain",
  "shed light": "clarify",
  "stands as a": "is a",
  "serves as a": "is a",
  "at its core": "really",
  "as previously mentioned": "",
  "as mentioned above": "",
  "in the context of": "for",
  "with that being said": "still",
  "that being said": "still",
  "having said that": "but",
  "on the other hand": "then again",
  "state-of-the-art": "advanced",
  "cutting-edge": "modern",
  "game-changing": "significant",
  "in conclusion": "",
  "to summarize": "so",
  "in summary": "in short",

  // Single-word replacements
  "delve": "look into",
  "delves": "looks into",
  "delving": "looking into",
  "delved": "looked into",
  "tapestry": "mix",
  "nuanced": "subtle",
  "multifaceted": "complex",
  "meticulous": "careful",
  "meticulously": "carefully",
  "commendable": "impressive",
  "pivotal": "key",
  "intricate": "complex",
  "intricacies": "details",
  "underscore": "highlight",
  "underscores": "shows",
  "paramount": "critical",
  "embark": "start",
  "embarks": "starts",
  "embarking": "starting",
  "foster": "build",
  "fosters": "builds",
  "fostering": "building",
  "leverage": "use",
  "leverages": "uses",
  "leveraging": "using",
  "robust": "strong",
  "robustness": "strength",
  "paradigm": "approach",
  "realm": "area",
  "realms": "areas",
  "beacon": "example",
  "testament": "proof",
  "noteworthy": "notable",
  "groundbreaking": "new",
  "synergy": "teamwork",
  "holistic": "overall",
  "scalable": "flexible",
  "transformative": "significant",
  "dynamic": "active",
  "innovative": "new",
  "streamline": "simplify",
  "streamlines": "simplifies",
  "comprehensive": "complete",
  "facilitate": "help",
  "facilitates": "helps",
  "facilitating": "helping",
  "facilitated": "helped",
  "utilize": "use",
  "utilizes": "uses",
  "utilized": "used",
  "utilizing": "using",
  "utilization": "use",
  "commence": "start",
  "commences": "starts",
  "commenced": "started",
  "commencing": "starting",
  "endeavor": "effort",
  "endeavors": "efforts",
  "endeavour": "effort",
  "endeavoured": "tried",
  "furthermore": "also",
  "moreover": "and",
  "additionally": "",
  "harnessing": "using",
  "showcasing": "showing",
  "revolutionize": "change",
  "revolutionizing": "changing",
  "bustling": "busy",
  "ascertain": "find out",
  "elucidate": "explain",
  "ameliorate": "improve",
  "disseminate": "share",
  "cognizant": "aware",
  "necessitate": "need",
  "necessitates": "needs",
  "predominantly": "mostly",
  "subsequent": "next",
  "subsequently": "then",
  "prior to": "before"
}


// ============================================================
// EDGE CASE: PROTECTED ZONE DETECTION
// Skip code blocks, URLs, quoted text, numbers/stats
// ============================================================

/**
 * Extracts protected zones that should NOT be modified.
 * Returns { cleaned, zones } where cleaned has placeholders
 * and zones stores the originals for reinsertion.
 */
function extractProtectedZones(text) {
  const zones = []
  let cleaned = text

  // Pattern order matters — longest/most specific first
  const patterns = [
    // Code blocks (``` ... ```)
    /```[\s\S]*?```/g,
    // Inline code (` ... `)
    /`[^`]+`/g,
    // HTML code tags
    /<code>[\s\S]*?<\/code>/gi,
    // URLs
    /https?:\/\/[^\s)>\]]+/g,
    // Quoted text (double quotes, multi-word only)
    /"[^"]{4,}"/g,
    // Quoted text (single quotes, multi-word only)
    /'[^']{4,}'/g,
    // Numbers with units/percentages/currency
    /[$€£¥]?\d[\d,.]*\s*(%|percent|million|billion|thousand|kg|lb|km|mi|mph|°[CF])?/gi,
  ]

  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, (match) => {
      const placeholder = `⟦PROTECTED_${zones.length}⟧`
      zones.push(match)
      return placeholder
    })
  })

  return { cleaned, zones }
}

/**
 * Re-inserts protected zones back into processed text.
 */
function restoreProtectedZones(text, zones) {
  let result = text
  zones.forEach((original, i) => {
    result = result.replace(`⟦PROTECTED_${i}⟧`, original)
  })
  return result
}


// ============================================================
// STEP 1: VOCABULARY REPLACEMENT
// ============================================================

function applyVocabReplacements(text) {
  let result = text

  // Sort by length descending so longer phrases replace first
  const sorted = Object.entries(VOCAB_REPLACEMENTS)
    .sort((a, b) => b[0].length - a[0].length)

  sorted.forEach(([find, replace]) => {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')

    result = result.replace(regex, (match) => {
      if (replace === '') return ''
      // Preserve capitalization of first character
      if (match[0] === match[0].toUpperCase() && replace.length > 0) {
        return replace.charAt(0).toUpperCase() + replace.slice(1)
      }
      return replace
    })
  })

  // Clean up artifacts from deletions
  result = result.replace(/\s{2,}/g, ' ')
  result = result.replace(/\.\s*\./g, '.')
  result = result.replace(/,\s*\./g, '.')
  result = result.replace(/,\s*,/g, ',')
  result = result.replace(/^\s+/gm, '')

  return result
}


// ============================================================
// STEP 2: CONTRACTION INJECTOR
// ============================================================

function injectContractions(text, style) {
  // Academics don't always contract — skip for academic style
  if (style === 'Academic') return text

  let result = text

  const pairs = [
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bdid not\b/gi, "didn't"],
    [/\bwill not\b/gi, "won't"],
    [/\bwould not\b/gi, "wouldn't"],
    [/\bcould not\b/gi, "couldn't"],
    [/\bshould not\b/gi, "shouldn't"],
    [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"],
    [/\bwas not\b/gi, "wasn't"],
    [/\bwere not\b/gi, "weren't"],
    [/\bhave not\b/gi, "haven't"],
    [/\bhas not\b/gi, "hasn't"],
    [/\bhad not\b/gi, "hadn't"],
    [/\bit is\b/gi, "it's"],
    [/\bthat is\b/gi, "that's"],
    [/\bthere is\b/gi, "there's"],
    [/\bthey are\b/gi, "they're"],
    [/\bwe are\b/gi, "we're"],
    [/\byou are\b/gi, "you're"],
    [/\bi am\b/gi, "I'm"],
    [/\bi will\b/gi, "I'll"],
    [/\bi would\b/gi, "I'd"],
    [/\bi have\b/gi, "I've"],
    [/\blet us\b/gi, "let's"],
    [/\bwho is\b/gi, "who's"],
    [/\bwhat is\b/gi, "what's"],
    [/\bwhere is\b/gi, "where's"],
    [/\bhow is\b/gi, "how's"],
  ]

  pairs.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, (match) => {
      // Preserve leading capitalization
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1)
      }
      return replacement
    })
  })

  return result
}


// ============================================================
// STEP 3: SENTENCE LENGTH VARIATOR (Medium + Hard)
// ============================================================

function varySentenceLengths(sentences, difficulty) {
  if (difficulty === 'Easy') return sentences

  const result = [...sentences]

  for (let i = 0; i < result.length - 1; i++) {
    const curr = result[i].trim().split(/\s+/).length
    const next = result[i + 1] ? result[i + 1].trim().split(/\s+/).length : 0

    // If two consecutive sentences are similar length and long, split one
    if (Math.abs(curr - next) < 5 && curr > 15) {
      const splitPatterns = [
        /,\s*(but|and|so|yet|while|although|because|since)\s/i,
        /;\s*/,
        /,\s*which\s/i,
        /,\s*where\s/i
      ]

      for (const pattern of splitPatterns) {
        const match = result[i].match(pattern)
        if (match) {
          const idx = result[i].indexOf(match[0])
          if (idx > 8 && idx < result[i].length - 8) {
            const part1 = result[i].substring(0, idx).trim() + '.'
            const conjunction = match[1]
              ? match[1].charAt(0).toUpperCase() + match[1].slice(1)
              : ''
            let part2 = result[i].substring(idx + match[0].length).trim()
            part2 = conjunction
              ? conjunction + ' ' + part2
              : part2.charAt(0).toUpperCase() + part2.slice(1)
            result.splice(i, 1, part1, part2)
            break
          }
        }
      }
    }

    // Merge very short consecutive sentences (<7 words each)
    if (curr < 7 && next < 7 && next > 0 && i + 1 < result.length && Math.random() > 0.5) {
      const merged = result[i].replace(/[.!?]+$/, '') +
        ' — ' +
        result[i + 1].trim().charAt(0).toLowerCase() +
        result[i + 1].trim().slice(1)
      result.splice(i, 2, merged)
    }
  }

  return result
}


// ============================================================
// STEP 4: HUMAN QUIRK INJECTOR (Hard only)
// ============================================================

const QUIRKS = {
  fragments: [
    "Simple as that.",
    "Not ideal.",
    "Worth considering.",
    "Big difference.",
    "Exactly.",
    "Fair enough.",
    "No question.",
    "Not even close.",
    "A real shift.",
    "That matters."
  ],
  rhetoricalQuestions: [
    "Why does this matter?",
    "So what's the takeaway?",
    "Makes sense, right?",
    "Sound familiar?",
    "But does it actually work that way?",
    "What does this mean in practice?"
  ],
  informalBridges: [
    "Here's the thing —",
    "The short answer:",
    "Put simply:",
    "To be clear:",
    "Bottom line:",
    "The reality is,"
  ]
}

function injectHumanQuirks(sentences, style) {
  const result = [...sentences]

  // 1. Inject a fragment every ~200 words
  let wordCount = 0
  const fragmentInserts = []
  result.forEach((sentence, i) => {
    wordCount += sentence.split(/\s+/).length
    if (wordCount >= 200 && i < result.length - 1) {
      wordCount = 0
      fragmentInserts.push(i + 1)
    }
  })

  // Insert fragments (reverse order so indices don't shift)
  fragmentInserts.reverse().forEach(idx => {
    const fragment = QUIRKS.fragments[Math.floor(Math.random() * QUIRKS.fragments.length)]
    result.splice(idx, 0, ' ' + fragment)
  })

  // 2. Add a rhetorical question near the midpoint
  if (result.length > 4) {
    const midPoint = Math.floor(result.length * (0.4 + Math.random() * 0.2))
    const question = QUIRKS.rhetoricalQuestions[Math.floor(Math.random() * QUIRKS.rhetoricalQuestions.length)]
    result.splice(midPoint, 0, ' ' + question)
  }

  // 3. Replace one bland opener with an informal bridge (not for academic)
  if (style !== 'Academic' && result.length > 3) {
    const targetIdx = Math.floor(result.length * (0.3 + Math.random() * 0.4))
    if (result[targetIdx]) {
      const bridge = QUIRKS.informalBridges[Math.floor(Math.random() * QUIRKS.informalBridges.length)]
      const sentence = result[targetIdx].trim()
      result[targetIdx] = ' ' + bridge + ' ' +
        sentence.charAt(0).toLowerCase() + sentence.slice(1)
    }
  }

  // 4. Casual mode extra: downgrade formal words
  if (style === 'Casual') {
    for (let i = 0; i < result.length; i++) {
      result[i] = result[i]
        .replace(/\bsignificant\b/gi, 'big')
        .replace(/\bnumerous\b/gi, 'a bunch of')
        .replace(/\bapproximately\b/gi, 'about')
        .replace(/\bdemonstrate\b/gi, 'show')
        .replace(/\bdemonstrates\b/gi, 'shows')
        .replace(/\bpurchase\b/gi, 'buy')
        .replace(/\bpossess\b/gi, 'have')
        .replace(/\bobtain\b/gi, 'get')
        .replace(/\brequire\b/gi, 'need')
        .replace(/\bconstitute\b/gi, 'make up')
        .replace(/\bvery important\b/gi, 'really important')
    }
  }

  return result
}


// ============================================================
// PARAGRAPH SYMMETRY BREAKER (Medium + Hard)
// ============================================================

function breakParagraphSymmetry(paragraphs) {
  if (paragraphs.length <= 2) return paragraphs

  const result = []

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim()
    if (!p) continue

    const sentences = p.match(/[^.!?]+[.!?]+/g) || [p]

    // Split large paragraphs (6+ sentences)
    if (sentences.length > 5 && Math.random() > 0.5) {
      const splitPoint = Math.floor(sentences.length * (0.3 + Math.random() * 0.4))
      result.push(sentences.slice(0, splitPoint).join(' '))
      result.push(sentences.slice(splitPoint).join(' '))
    }
    // Merge tiny paragraphs (≤2 sentences) with next
    else if (sentences.length <= 2 && i + 1 < paragraphs.length &&
             paragraphs[i + 1].trim().length > 0 && Math.random() > 0.5) {
      result.push(p + ' ' + paragraphs[i + 1].trim())
      i++ // skip next
    } else {
      result.push(p)
    }
  }

  return result
}


// ============================================================
// TEXT CHUNKER — handle >2500 words
// ============================================================

function chunkText(text, maxWords = 2500) {
  const totalWords = text.split(/\s+/).length
  if (totalWords <= maxWords) return [text]

  const chunks = []
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = []
  let currentCount = 0

  paragraphs.forEach(para => {
    const paraWords = para.split(/\s+/).length
    if (currentCount + paraWords > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'))
      currentChunk = [para]
      currentCount = paraWords
    } else {
      currentChunk.push(para)
      currentCount += paraWords
    }
  })

  if (currentChunk.length > 0) chunks.push(currentChunk.join('\n\n'))
  return chunks
}


// ============================================================
// FINAL CLEANUP
// ============================================================

function cleanupText(text) {
  return text
    // Fix double/triple spaces
    .replace(/\s{2,}/g, ' ')
    // Fix space before punctuation
    .replace(/\s+([.!?,;:])/g, '$1')
    // Fix missing space after punctuation
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    // Fix double periods
    .replace(/\.{2,}/g, '.')
    // Fix orphaned commas
    .replace(/, ,/g, ',')
    // Capitalize after sentence enders
    .replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => {
      return punct + ' ' + letter.toUpperCase()
    })
    // Capitalize paragraph starts
    .replace(/(^|\n\n)(\s*)([a-z])/g, (_, prefix, space, letter) => {
      return prefix + space + letter.toUpperCase()
    })
    // Fix triple+ newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


// ============================================================
// MASTER HUMANIZER FUNCTION
// ============================================================

/**
 * @param {string} text — Input text to humanize
 * @param {string} style — 'Academic' | 'Professional' | 'Casual'
 * @param {string} difficulty — 'Easy' | 'Medium' | 'Hard'
 * @returns {{ result: string, note?: string, warning?: string }}
 */
export function runHumanizer(text, style = 'Professional', difficulty = 'Medium') {
  // ── EDGE CASE 1: Empty input ──
  if (!text || text.trim().length === 0) {
    return { result: '', warning: 'No text provided.' }
  }

  const totalWords = text.trim().split(/\s+/).length

  // ── EDGE CASE 2: Too short ──
  if (totalWords < 20) {
    return {
      result: text,
      warning: 'Text is under 20 words — too short for effective humanization.'
    }
  }

  // ── EDGE CASE 3: Already human — run quick detection ──
  const quickDetect = runDetection(text)
  if (quickDetect.score < 15) {
    return {
      result: text,
      note: 'This text already reads as human-written (AI score: ' + quickDetect.score + '%). No changes needed.'
    }
  }

  // ── EDGE CASE 10: Chunk if over 2500 words ──
  const chunks = chunkText(text, 2500)
  const processedChunks = chunks.map(chunk => processChunk(chunk, style, difficulty))

  return {
    result: processedChunks.join('\n\n'),
    note: quickDetect.score > 70
      ? 'Original AI score: ' + quickDetect.score + '%. Heavy rewriting applied.'
      : undefined
  }
}

/**
 * Process a single chunk of text (≤2500 words)
 */
function processChunk(text, style, difficulty) {
  // ── Extract protected zones (code, URLs, quotes, numbers) ──
  const { cleaned, zones } = extractProtectedZones(text)

  let processed = cleaned

  // ── STEP 1: Vocabulary replacement (all difficulties) ──
  processed = applyVocabReplacements(processed)

  // ── STEP 2: Contractions (all except Academic at Easy) ──
  if (!(style === 'Academic' && difficulty === 'Easy')) {
    processed = injectContractions(processed, style)
  }

  // ── STEP 3: Sentence length variation (Medium + Hard) ──
  if (difficulty === 'Medium' || difficulty === 'Hard') {
    let sentences = processed.match(/[^.!?]+[.!?]+/g) || [processed]
    sentences = varySentenceLengths(sentences, difficulty)
    processed = sentences.join(' ')

    // Break paragraph symmetry
    const paragraphs = processed.split(/\n\n+/).filter(p => p.trim().length > 0)
    if (paragraphs.length > 2) {
      const rebalanced = breakParagraphSymmetry(paragraphs)
      processed = rebalanced.join('\n\n')
    }
  }

  // ── STEP 4: Human quirks (Hard only) ──
  if (difficulty === 'Hard') {
    let sentences = processed.match(/[^.!?]+[.!?]+/g) || [processed]
    sentences = injectHumanQuirks(sentences, style)
    processed = sentences.join(' ')
  }

  // ── STEP 5: Final cleanup ──
  processed = cleanupText(processed)

  // ── Re-insert protected zones ──
  processed = restoreProtectedZones(processed, zones)

  return processed
}
