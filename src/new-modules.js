// ==========================================
// DETECTION MODULES
// ==========================================

export function m26_questions(p) {
  const qs = (p.text.match(/\?/g) || []).length;
  const ratio = p.wc > 0 ? qs / (p.wc / 100) : 0;
  let score = 0;
  if (p.wc >= 50) {
    if (ratio === 0) score = 0.15;
    else if (ratio < 1) score = 0.08;
  }
  return { score, flagged: [], detail: `${qs} questions` };
}

export function m27_acronyms(p) {
  const spelled = ["artificial intelligence", "machine learning", "application programming interface", "large language model", "natural language processing"];
  let hits = 0;
  const flagged = [];
  spelled.forEach(ph => {
    let i = p.lc.indexOf(ph);
    while (i !== -1) {
      hits++;
      flagged.push({ text: p.text.substring(i, i + ph.length), idx: i, type: 'formal', reason: `Spelled out acronym: "${ph}"` });
      i = p.lc.indexOf(ph, i + 1);
    }
  });
  return { score: Math.min(hits * 0.05, 1.0), flagged, detail: `${hits} spelled out acronyms` };
}

export function m28_numbers(p) {
  const nums = /\b(fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gi;
  const m = p.text.match(nums) || [];
  const flagged = m.map(text => ({ text, type: 'formal', reason: 'Written number' }));
  return { score: Math.min(m.length * 0.04, 1.0), flagged, detail: `${m.length} written numbers` };
}

export function m29_parentheticals(p) {
  if (p.wc < 200) return { score: 0, flagged: [], detail: 'Too short' };
  const pCount = (p.text.match(/\([^)]{5,60}\)/g) || []).length;
  return { score: pCount === 0 ? 0.15 : 0, flagged: [], detail: `${pCount} parentheticals` };
}

export function m30_overattribution(p) {
  const att = ["according to experts", "research shows", "studies suggest", "experts believe", "it has been found"];
  let hits = 0;
  const flagged = [];
  att.forEach(ph => {
    let i = p.lc.indexOf(ph);
    while (i !== -1) {
      hits++;
      flagged.push({ text: p.text.substring(i, i + ph.length), idx: i, type: 'transition', reason: `Attribution: "${ph}"` });
      i = p.lc.indexOf(ph, i + 1);
    }
  });
  return { score: Math.min(hits * 0.06, 1.0), flagged, detail: `${hits} over-attributions` };
}

export function m31_subjectrepetition(p) {
  if (p.sc < 3) return { score: 0, flagged: [], detail: 'Too few sentences' };
  let clusters = 0;
  const flagged = [];
  for (let i = 0; i < p.sc - 2; i++) {
    const w1 = p.sentWords[i]?.[0], w2 = p.sentWords[i+1]?.[0], w3 = p.sentWords[i+2]?.[0];
    if (w1 && w2 && w3 && w1.length > 3 && w1 === w2 && w2 === w3) {
      clusters++;
      flagged.push({ text: p.sentences[i], type: 'rhythm', reason: `Repeated subject: "${w1}"` });
    }
  }
  return { score: Math.min(clusters * 0.08, 1.0), flagged, detail: `${clusters} subject repetitions` };
}

export function m32_conjunctions(p) {
  if (p.sc < 5) return { score: 0, flagged: [], detail: 'Too few sentences' };
  let count = 0;
  p.sentences.forEach(s => {
    const w = s.trim().split(/\s+/)[0]?.toLowerCase();
    if (['and', 'but', 'so', 'yet', 'or'].includes(w)) count++;
  });
  const ratio = count / p.sc;
  let score = 0;
  if (ratio < 0.02) score = 0.15;
  else if (ratio < 0.05) score = 0.08;
  return { score, flagged: [], detail: `${count}/${p.sc} start with conjunction` };
}

export function m33_allcaps(p) {
  if (p.wc < 150) return { score: 0, flagged: [], detail: 'Too short' };
  const caps = (p.text.match(/\b[A-Z]{2,}\b/g) || []).length;
  return { score: caps === 0 ? 0.08 : 0, flagged: [], detail: `${caps} ALL CAPS words` };
}

export function m34_hyphens(p) {
  if (p.wc < 200) return { score: 0, flagged: [], detail: 'Too short' };
  const h = (p.text.match(/\b[a-z]+-[a-z]+\b/gi) || []).length;
  return { score: h === 0 ? 0.06 : 0, flagged: [], detail: `${h} hyphenated words` };
}

// ==========================================
// HUMANIZATION MODULES
// ==========================================

export function h_opinion(text, intensity) {
  if (intensity === 0) return text;
  const markers = ["I think", "I feel like", "in my opinion", "personally"];
  const rate = 0.04 * intensity;
  let sents = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  sents = sents.map(s => {
    if (Math.random() < rate) {
      const t = s.trim();
      return t.length > 0 ? ' ' + markers[Math.floor(Math.random() * markers.length)] + ', ' + t[0].toLowerCase() + t.slice(1) : s;
    }
    return s;
  });
  return sents.join('');
}

const NUM_MAP = {
  "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
  "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19",
  "twenty": "20", "twenty-one": "21", "twenty-two": "22", "twenty-three": "23", "twenty-four": "24", "twenty-five": "25", "twenty-six": "26", "twenty-seven": "27", "twenty-eight": "28", "twenty-nine": "29",
  "thirty": "30", "thirty-one": "31", "thirty-two": "32", "thirty-five": "35",
  "forty": "40", "forty-one": "41", "forty-two": "42", "forty-five": "45", "forty-seven": "47",
  "fifty": "50", "sixty": "60", "seventy": "70", "eighty": "80", "ninety": "90", "one hundred": "100"
};

export function h_numbers(text, intensity) {
  if (Math.random() > intensity) return text;
  let r = text;
  Object.keys(NUM_MAP).sort((a, b) => b.length - a.length).forEach(k => {
    r = r.replace(new RegExp(`\\b${k}\\b`, 'gi'), NUM_MAP[k]);
  });
  return r;
}

export function h_subjectrepetition(text, intensity) {
  if (intensity === 0) return text;
  let sents = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  for (let i = 0; i < sents.length - 1; i++) {
    const w1 = sents[i].trim().split(/\s+/);
    const w2 = sents[i+1].trim().split(/\s+/);
    if (w1.length > 1 && w2.length > 1 && w1[0].toLowerCase() === w2[0].toLowerCase() && w1[0].length > 3) {
      if (Math.random() < intensity) {
        const subs = ['it', 'they', 'this', 'these'];
        w2[0] = subs[Math.floor(Math.random() * subs.length)];
        sents[i+1] = ' ' + w2.join(' ');
      }
    }
  }
  return sents.join('');
}

export function h_parentheticals(text, intensity) {
  if (intensity === 0) return text;
  const asides = ["(at least in my experience)", "(surprisingly)", "(which makes sense)", "(worth noting)", "(not always obvious)", "(this matters more than people think)", "(took me a while to get this)"];
  let wc = 0;
  let sents = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  for (let i = 0; i < sents.length; i++) {
    wc += sents[i].split(/\s+/).length;
    if (wc >= 300) {
      if (Math.random() < intensity) {
        const words = sents[i].trim().split(' ');
        const pos = Math.floor(words.length * 0.7);
        words.splice(pos, 0, asides[Math.floor(Math.random() * asides.length)]);
        sents[i] = ' ' + words.join(' ');
      }
      wc = 0;
    }
  }
  return sents.join('');
}

export function h_conjunctions(text, intensity) {
  if (intensity === 0) return text;
  const trans = /^(Furthermore|Moreover|Additionally|However|Therefore|Thus|Hence|Consequently|Nevertheless|Also),\s/i;
  const rate = 0.05 * intensity;
  let sents = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  sents = sents.map(s => {
    const t = s.trim();
    if (trans.test(t) && Math.random() < rate) {
      const conjs = ['And', 'But', 'So'];
      return ' ' + conjs[Math.floor(Math.random() * conjs.length)] + ' ' + t.replace(trans, '');
    }
    return s;
  });
  return sents.join('');
}
