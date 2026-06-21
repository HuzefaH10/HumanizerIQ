// HumanizerIQ — 20-Transform Humanizer Engine
import{CONTRACTION_PAIRS,VOCAB_REPLACEMENTS,VOCAB_ACADEMIC,VOCAB_CASUAL,IDIOMS,UNNATURAL_COLLOCATIONS,FUNCTION_WORDS}from'./engine-data'
import{runDetection}from'./detector'
import{CognitiveEngine}from'./cognitive-engine'

function escRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function pick(arr, docState){
  if(!docState || !docState.usedPhrases) return arr[Math.floor(Math.random()*arr.length)]
  const available = arr.filter(x => {
    const val = Array.isArray(x) ? x[0] : x;
    return !docState.usedPhrases.has(val);
  })
  if(available.length === 0) return arr[Math.floor(Math.random()*arr.length)]
  const choice = available[Math.floor(Math.random()*available.length)]
  docState.usedPhrases.add(Array.isArray(choice) ? choice[0] : choice)
  return choice
}
function chance(pct){return Math.random()<pct}
function countWords(text){return text.trim().split(/\s+/).filter(w=>w.length>0).length}

// ── Protected Zones (code, URLs, quotes, numbers) ──
function extractProtected(text){
  const zones=[];let c=text
  const rx=/```[\s\S]*?```|`[^`]+`|<code>[\s\S]*?<\/code>|https?:\/\/[^\s)>\]]+|[$€£¥]?\d[\d,.]*\s*(?:%|percent|million|billion|thousand)?/gi
  c=c.replace(rx,m=>{const ph=`⟦P${zones.length}⟧`;zones.push(m);return ph})
  return{cleaned:c,zones}
}
function restoreProtected(text,zones){let r=text;zones.forEach((o,i)=>{r=r.replace(new RegExp(`⟦P${i}⟧`,'gi'),o)});return r}

// ── T1: Vocabulary Replacement (style-aware) ──
function t1_vocab(text,style){
  const baseMap=style==='Academic'?{...VOCAB_REPLACEMENTS,...VOCAB_ACADEMIC}:style==='Casual'?{...VOCAB_REPLACEMENTS,...VOCAB_CASUAL}:VOCAB_REPLACEMENTS
  let r=text;const sorted=Object.entries(baseMap).sort((a,b)=>b[0].length-a[0].length)
  sorted.forEach(([from,to])=>{const rx=new RegExp(`\\b${escRx(from)}\\b`,'gi')
    r=r.replace(rx,m=>{if(to==='')return'';if(m[0]===m[0].toUpperCase()&&to.length>0)return to[0].toUpperCase()+to.slice(1);return to})})
  return r.replace(/\s{2,}/g,' ').replace(/\.\s*\./g,'.').replace(/,\s*,/g,',')
}

// ── T2: Contraction Injection (easy+) ──
function t2_contractions(text,style){
  if(style==='Academic')return text;let r=text
  CONTRACTION_PAIRS.forEach(({e,c})=>{const rx=new RegExp(`\\b${e}\\b`,'gi')
    r=r.replace(rx,m=>{if(m[0]===m[0].toUpperCase())return c[0].toUpperCase()+c.slice(1);return c})})
  return r
}

// ── T3: Transition Softening (all) ──
const TRANSITION_MAP={"consequently, it is evident that":"So it pretty much comes down to","therefore, it can be concluded":"So basically","furthermore, it should be noted":"Also worth mentioning","it is imperative to":"You really need to","one must consider":"Think about","it is necessary to":"You need to","it can be observed that":"You can see that","it is evident that":"Clearly","it is apparent that":"Clearly","it stands to reason that":"It makes sense that","this suggests that":"This means","this indicates that":"This shows","this demonstrates that":"This shows","consequently":"So","furthermore":"Also","moreover":"And","additionally":"Also","nevertheless":"Still","nonetheless":"Even so","notwithstanding":"Despite that","in conclusion":"So","to summarize":"In short","in summary":"Basically","subsequently":"Then","accordingly":"So","hence":"So","thus":"So","therefore":"So","indeed":"Really","certainly":"Sure","undoubtedly":"No doubt","firstly":"First","secondly":"Second","thirdly":"Third","lastly":"Last","ultimately":"In the end"}
function t3_transitions(text){
  let r=text;const sorted=Object.entries(TRANSITION_MAP).sort((a,b)=>b[0].length-a[0].length)
  sorted.forEach(([from,to])=>{const rx=new RegExp(`(^|(?<=[.!?]\\s))${escRx(from)}\\b[,]?\\s*`,'gim')
    r=r.replace(rx,(m,pre)=>pre+to+' ')})
  return r
}

function t4_sentencevar(sentences, isHard){
  const r=[...sentences]
  for(let i=0;i<r.length-1;i++){
    const cw=countWords(r[i]),nw=r[i+1]?countWords(r[i+1]):0
    if(Math.abs(cw-nw)<5&&cw>15){
      const pts=[/,\s*(but|and|so|yet|while|although|because|since)\s/i,/;\s*/,/,\s*which\s/i]
      for(const p of pts){const m=r[i].match(p)
        if(m){const idx=r[i].indexOf(m[0]);if(idx>8&&idx<r[i].length-8){
          if(m[0].includes(';') && isHard && chance(0.5)){
            const p1=r[i].substring(0,idx).trim()+' — ';let p2=r[i].substring(idx+m[0].length).trim()
            p2=(p2[0]||'').toLowerCase()+p2.slice(1)
            r.splice(i,1,p1+p2)
          }else{
            const p1=r[i].substring(0,idx).trim()+'.';let p2=r[i].substring(idx+m[0].length).trim()
            const conj=m[1]?m[1][0].toUpperCase()+m[1].slice(1)+' ':''
            p2=conj+(p2[0]||'').toUpperCase()+p2.slice(1)
            r.splice(i,1,p1,p2)
          }
          break}}}}
    if(isHard && cw<7&&nw<7&&nw>0&&chance(0.4)){
      const merged=r[i].replace(/[.!?]+$/,'')+', and '+r[i+1].trim()[0].toLowerCase()+r[i+1].trim().slice(1)
      r.splice(i,2,merged)}}
  return r
}

// ── Unified Quirks: Fragments, Pragmatic, Cognitive, Memory, Digressions, Idioms ──
const FRAGS=["Simple as that.","Not ideal.","Worth considering.","Big difference.","Exactly.","Fair enough.","No question.","Not even close.","A real shift.","That matters.","Key point.","Think about it."]
const PRAG_INSERTS=["Anyway,","Honestly,","By the way,","You know,","That said,","Come to think of it,","Look,","Mind you,","Granted,","Admittedly,","The thing is,","Here's the deal,"]
const COG_TRANSITIONS=["That got me thinking...","What's interesting here is","The odd part is","At first this seems","Here's where it gets interesting:","Which brings up another point:","Now here's the thing:","This is where it gets tricky:"]
const MEM_ANCHORS=["in one project I worked on,","I remember running into this,","a weird thing I noticed was","the first time I tried this,","if I remember correctly,","roughly speaking,","something along those lines,","from what I've seen,","in my experience,","now that I think about it,"]
const DIGRESSIONS=["One unexpected side effect of this was how it changed the whole approach.","I once ran into a case where this backfired completely.","An odd exception to this rule popped up in practice.","Side note, this almost never works the way textbooks describe it.","There's a funny story here but I'll save it for another time."]
const CONTEXT_IDIOMS=["at the end of the day","to put it bluntly","in a nutshell","when push comes to shove","for what it's worth","the bottom line is","all things considered","no two ways about it"]

function t_quirks(sentences, style, isHard, docState){
  const r=[...sentences]
  const totalWordCount=countWords(r.join(' '))
  const isAcademic=style==='Academic',isProfessional=style==='Professional',isCasual=style==='Casual'
  let cogWc=0,pragWc=0,fragWc=0

  for(let i=1;i<r.length;i++){
    const sw=countWords(r[i])
    cogWc+=sw;pragWc+=sw;fragWc+=sw

    // Cognitive transitions: 1 per 300w (Professional/Casual medium+), 1 per doc max
    if(cogWc>=300 && !docState.cogUsed && !isAcademic){
      const s=r[i].trim();r[i]=' '+pick(COG_TRANSITIONS, docState)+' '+s[0].toLowerCase()+s.slice(1)
      docState.cogUsed=true;cogWc=0;continue
    }

    // Pragmatic markers: per 250w (Professional=mild subset, Casual=full list)
    if(pragWc>=250 && !isAcademic){
      const pool=isProfessional?["That said,","Honestly,","Admittedly,"]:PRAG_INSERTS
      if(chance(0.4)){
        const s=r[i].trim();r[i]=' '+pick(pool, docState)+' '+s[0].toLowerCase()+s.slice(1);pragWc=0;continue
      }
    }

    // Fragments: never Academic, Professional/Casual hard only
    // Unthrottled in hard mode — insert every 150w instead of once per doc
    if(isHard && !isAcademic && fragWc>=150){
      if(chance(0.5)){r.splice(i+1,0,' '+pick(FRAGS, docState));fragWc=0;i++;continue}
    } else if(isHard && !isAcademic && fragWc>=400 && totalWordCount>=400 && !docState.fragUsed){
      if(chance(0.5)){r.splice(i+1,0,' '+pick(FRAGS, docState));docState.fragUsed=true;fragWc=0;i++;continue}
    }

    // Casual Hard: memory anchors per 300w
    if(isHard && isCasual && cogWc>=250 && chance(0.2)){
      const s=r[i].trim();r[i]=' '+pick(MEM_ANCHORS, docState)+' '+s[0].toLowerCase()+s.slice(1);continue
    }

    // Casual Hard: micro-digressions
    if(isHard && isCasual && chance(0.02) && countWords(r[i])>10){
      r.splice(i+1,0,' '+pick(DIGRESSIONS, docState));i++;continue
    }

    // Context idioms (Professional/Casual medium+)
    if(!isAcademic && pragWc>=300 && chance(0.15)){
      const s=r[i].trim();r[i]=' '+pick(CONTEXT_IDIOMS, docState)+', '+s[0].toLowerCase()+s.slice(1);pragWc=0
    }
  }
  return r
}

// ── T6: Dysfluency Injection (medium+) ──
const DYSFLUENCIES=["actually","I mean","well","to be fair","sort of","pretty much","kind of","or something like that","in a way","more or less"]
function t6_dysfluency(sentences, docState){
  const r=[...sentences];const rate=0.02
  r.forEach((_,i)=>{if(chance(rate)&&countWords(r[i])>6){
    const d=pick(DYSFLUENCIES, docState);const words=r[i].trim().split(/\s+/)
    const pos=Math.floor(words.length*0.3)+1;words.splice(pos,0,d)
    r[i]=' '+words.join(' ')}})
  return r
}

// ── T11: Incomplete Enumeration (hard) ──
function t11_enumeration(text){
  return text.replace(/(\b\w+(?:,\s*\w+){3,})\b/g,(match)=>{
    if(!chance(0.3))return match
    const items=match.split(/,\s*/);if(items.length<4)return match
    return items.slice(0,3).join(', ')+', and a few others'})
}

// ── T12: Uneven Certainty (hard) ──
const HEDGES=["I think","probably","seems like","not 100% sure but","from what I can tell","as far as I know","if I'm not mistaken","arguably"]
function t12_uncertainty(sentences, docState){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.15)&&countWords(r[i])>8){
    const s=r[i].trim();r[i]=' '+pick(HEDGES, docState)+' '+s[0].toLowerCase()+s.slice(1)}})
  return r
}

// ── T13: Collocation Normalization (all) ──
function t13_collocations(text){
  let r=text;Object.entries(UNNATURAL_COLLOCATIONS).sort((a,b)=>b[0].length-a[0].length).forEach(([from,to])=>{
    const rx=new RegExp(`\\b${escRx(from)}\\b`,'gi')
    r=r.replace(rx,m=>{if(m[0]===m[0].toUpperCase())return to[0].toUpperCase()+to.slice(1);return to})})
  return r
}

// ── T15: Temporal Grounding (medium+) ──
const TIME_ANCHORS=["earlier","recently","at the time","a while back","not long after","at that point","since then","around that time"]
function t15_temporal(sentences, docState){
  const r=[...sentences];let wc=0
  for(let i=1;i<r.length;i++){wc+=countWords(r[i])
    if(wc>=150){
      if(chance(0.5)){
        const t=pick(TIME_ANCHORS, docState);const s=r[i].trim()
        r[i]=' '+t[0].toUpperCase()+t.slice(1)+', '+s[0].toLowerCase()+s.slice(1)
      }
      wc=0
    }
  }
  return r
}

// ── T16: Redundancy Weaving (hard) ──
const EMPHASIS_PAIRS=[["big","massive"],["clear","obvious"],["fast","quick"],["slow","gradual"],["hard","difficult"],["easy","straightforward"],["new","fresh"],["old","dated"],["simple","basic"],["complex","layered"]]
function t16_redundancy(sentences, docState){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.03)){const pair=pick(EMPHASIS_PAIRS, docState)
    const rx=new RegExp(`\\b${pair[0]}\\b`,'i')
    if(rx.test(r[i]))r[i]=r[i].replace(rx,`${pair[0]}, ${pair[1]}`)}})
  return r
}

// ── T17: Rhyme/Assonance Disruption (medium+) ──
const SUFFIX_SWAPS={"-tion":"process","-ing":"work","-ness":"quality","-ment":"effort","-ity":"character","-ence":"aspect","-ance":"factor","-ly":"well","-ful":"rich","-ous":"notable"}
function t17_rhymedisrupt(sentences){
  const r=[...sentences]
  for(let i=2;i<r.length;i++){
    const endings=[r[i-2],r[i-1],r[i]].map(s=>{const w=s.trim().split(/\s+/);return(w[w.length-1]||'').replace(/[.!?,;:]+$/,'')})
    const suffixes=endings.map(w=>{for(const s of Object.keys(SUFFIX_SWAPS))if(w.endsWith(s.slice(1)))return s;return null})
    if(suffixes[0]&&suffixes[0]===suffixes[1]&&suffixes[1]===suffixes[2]){
      const words=r[i].trim().split(/\s+/);const last=words[words.length-1].replace(/[.!?,;:]+$/,'')
      const punct=(words[words.length-1].match(/[.!?,;:]+$/)||[''])[0]
      for(const[suf,rep]of Object.entries(SUFFIX_SWAPS)){if(last.endsWith(suf.slice(1))){words[words.length-1]=rep+punct;break}}
      r[i]=' '+words.join(' ')}}
  return r
}

// ── T18: Asymmetric Detail Distribution (hard) ──
const ELABORATIONS=["This is particularly true when you look at the broader picture.","The implications here are worth spending a moment on.","It's one of those things that doesn't get enough attention.","This point deserves a bit more unpacking."]
function t18_asymmetric(paragraphs, docState){
  if(paragraphs.length<4)return paragraphs
  const r=[...paragraphs]
  // Expand ~20%
  const expandCount=Math.max(1,Math.floor(r.length*0.2))
  for(let n=0;n<expandCount;n++){const i=Math.floor(Math.random()*r.length)
    r[i]=r[i]+' '+pick(ELABORATIONS, docState)}
  // Compress ~20% (remove last sentence)
  const compressCount=Math.max(1,Math.floor(r.length*0.2))
  for(let n=0;n<compressCount;n++){const i=Math.floor(Math.random()*r.length)
    const sents=r[i].match(/[^.!?]+[.!?]+|[^.!?]+$/g);if(sents&&sents.length>2)r[i]=sents.slice(0,-1).join(' ')}
  return r
}

// ── T19: Oxford Comma Inconsistency (hard) ──
function t19_oxfordcomma(text){
  return text.replace(/,\s*and\s+(\w+)([.!?])/gi,(m,last,punct)=>{
    if(chance(0.25))return' and '+last+punct;return m})
}

// ── T20: Em Dash Spacing Variation (hard) ──
function t20_emdash(text){
  return text.replace(/\s*—\s*/g,()=>chance(0.5)?' — ':'—')
}

// ── T21: Structural Skeleton Breaker (medium+) ──
const SKELETON_FLIPS = [
  // Active → Passive restructure
  {
    pattern: /^([a-zA-Z\s]+?)\s+(?:must|should|can)\s+(?:([a-zA-Z]+ly)\s+)?([a-zA-Z]+)\s+(.+?)\.$/i,
    transform: (s, subject, adv, verb, object) => {
      const a = adv ? adv.toLowerCase() + ' ' : '';
      let v = verb.toLowerCase();
      if (v.endsWith('e') && !v.endsWith('ee')) v = v.slice(0, -1);
      const ingPhrase = `${a}${v}ing ${object}`;
      return `${ingPhrase.charAt(0).toUpperCase() + ingPhrase.slice(1)} is something ${subject.toLowerCase()} really need${subject.endsWith('s') ? '' : 's'} to prioritize.`
    }
  },
  // Statement → Question → Answer
  {
    pattern: /^([^,]+?)\s+is\s+(?:crucial|important|essential|critical)\s+(?:for|to)\s+([^,]+?)\.$/i,
    transform: (s, thing, context) =>
      `Why does ${thing.charAt(0).toLowerCase() + thing.slice(1)} matter for ${context}? Honestly, more than most people realize.`
  },
  // Noun-first → Verb-first
  {
    pattern: /^(The\s+\w+(?:\s+\w+)?)\s+(enables?|allows?|helps?)\s+(.+)\.$/i,
    transform: (s, noun, verb, rest) =>
      `What ${noun} actually does is ${verb.replace(/s$/, '')} ${rest} — which matters more than people think.`
  },
  // Long formal → Split informal
  {
    pattern: /^(.{40,}),\s+(?:while|although|whereas)\s+(.{20,})\.$/i,
    transform: (s, part1, part2) =>
      `${part1}. ${part2.charAt(0).toUpperCase() + part2.slice(1)} — those two things don't always go together.`
  },
  // "It is X that Y" → "Y, and that's what makes it X"
  {
    pattern: /^It is (\w+) (?:that|to note that) (.+)\.$/i,
    transform: (s, adj, clause) =>
      `${clause.charAt(0).toUpperCase() + clause.slice(1)}, and that's what makes this ${adj}.`
  },
  // Flip cause-effect order
  {
    pattern: /^(.+)\s+(?:enables?|allows?|helps?)\s+(.+)\s+to\s+(.+)\.$/i,
    transform: (s, cause, subject, effect) =>
      `${subject.charAt(0).toUpperCase() + subject.slice(1)} can ${effect} — that's the whole point of ${cause}.`
  },
  // Convert list sentence to flowing prose
  {
    pattern: /^(.+),\s+(.+),\s+and\s+(.+)\.$/i,
    transform: (s, a, b, c) =>
      `${a}. ${b.charAt(0).toUpperCase() + b.slice(1)} too. ${c.charAt(0).toUpperCase() + c.slice(1)} as well, though that one gets less attention.`
  },
  // Nominalization → verb-centric
  {
    pattern: /\bthe (\w+tion|\w+ment|\w+ance|\w+ence)\s+of\b/gi,
    isInline: true,
    transform: (match, noun) => {
      const verbMap = {
        'implementation': 'implementing', 'integration': 'integrating',
        'adoption': 'adopting', 'consideration': 'considering',
        'development': 'developing', 'management': 'managing',
        'enhancement': 'enhancing', 'improvement': 'improving',
        'utilization': 'using', 'optimization': 'optimizing',
        'evaluation': 'evaluating', 'transformation': 'transforming',
        'establishment': 'establishing', 'advancement': 'advancing',
        'engagement': 'engaging', 'maintenance': 'maintaining',
        'achievement': 'achieving', 'assessment': 'assessing',
        'alignment': 'aligning', 'deployment': 'deploying'
      }
      return verbMap[noun.toLowerCase()] ? `actually ${verbMap[noun.toLowerCase()]}` : match
    }
  }
]

function t21_skeletonBreaker(sentences, difficulty) {
  if (difficulty === 'Easy') return sentences
  const flipProb = difficulty === 'Hard' ? 0.35 : 0.2
  return sentences.map(sentence => {
    if (Math.random() > flipProb) return sentence
    // Try inline replacements first (nominalization pattern)
    let modified = sentence
    for (const flip of SKELETON_FLIPS) {
      if (flip.isInline) {
        modified = modified.replace(flip.pattern, flip.transform)
        if (modified !== sentence) return modified
        continue
      }
      const match = sentence.match(flip.pattern)
      if (match) {
        try { return flip.transform(...match) } catch(e) { continue }
      }
    }
    return sentence
  })
}

// ── T22: Semantic Distance Amplifier (all) ──
const SEMANTIC_DISTANCE_MAP = {
  "organizations must leverage technology":
    "technology has become non-negotiable for organizations",
  "enables teams to streamline their workflows":
    "cuts down on the back-and-forth that slows teams down",
  "paramount importance of patient-centered care":
    "keeping patients at the center of everything",
  "the comprehensive implementation":
    "rolling this out properly across the board",
  "comprehensive implementation":
    "a thorough rollout",
  "careful consideration of ethical frameworks":
    "thinking seriously about the ethics involved",
  "robust communication frameworks":
    "solid ways to keep communication from breaking down",
  "enhance the overall quality of life":
    "actually improve how people live day to day",
  "making more informed and accurate decisions":
    "getting the call right more often",
  "unprecedented efficiency":
    "speeds and accuracy we haven't seen before",
  "cutting-edge solutions":
    "tools that are genuinely ahead of where most people are",
  "a comprehensive understanding of":
    "a real grasp on",
  "plays a crucial role in":
    "matters a lot when it comes to",
  "in today's rapidly evolving":
    "with how fast things are changing in",
  "it is important to note that":
    "one thing worth pointing out is that",
  "it is worth noting that":
    "something worth calling out is that",
  "in order to achieve":
    "if the goal is",
  "take into account":
    "factor in",
  "a wide range of":
    "all kinds of",
  "has the potential to":
    "could realistically",
  "on the other hand":
    "then again",
  "as a result of this":
    "because of that",
  "in the context of":
    "when you think about",
  "it is essential to":
    "you really need to",
  "significant impact on":
    "real effect on",
  "the vast majority of":
    "most",
  "at the end of the day":
    "when it all comes together",
  "drive meaningful change":
    "actually move the needle",
  "foster a culture of":
    "build a real habit of",
  "navigate the complexities of":
    "deal with the messiness of",
  "remains a significant challenge":
    "is still genuinely hard",
  "harness the power of":
    "put to good use",
  "a holistic approach to":
    "looking at the full picture of"
}

function t22_semanticDistance(text) {
  let result = text
  const sorted = Object.entries(SEMANTIC_DISTANCE_MAP).sort((a,b) => b[0].length - a[0].length)
  sorted.forEach(([original, replacement]) => {
    const pattern = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    result = result.replace(pattern, (m) => {
      if (Math.random() < 0.7) {
        // Preserve original capitalization
        if (m[0] === m[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1)
        return replacement
      }
      return m
    })
  })
  return result
}

// ── T23: Paragraph Reordering (hard) ──
function t23_paragraphReorder(paragraphs) {
  if (paragraphs.length < 3) return paragraphs
  // Never reorder first or last paragraph — too disorienting
  const middle = paragraphs.slice(1, -1)
  for (let i = middle.length - 1; i > 0; i--) {
    if (Math.random() < 0.4) {
      const j = Math.floor(Math.random() * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]]
    }
  }
  return [paragraphs[0], ...middle, paragraphs[paragraphs.length - 1]]
}

// ── T24: Length Divergence (medium+) ──
const LENGTH_EXPANSIONS = [
  ' That part is worth sitting with for a second.',
  ' Most people overlook this.',
  ' It sounds simple but it rarely is in practice.',
  ' This is where it gets interesting.',
  ' That alone changes the picture quite a bit.',
  ' And that matters more than it might seem.',
  ' Worth flagging that one separately.'
]

function t24_lengthDivergence(sentences, inputWordCount, docState) {
  const outputWordCount = sentences.join(' ').split(/\s+/).length
  const similarity = outputWordCount / inputWordCount

  // If output is within 10% of input length — force expansion or compression
  if (similarity > 0.9 && similarity < 1.1) {
    if (Math.random() < 0.5) {
      // Expand: add elaboration to ~2 sentences
      return sentences.map((s, i) => {
        if (i % 4 === 1 && s.length > 40) {
          return s.replace(/\.$/, pick(LENGTH_EXPANSIONS, docState))
        }
        return s
      })
    } else {
      // Compress: drop the longest sentence (50% chance to keep)
      const longest = sentences.reduce((max, s) =>
        s.length > max.length ? s : max, '')
      return sentences.filter(s => s !== longest || Math.random() > 0.5)
    }
  }

  return sentences
}

// ── T25: Clause Inversion Engine (medium+) ──
const CLAUSE_INVERSIONS = [
  // "While X, Y" → "Y, though X is also true"
  [/^While (.+?),\s+(.+)\.$/i,
   (m, x, y) => `${y.charAt(0).toUpperCase() + y.slice(1)}, though ${x} is also worth keeping in mind.`],

  // "Although X, Y" → "Y — even though X"
  [/^Although (.+?),\s+(.+)\.$/i,
   (m, x, y) => `${y.charAt(0).toUpperCase() + y.slice(1)} — even though ${x}.`],

  // "X, which Y" → "X. That Y."
  [/^(.+),\s+which\s+(.+)\.$/i,
   (m, x, y) => `${x}. That ${y}.`],

  // "In order to X, Y must Z" → "Y needs to Z if the goal is to X"
  [/^In order to (.+?),\s+(.+?)\s+must\s+(.+)\.$/i,
   (m, goal, subject, action) => `${subject.charAt(0).toUpperCase() + subject.slice(1)} needs to ${action} if the goal is to ${goal}.`],

  // "X enables Y to Z" → "Z becomes possible when X is in place"
  [/^(.+?)\s+enables?\s+(.+?)\s+to\s+(.+)\.$/i,
   (m, enabler, subject, action) => `${action.charAt(0).toUpperCase() + action.slice(1)} becomes a lot more realistic when ${enabler} is actually working.`]
]

function t25_clauseInversion(sentences, difficulty) {
  if (difficulty === 'Easy') return sentences
  const probability = difficulty === 'Hard' ? 0.3 : 0.15
  return sentences.map(sentence => {
    if (Math.random() > probability) return sentence
    for (const [pattern, transform] of CLAUSE_INVERSIONS) {
      const match = sentence.match(pattern)
      if (match) return transform(...match)
    }
    return sentence
  })
}

// ── Cleanup ──
function cleanup(text){
  let result = text.replace(/\s{2,}/g,' ').replace(/\s+([.!?,;:])/g,'$1')
  
  // Fix stacked transitions or broken comma phrases
  result = result.replace(/\b(And|But|So|Also|Plus),\s+(and|but|so|also|plus)\b/gi, '$1')
  result = result.replace(/\b([Aa]nd|[Bb]ut|[Ss]o)\s*,\s+/g, '$1 ')
  result = result.replace(/,\s*,/g, ',')
  
  // Clean up double spaces that might have been introduced
  result = result.replace(/\s{2,}/g,' ')
  
  // Replace smart quotes if any were broken
  result = result.replace(/[""]/g,'"')

  result = result.replace(/([.!?])([A-Z])/g,'$1 $2').replace(/\.{2,}/g,'.').replace(/,\s*,/g,',')
    .replace(/([.!?])\s+([a-z])/g,(_,p,l)=>p+' '+l.toUpperCase())
    .replace(/(^|\n\n)(\s*)([a-z])/g,(_,pr,sp,l)=>pr+sp+l.toUpperCase())
    .replace(/\n{3,}/g,'\n\n').trim()
  result = result.replace(/([.!?])\s*,/g, '$1').replace(/,\s*\./g, '.').replace(/\.+/g, '.').replace(/\ba ([aeiouAEIOU])/g, 'an $1')
  // Dedup adjacent and nearby injections
  const markers = ["As it turns out", "Roughly speaking", "For anyone unfamiliar", "Here's what got me", "Surprisingly enough", "If I remember correctly", "Worth keeping in mind", "Anyway", "Plus,", "Also,"];
  const mStr = markers.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const collisionRx = new RegExp(`(?:${mStr})[,.\\-—]*\\s+((?:\\S+\\s+){0,15}?)(?=${mStr})`, 'gi');
  let prevR;
  do {
    prevR = result;
    result = result.replace(collisionRx, '$1');
  } while (result !== prevR);
  // Restore paragraph breaks every 4-5 sentences to prevent wall-of-text
  let sentenceCount = 0
  result = result.replace(/(\. )(?=[A-Z])/g, (m) => { sentenceCount++; return sentenceCount % 5 === 0 ? '.\n\n' : m })
  return result
}

// ── Chunker ──
function chunkText(text,max=2500){
  const total=countWords(text);if(total<=max)return[text]
  const paras=text.split(/\n\n+/);const chunks=[];let cur=[],count=0
  paras.forEach(p=>{const len=countWords(p)
    if(count+len>max&&cur.length){chunks.push(cur.join('\n\n'));cur=[p];count=len}
    else{cur.push(p);count+=len}})
  if(cur.length)chunks.push(cur.join('\n\n'));return chunks
}

// ── MASTER HUMANIZER ──
export function runHumanizer(text,style='Professional',difficulty='Medium'){
  if(!text||text.trim().length===0)return{result:'',warning:'No text provided.'}
  
  let cleanedText = text;
  if(cleanedText.includes('"')){
    cleanedText = cleanedText.substring(cleanedText.indexOf('"'));
  }

  const wc=countWords(cleanedText)
  if(wc<20)return{result:cleanedText,warning:'Text is under 20 words — too short for effective humanization.'}

  const det=runDetection(cleanedText)
  if(det.score<15)return{result:cleanedText,note:`This text already reads as human-written (AI score: ${det.score}%). No changes needed.`}

  const docState = { fragUsed: false, cogUsed: false, usedPhrases: new Set() };

  const chunks=chunkText(cleanedText)
  const processed=chunks.map(chunk=>processChunk(chunk,style,difficulty,docState))
  return{result:processed.join('\n\n'),note:det.score>70?`Original AI score: ${det.score}%. Heavy rewriting applied.`:undefined}
}

function processChunk(text,style,difficulty,docState){
  const isEasy=difficulty==='Easy',isMedium=difficulty==='Medium',isHard=difficulty==='Hard'
  const isAcademic=style==='Academic',isProfessional=style==='Professional',isCasual=style==='Casual'
  const{cleaned,zones}=extractProtected(text)
  let r=cleaned

  // ── ALL COMBOS: Semantic distance amplification (runs first to catch original AI phrasing) ──
  r=t22_semanticDistance(r)

  // ── ALL COMBOS: Vocab replacement (style-aware) ──
  r=t1_vocab(r,style)
  // ── ALL COMBOS: Collocation normalization ──
  r=t13_collocations(r)

  // ── EASY: Hedging removal (Professional/Casual strip entirely, Academic naturalizes via vocab map) ──
  // Already handled by style-aware t1_vocab above

  // ── EASY+: Transition softening (NOT Academic Easy) ──
  if(!isAcademic || !isEasy) r=t3_transitions(r)

  // ── EASY+: Contractions (never Academic) ──
  if(!isAcademic) r=t2_contractions(r,style)

  // ── CASUAL EASY+: Pragmatic markers at Easy level ──
  if(isCasual && isEasy){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
    let wc=0
    for(let i=1;i<sents.length;i++){
      wc+=countWords(sents[i])
      if(wc>=250 && chance(0.3)){
        const s=sents[i].trim();sents[i]=' '+pick(PRAG_INSERTS, docState)+' '+s[0].toLowerCase()+s.slice(1);wc=0
      }
    }
    r=sents.join(' ')
  }

  // ── MEDIUM + HARD ──
  if(isMedium||isHard){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]

    // Structural skeleton breaking (all styles medium+)
    sents=t21_skeletonBreaker(sents, difficulty)

    // Clause inversion (all styles medium+)
    sents=t25_clauseInversion(sents, difficulty)

    // Sentence length variation (all styles)
    sents=t4_sentencevar(sents, isHard)

    // Rhyme disruption (all styles)
    sents=t17_rhymedisrupt(sents)

    // Style-specific quirks for medium
    if(isAcademic){
      // Academic Medium: formal transitions only, no pragmatic/cognitive/fragments
      // (transitions already softened formally via t3)
    } else if(isProfessional){
      // Professional Medium: 1 cognitive per 300w, mild pragmatic per 250w, no fragments/opinion
      sents=t_quirks(sents,style,isHard,docState)
    } else if(isCasual){
      // Casual Medium: sentence splits + rhetorical Qs + opinion markers + pragmatic
      sents=t_quirks(sents,style,isHard,docState)
      // Dysfluency for casual
      sents=t6_dysfluency(sents, docState)
    }

    // Professional medium also gets mild dysfluency
    if(isProfessional && isMedium) sents=t6_dysfluency(sents, docState)

    // Temporal grounding (not Academic)
    if(!isAcademic) sents=t15_temporal(sents, docState)

    // Length divergence (force output word count away from input)
    sents=t24_lengthDivergence(sents, countWords(text), docState)

    r=sents.join(' ')

    // Paragraph rebalancing (all styles medium+)
    const paras=r.split(/\n\n+/).filter(p=>p.trim().length>0)
    if(paras.length>2){const rebal=[];for(let i=0;i<paras.length;i++){const p=paras[i].trim();if(!p)continue
      const ps=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[p]
      if(ps.length>5&&chance(0.5)){const sp=Math.floor(ps.length*(0.3+Math.random()*0.4));rebal.push(ps.slice(0,sp).join(' '));rebal.push(ps.slice(sp).join(' '))}
      else if(ps.length<=2&&i+1<paras.length&&chance(0.5)){rebal.push(p+' '+paras[i+1].trim());i++}
      else rebal.push(p)}
      r=rebal.join('\n\n')}
  }

  // ── HARD ONLY: Complete structural rebuild ──
  if(isHard){

    // ── H1: Aggressive Sentence Splitting ──
    // Split any sentence >25 words at conjunction/comma points
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
    const splitResult=[]
    for(const s of sents){
      const wc=countWords(s)
      if(wc>25){
        // Find split points: commas before conjunctions, semicolons
        const splitPts=[
          /,\s*(and|but|so|yet|because|since|although|whereas|however)\s/i,
          /;\s*/
        ]
        let didSplit=false
        for(const p of splitPts){
          const m=s.match(p)
          if(m){
            const idx=s.indexOf(m[0])
            if(idx>15&&idx<s.length-15){
              let p1=s.substring(0,idx).trim()
              if(!/[.!?]$/.test(p1))p1+='.'
              let p2=s.substring(idx+m[0].length).trim()
              const conj=m[1]&&m[1].length>0?m[1][0].toUpperCase()+m[1].slice(1)+' ':''
              p2=conj+(p2[0]||'').toUpperCase()+p2.slice(1)
              splitResult.push(p1,p2)
              didSplit=true;break
            }
          }
        }
        if(!didSplit)splitResult.push(s)
      } else if(wc<7&&splitResult.length>0&&countWords(splitResult[splitResult.length-1])<8&&chance(0.35)){
        // Merge two consecutive short sentences
        const prev=splitResult.pop().replace(/[.!?]+$/,'').trim()
        splitResult.push(prev+' — '+s.trim()[0].toLowerCase()+s.trim().slice(1))
      } else {
        splitResult.push(s)
      }
    }
    sents=splitResult

    // ── H2: Burstiness Injection ──
    // Insert a short reaction sentence (4-7 words) every 3-4 sentences
    const BURST_REACTIONS=[
      'That changes the whole picture.',
      'And that matters.',
      'Not a small thing.',
      'This is the part people miss.',
      'Which is harder than it sounds.',
      'That alone is significant.',
      'Hard to overstate that.',
      'The data backs this up.',
      'Nobody talks about this enough.',
      'Easy to overlook that.',
      'Worth repeating.',
      'Big difference in practice.',
      'That last part is key.',
      'Not as obvious as it seems.',
      'Real implications there.'
    ]
    const burstResult=[]
    let sinceBurst=0
    for(let i=0;i<sents.length;i++){
      burstResult.push(sents[i])
      sinceBurst++
      const burstInterval=3+Math.floor(Math.random()*2) // every 3-4 sentences
      if(sinceBurst>=burstInterval&&countWords(sents[i])>8&&i<sents.length-1){
        burstResult.push(' '+pick(BURST_REACTIONS, docState))
        sinceBurst=0
      }
    }
    sents=burstResult

    // ── H3: AI Transition Word Stripping ──
    // Aggressively remove or replace dead-giveaway AI transitions
    const AI_STRIP_MAP={
      'Furthermore, ':['Also, ','Plus, ','And ',''],
      'Additionally, ':['Also, ','And ','On top of that, ',''],
      'Moreover, ':['And ','Plus, ',''],
      'Consequently, ':['So ','Because of that, ',''],
      'Subsequently, ':['Then ','After that, ',''],
      'Notably, ':['','One thing — ',''],
      'Significantly, ':['','The big thing is ',''],
      'Importantly, ':['','Here\'s what matters — ',''],
      'It is worth noting that ':['','Worth pointing out: ',''],
      'It is crucial to ':['You need to ','The key thing is to ',''],
      'It is important to ':['You need to ','','What matters is to ',''],
      'It is essential to ':['You really need to ','',''],
      'It should be noted that ':['','Thing is, ',''],
      'In light of this, ':['Given that, ','So ',''],
      'In this regard, ':['Here, ','On that, ',''],
      'To that end, ':['So ','For that reason, ',''],
      'In essence, ':['Basically, ','Really, ',''],
      'By the same token, ':['Similarly, ','Same idea — ',''],
    }
    sents=sents.map(s=>{
      let result=s
      for(const[aiPhrase,replacements]of Object.entries(AI_STRIP_MAP)){
        const rx=new RegExp(escRx(aiPhrase),'gi')
        result=result.replace(rx,()=>{
          const rep=replacements[Math.floor(Math.random()*replacements.length)]
          return rep
        })
      }
      return result
    })

    // ── H4: Sentence Opening Variation ──
    // Break the "Subject + verb" pattern that AI repeats
    const OPENER_FLIPS=[
      // Prepend a short clause
      s => { const w=s.trim().split(/\s+/); return 'Looking at it closely, '+w[0].toLowerCase()+' '+w.slice(1).join(' ') },
      s => { const w=s.trim().split(/\s+/); return 'In practice, '+w[0].toLowerCase()+' '+w.slice(1).join(' ') },
      s => { const w=s.trim().split(/\s+/); return 'Realistically, '+w[0].toLowerCase()+' '+w.slice(1).join(' ') },
      s => { const w=s.trim().split(/\s+/); return 'From a practical standpoint, '+w[0].toLowerCase()+' '+w.slice(1).join(' ') },
      // Fragment then continue
      s => { const w=s.trim().split(/\s+/); if(w.length<6) return s; return 'Here\'s the thing. '+s.trim() },
    ]
    let lastFlipped=-3
    sents=sents.map((s,i)=>{
      const wc=countWords(s)
      // Only flip sentences that start with a common subject pattern
      if(wc>10&&i-lastFlipped>=3&&/^\s*(The|This|That|These|Those|It|They|We|He|She|A)\s/i.test(s)&&chance(0.35)){
        lastFlipped=i
        const flip=OPENER_FLIPS[Math.floor(Math.random()*OPENER_FLIPS.length)]
        return flip(s)
      }
      return s
    })

    // ── H5: Per-Paragraph Informality Markers ──
    // Even in Academic mode on Hard, inject one opinion-sounding phrase per paragraph
    const INFORMALITY_MARKERS=[
      ' — and that matters more than people realize.',
      ' — which is harder than it sounds.',
      ', and most people underestimate how much that changes things.',
      '. That part rarely gets the attention it deserves.',
      ' — no small thing, by the way.',
      ', which makes a bigger difference than you\'d expect.',
      '. The practical side of this is often ignored.',
    ]

    // Academic Hard: mild hedges + parentheticals
    if(isAcademic){
      const ACAD_HEDGES=['this may suggest','it appears that','one could argue','this seems to indicate','it is plausible that']
      sents.forEach((_,i)=>{if(chance(0.10)&&countWords(sents[i])>8){
        const s=sents[i].trim();sents[i]=' '+pick(ACAD_HEDGES, docState)+' '+s[0].toLowerCase()+s.slice(1)}})
    }

    // Professional Hard: uncertainty modeling
    if(isProfessional){
      sents=t12_uncertainty(sents, docState)
    }

    // Casual Hard: full uncertainty + memory anchors
    if(isCasual){
      sents=t12_uncertainty(sents, docState)
    }

    r=sents.join(' ')

    // Incomplete enumeration (Professional + Casual only)
    if(!isAcademic) r=t11_enumeration(r)

    // Apply per-paragraph informality markers
    const informalParas=r.split(/\n\n+/).filter(p=>p.trim().length>0)
    const markedParas=informalParas.map((para,pi)=>{
      if(pi===0) return para // skip first paragraph
      const paraSents=para.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[para]
      if(paraSents.length<2) return para
      // Pick a random sentence in this paragraph (not first) to append marker
      const targetIdx=1+Math.floor(Math.random()*(paraSents.length-1))
      if(chance(0.5)&&countWords(paraSents[targetIdx])>8){
        paraSents[targetIdx]=paraSents[targetIdx].replace(/\.$/,pick(INFORMALITY_MARKERS, docState))
      }
      return paraSents.join(' ')
    })

    // Asymmetric detail distribution + paragraph reorder
    const reordered=t23_paragraphReorder(t18_asymmetric(markedParas, docState))
    r=reordered.join('\n\n')

    // Oxford comma inconsistency (Professional + Casual)
    if(!isAcademic) r=t19_oxfordcomma(r)

    // Em dash spacing (Professional + Casual)
    if(!isAcademic) r=t20_emdash(r)

    // Academic Hard: parentheticals (1 per 400w)
    if(isAcademic){
      const ACAD_ASIDES=['(though this warrants further study)','(a point often overlooked)','(which merits consideration)','(notably)','(as one might expect)']
      let sents2=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
      let awc=0;let asideUsed=false
      for(let i=0;i<sents2.length;i++){
        awc+=countWords(sents2[i])
        if(awc>=400&&!asideUsed&&chance(0.6)){
          const words=sents2[i].trim().split(' ')
          const pos=Math.floor(words.length*0.7)
          words.splice(pos,0,pick(ACAD_ASIDES, docState))
          sents2[i]=' '+words.join(' ');awc=0;asideUsed=true
        }
      }
      r=sents2.join(' ')
    }

    // Force contractions even in Academic Hard
    if(isAcademic){
      const ACAD_CONTRACTIONS=[['it is','it\'s'],['that is','that\'s'],['there is','there\'s'],['what is','what\'s'],['does not','doesn\'t'],['do not','don\'t'],['is not','isn\'t']]
      ACAD_CONTRACTIONS.forEach(([exp,cont])=>{
        if(chance(0.4)){
          const rx=new RegExp('\\b'+escRx(exp)+'\\b','gi')
          r=r.replace(rx,m=>m[0]===m[0].toUpperCase()?cont[0].toUpperCase()+cont.slice(1):cont)
        }
      })
    }
  }

  // ── Cognitive simulation layer (runs after all transforms) ──
  const cog=new CognitiveEngine({
    style:style.toLowerCase(),
    difficulty:difficulty.toLowerCase(),
    affectiveState:style==='Casual'?'reflective':'neutral',
    cognitiveLoad:difficulty==='Hard'?0.8:difficulty==='Medium'?0.5:0.2,
    salienceBias:difficulty==='Hard'?0.6:0.3,
    energyDecay:difficulty==='Hard'?0.5:0.2,
    audienceAwareness:style==='Casual'?0.5:style==='Professional'?0.3:0.1,
    experientialDepth:style==='Casual'?0.5:0.2,
    docState:docState
  })
  r=cog.run(r)

  r=cleanup(r)
  r=restoreProtected(r,zones)
  r = r.replace(/(?<=[.!?]\s{1,3})([a-z])/g, c => c.toUpperCase())
  return r
}
