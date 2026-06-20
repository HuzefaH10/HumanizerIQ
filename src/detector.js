// HumanizerIQ — 25-Module Detection Engine
import{AI_VOCAB,AI_PHRASES,TRANSITIONS,CONTRACTION_PAIRS,PASSIVE_RE,HEDGING,FORMAL_MARKERS,INFORMAL_MARKERS,FUNCTION_WORDS,POS_WORDS,NEG_WORDS,REVISION_MARKERS,PRAGMATIC_MARKERS,TEMPORAL_MARKERS,IDIOMS,UNNATURAL_COLLOCATIONS,SYNONYM_CLUSTERS,HIGHLIGHT_COLORS}from'./engine-data'

// ── Preprocessing (shared, computed once) ──
function preprocess(text){
  const sentences=(text.match(/[^.!?]+[.!?]+/g)||[]).map(s=>s.trim()).filter(s=>s.length>0)
  const words=text.toLowerCase().match(/\b[a-z']+\b/g)||[]
  const paragraphs=text.split(/\n\n+/).filter(p=>p.trim().length>0)
  const lc=text.toLowerCase()
  const sentWords=sentences.map(s=>(s.match(/\b[a-z']+\b/gi)||[]))
  const sentLens=sentWords.map(w=>w.length)
  return{text,sentences,words,paragraphs,lc,sentWords,sentLens,wc:words.length,sc:sentences.length}
}
function clamp(v,lo=0,hi=1){return Math.max(lo,Math.min(hi,v))}
function escRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

// ── MODULE 1: AI Vocabulary Fingerprint ──
function m1_vocab(p){
  const flagged=[];let raw=0
  AI_VOCAB.forEach(w=>{const rx=new RegExp(`\\b${escRx(w)}\\b`,'gi');[...p.text.matchAll(rx)].forEach(m=>{raw+=2;flagged.push({text:m[0],idx:m.index,type:'vocab',reason:`AI word: "${w}"`})})})
  AI_PHRASES.forEach(ph=>{let i=p.lc.indexOf(ph);while(i!==-1){raw+=3;flagged.push({text:p.text.substring(i,i+ph.length),idx:i,type:'vocab',reason:`AI phrase: "${ph}"`});i=p.lc.indexOf(ph,i+1)}})
  return{score:clamp(p.wc>0?raw/(p.wc*0.15):0),flagged,detail:`${flagged.length} AI vocab hits`}
}

// ── MODULE 2: Transition Overuse ──
function m2_transitions(p){
  let count=0;const flagged=[]
  p.sentences.forEach(s=>{const l=s.toLowerCase().trim();for(const cat in TRANSITIONS){TRANSITIONS[cat].forEach(t=>{if(l.startsWith(t)||l.includes(`, ${t}`)){count++;flagged.push({text:s,type:'transition',reason:`Transition: "${t}"`})}})}})
  const ratio=p.sc>0?count/p.sc:0
  return{score:clamp(ratio>0.15?ratio*0.8:ratio*0.4),flagged,detail:`${count}/${p.sc} sentences start with transitions`}
}

// ── MODULE 3: Sentence Length Uniformity ──
function m3_rhythm(p){
  if(p.sc<3)return{score:0,flagged:[],detail:'Too few sentences'}
  const L=p.sentLens,mean=L.reduce((a,b)=>a+b,0)/L.length
  const std=Math.sqrt(L.reduce((a,v)=>a+Math.pow(v-mean,2),0)/L.length)
  const clusters=[];let cur=[0]
  for(let i=1;i<L.length;i++){if(Math.abs(L[i]-L[i-1])<=4)cur.push(i);else{if(cur.length>=3)clusters.push([...cur]);cur=[i]}}
  if(cur.length>=3)clusters.push(cur)
  const flagged=[];clusters.forEach(c=>c.forEach(i=>flagged.push({text:p.sentences[i],type:'rhythm',reason:`Uniform length cluster (σ=${std.toFixed(1)})`})))
  const s1=std<5?0.6:std<8?0.3:0,s2=clusters.length*0.16
  return{score:clamp(s1+s2),flagged,detail:`σ=${std.toFixed(1)}, ${clusters.length} clusters`}
}

// ── MODULE 4: Contraction Absence ──
function m4_contractions(p){
  let missed=0;const flagged=[]
  CONTRACTION_PAIRS.forEach(({e,c})=>{const rx=new RegExp(`\\b${e}\\b`,'gi');[...p.text.matchAll(rx)].forEach(m=>{missed++;flagged.push({text:m[0],idx:m.index,type:'formal',reason:`"${e}" → "${c}"`})})})
  return{score:clamp(missed*0.08),flagged,detail:`${missed} missed contractions`}
}

// ── MODULE 5: Passive Voice Clustering ──
function m5_passive(p){
  let pc=0;const flagged=[]
  p.sentences.forEach(s=>{let hit=false;PASSIVE_RE.forEach(rx=>{rx.lastIndex=0;if(rx.test(s))hit=true});if(hit){pc++;flagged.push({text:s,type:'formal',reason:'Passive voice'})}})
  const ratio=p.sc>0?pc/p.sc:0
  return{score:clamp(ratio>0.25?(ratio-0.25)*1.2:0),flagged,detail:`${pc}/${p.sc} passive sentences`}
}

// ── MODULE 6: Paragraph Symmetry ──
function m6_parasym(p){
  if(p.paragraphs.length<3)return{score:0,flagged:[],detail:'<3 paragraphs'}
  const lens=p.paragraphs.map(x=>x.split(/\s+/).length),mean=lens.reduce((a,b)=>a+b,0)/lens.length
  const std=Math.sqrt(lens.reduce((a,v)=>a+Math.pow(v-mean,2),0)/lens.length)
  return{score:p.paragraphs.length>3&&std<20?0.3:0,flagged:[],detail:`Para σ=${std.toFixed(1)}`}
}

// ── MODULE 7: Hedging Phrases ──
function m7_hedging(p){
  const flagged=[]
  HEDGING.forEach(ph=>{let i=p.lc.indexOf(ph);while(i!==-1){flagged.push({text:p.text.substring(i,i+ph.length),idx:i,type:'transition',reason:`Hedging: "${ph}"`});i=p.lc.indexOf(ph,i+1)}})
  return{score:clamp(flagged.length*0.08),flagged,detail:`${flagged.length} hedging phrases`}
}

// ── MODULE 8: Punctuation Patterns ──
function m8_punctuation(p){
  const em=(p.text.match(/—/g)||[]).length,semi=(p.text.match(/;/g)||[]).length
  const emR=p.wc>0?em/(p.wc/100):0;let s=0;const flagged=[]
  if(emR>1.5){s+=0.2;let i=p.text.indexOf('—');while(i!==-1){flagged.push({text:p.text.substring(Math.max(0,i-15),Math.min(p.text.length,i+15)),idx:i,type:'vocab',reason:'Em dash overuse'});i=p.text.indexOf('—',i+1)}}
  if(p.sc>0&&semi/p.sc>0.2)s+=0.16
  if(!/  /.test(p.text)&&p.wc>100)s+=0.05
  return{score:clamp(s),flagged,detail:`${em} em dashes, ${semi} semicolons`}
}

// ── MODULE 9: Repetitive Openers ──
function m9_openers(p){
  const ops=p.sentences.map(s=>s.trim().split(/\s+/).slice(0,2).join(' ').toLowerCase())
  const counts={};ops.forEach(o=>{counts[o]=(counts[o]||0)+1})
  let s=0;const flagged=[]
  Object.entries(counts).forEach(([op,c])=>{if(c>=3){s+=c*0.06;p.sentences.forEach(sent=>{if(sent.trim().toLowerCase().startsWith(op))flagged.push({text:sent,type:'rhythm',reason:`Opener "${op}" ×${c}`})})}})
  return{score:clamp(s),flagged,detail:`${Object.keys(counts).filter(k=>counts[k]>=3).length} repeated openers`}
}

// ── MODULE 10: Formality Consistency ──
function m10_formality(p){
  let fc=0,ic=0
  FORMAL_MARKERS.forEach(m=>{if(p.lc.includes(m))fc++})
  INFORMAL_MARKERS.forEach(m=>{if(p.lc.includes(m))ic++})
  const pure=fc>3&&ic===0
  return{score:pure?0.24:0,flagged:[],detail:pure?'Zero register variation':'Normal variation'}
}

// ── MODULE 11: Information Density Oscillation ──
function m11_infodensity(p){
  if(p.sc<4)return{score:0,flagged:[],detail:'Too few sentences'}
  const densities=p.sentWords.map(ws=>{let content=0;ws.forEach(w=>{if(!FUNCTION_WORDS.has(w.toLowerCase()))content++});return ws.length>0?content/ws.length:0})
  const mean=densities.reduce((a,b)=>a+b,0)/densities.length
  const variance=densities.reduce((a,v)=>a+Math.pow(v-mean,2),0)/densities.length
  return{score:clamp(Math.max(0,(0.3-variance)*0.8)),flagged:[],detail:`Density variance: ${variance.toFixed(3)}`}
}

// ── MODULE 12: Semantic Progression Predictability ──
function m12_semantic(p){
  if(p.sc<5)return{score:0,flagged:[],detail:'Too few sentences'}
  const sets=p.sentWords.map(ws=>new Set(ws.map(w=>w.toLowerCase()).filter(w=>!FUNCTION_WORDS.has(w)&&w.length>2)))
  let totalSim=0,comparisons=0
  for(let i=0;i<sets.length-1;i++){for(let d=1;d<=Math.min(3,sets.length-1-i);d++){const a=sets[i],b=sets[i+d];if(a.size&&b.size){const inter=new Set([...a].filter(x=>b.has(x)));const union=new Set([...a,...b]);totalSim+=inter.size/union.size;comparisons++}}}
  const avg=comparisons>0?totalSim/comparisons:0
  return{score:clamp(avg>0.4?(avg-0.4)*1.0:0),flagged:[],detail:`Avg Jaccard: ${avg.toFixed(3)}`}
}

// ── MODULE 13: Local Redundancy Echoes ──
function m13_redundancy(p){
  if(p.sc<5)return{score:0,flagged:[],detail:'Too few sentences'}
  let echoes=0;const window=5
  for(let i=0;i<p.sc-1;i++){const end=Math.min(i+window,p.sc)
    const baseWords=new Set(p.sentWords[i].map(w=>w.toLowerCase()).filter(w=>!FUNCTION_WORDS.has(w)&&w.length>3))
    for(let j=i+1;j<end;j++){const cmpWords=p.sentWords[j].map(w=>w.toLowerCase()).filter(w=>!FUNCTION_WORDS.has(w)&&w.length>3)
      let clusterOverlap=0;cmpWords.forEach(w=>{if(baseWords.has(w)){clusterOverlap++}else{SYNONYM_CLUSTERS.forEach(cl=>{if(cl.includes(w)&&[...baseWords].some(bw=>cl.includes(bw)))clusterOverlap++})}})
      if(cmpWords.length>0&&clusterOverlap/cmpWords.length>0.5)echoes++}}
  return{score:clamp(echoes*0.04),flagged:[],detail:`${echoes} redundancy echoes`}
}

// ── MODULE 14: Clause Architecture Repetition ──
function m14_clause(p){
  if(p.sc<5)return{score:0,flagged:[],detail:'Too few sentences'}
  const patterns=p.sentences.map(s=>{const t=s.trim();if(/^[^,]+,\s*(but|and|so|yet|while|although)\s/i.test(t))return'A'
    if(/[:;]/.test(t))return'B';if(/\b(because|since|as)\s/i.test(t))return'C';return'X'})
  const counts={};patterns.forEach(pa=>{if(pa!=='X')counts[pa]=(counts[pa]||0)+1})
  const maxRatio=p.sc>0?Math.max(...Object.values(counts).concat(0))/p.sc:0
  return{score:clamp(maxRatio>0.4?(maxRatio-0.4)*0.6:0),flagged:[],detail:`Max clause pattern: ${(maxRatio*100).toFixed(0)}%`}
}

// ── MODULE 15: Function Word Entropy ──
function m15_entropy(p){
  if(p.wc<50)return{score:0,flagged:[],detail:'Too short'}
  const fw=["the","and","but","if","because","while","however","although","that","which"]
  const counts={};let total=0
  fw.forEach(w=>{const c=(p.lc.match(new RegExp(`\\b${w}\\b`,'g'))||[]).length;counts[w]=c;total+=c})
  if(total===0)return{score:0.2,flagged:[],detail:'No function words'}
  let H=0;fw.forEach(w=>{const pr=counts[w]/total;if(pr>0)H-=pr*Math.log2(pr)})
  return{score:clamp(Math.abs(H-3.0)*0.4),flagged:[],detail:`Entropy: ${H.toFixed(2)} (baseline ~3.0)`}
}

// ── MODULE 16: Context Window Memory Leak ──
function m16_memoryleak(p){
  if(p.wc<100)return{score:0,flagged:[],detail:'Too short'}
  const trigrams=new Map()
  for(let i=0;i<p.words.length-2;i++){const tri=p.words.slice(i,i+3).join(' ')
    if(!FUNCTION_WORDS.has(p.words[i])&&!FUNCTION_WORDS.has(p.words[i+2])){if(!trigrams.has(tri))trigrams.set(tri,[]);trigrams.get(tri).push(i)}}
  let leaks=0;trigrams.forEach((positions)=>{if(positions.length>=2){for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++){if(Math.abs(positions[a]-positions[b])>30)leaks++}}})
  return{score:clamp(leaks*0.1),flagged:[],detail:`${leaks} memory leak echoes`}
}

// ── MODULE 17: Lexical Burstiness ──
function m17_burstiness(p){
  if(p.sc<5)return{score:0,flagged:[],detail:'Too few sentences'}
  const L=p.sentLens,mean=L.reduce((a,b)=>a+b,0)/L.length
  const variance=L.reduce((a,v)=>a+Math.pow(v-mean,2),0)/L.length
  const B=(variance-mean)/(variance+mean+0.001)
  const m4=L.reduce((a,v)=>a+Math.pow(v-mean,4),0)/L.length
  const kurtosis=m4/(Math.pow(variance,2)+0.001)-3
  let s=0;if(B<0.2)s+=0.15;if(kurtosis<1)s+=0.2
  return{score:clamp(s),flagged:[],detail:`Burstiness: ${B.toFixed(2)}, Kurtosis: ${kurtosis.toFixed(2)}`}
}

// ── MODULE 18: Narrative Commitment ──
function m18_narrative(p){
  if(p.wc<100)return{score:0,flagged:[],detail:'Too short'}
  let concrete=0
  const markers=[/\blast (week|month|year|time|night|summer)\b/gi,/\byesterday\b/gi,/\bthis (morning|afternoon|evening)\b/gi,/\bin (19|20)\d{2}\b/g,/\bthat (morning|night|day|afternoon)\b/gi,/\bI remember\b/gi,/\bwe (went|saw|tried|found|built)\b/gi]
  markers.forEach(rx=>{const m=p.text.match(rx);if(m)concrete+=m.length})
  const pnRegex=/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;const pns=p.text.match(pnRegex)||[]
  concrete+=Math.min(pns.length*0.3,5)
  const density=concrete/Math.max(p.wc/100,1)
  return{score:clamp(density<0.5?0.24:0),flagged:[],detail:`Concrete density: ${density.toFixed(2)}/100w`}
}

// ── MODULE 19: Revision Artifact Absence ──
function m19_revision(p){
  if(p.wc<300)return{score:0,flagged:[],detail:'Too short for revision check'}
  let found=0;REVISION_MARKERS.forEach(m=>{if(p.lc.includes(m))found++})
  return{score:found===0?0.2:0,flagged:[],detail:found===0?'No self-correction markers':`${found} revision markers found`}
}

// ── MODULE 20: Emotional Temperature Flatness ──
function m20_emotion(p){
  if(p.sc<5)return{score:0,flagged:[],detail:'Too few sentences'}
  const scores=p.sentWords.map(ws=>{let s=0;ws.forEach(w=>{const l=w.toLowerCase();if(POS_WORDS.has(l))s++;if(NEG_WORDS.has(l))s--});return ws.length>0?s/ws.length:0})
  const mean=scores.reduce((a,b)=>a+b,0)/scores.length
  const variance=scores.reduce((a,v)=>a+Math.pow(v-mean,2),0)/scores.length
  return{score:clamp(variance<0.01?0.3:variance<0.03?0.15:0),flagged:[],detail:`Sentiment variance: ${variance.toFixed(4)}`}
}

// ── MODULE 21: Syntactic Complexity vs Lexical Density ──
function m21_syntactic(p){
  if(p.sc<3)return{score:0,flagged:[],detail:'Too few sentences'}
  let contentCount=0;p.words.forEach(w=>{if(!FUNCTION_WORDS.has(w))contentCount++})
  const ratio=p.wc>0?contentCount/p.wc:0
  const avgLen=p.sentLens.length>0?p.sentLens.reduce((a,b)=>a+b,0)/p.sentLens.length:0
  return{score:ratio>0.65&&avgLen<12?0.4:0,flagged:[],detail:`Content ratio: ${ratio.toFixed(2)}, avg len: ${avgLen.toFixed(1)}`}
}

// ── MODULE 22: Pragmatic Marker Absence ──
function m22_pragmatic(p){
  if(p.wc<200)return{score:0,flagged:[],detail:'Too short'}
  let found=0;PRAGMATIC_MARKERS.forEach(m=>{if(p.lc.includes(m))found++})
  return{score:found===0?0.16:0,flagged:[],detail:found===0?'No discourse markers':`${found} pragmatic markers`}
}

// ── MODULE 23: Idiom Density ──
function m23_idioms(p){
  if(p.wc<400)return{score:0,flagged:[],detail:'Too short for idiom check'}
  let found=0;IDIOMS.forEach(id=>{if(p.lc.includes(id))found++})
  return{score:found===0?0.2:0,flagged:[],detail:found===0?'Zero idioms':`${found} idioms found`}
}

// ── MODULE 24: Temporal Anchoring Absence ──
function m24_temporal(p){
  if(p.wc<200)return{score:0,flagged:[],detail:'Too short'}
  let found=0;TEMPORAL_MARKERS.forEach(m=>{if(p.lc.includes(m))found++})
  return{score:found===0?0.16:0,flagged:[],detail:found===0?'No temporal anchors':`${found} time references`}
}

// ── MODULE 25: Collocation Naturalness ──
function m25_collocations(p){
  const flagged=[];let raw=0
  Object.keys(UNNATURAL_COLLOCATIONS).forEach(uc=>{let i=p.lc.indexOf(uc);while(i!==-1){raw+=3;flagged.push({text:p.text.substring(i,i+uc.length),idx:i,type:'vocab',reason:`Unnatural: "${uc}" → "${UNNATURAL_COLLOCATIONS[uc]}"`});i=p.lc.indexOf(uc,i+1)}})
  return{score:clamp(raw*0.06),flagged,detail:`${flagged.length} unnatural collocations`}
}

// ── SUBSCORE WEIGHTS ──
const WEIGHTS={structuralPredictability:0.18,semanticSmoothness:0.16,informationDensityStability:0.14,syntacticRepetition:0.12,emotionalFlatness:0.10,concreteExperienceScarcity:0.10,lexicalBurstiness:0.10,revisionArtifactAbsence:0.10}

// ── HIGH-CONFIDENCE FLAGGING (3+ signals agree) ──
function flagHighConf(allFlagged,sentences){
  const hc=[];sentences.forEach(s=>{const t=s.trim();const types=new Set()
    allFlagged.forEach(f=>{if(t.includes(f.text)||f.text.includes(t))types.add(f.type)})
    if(types.size>=3)hc.push({text:t,type:'highConfidence',reason:`${types.size} independent AI signals`})})
  return hc
}

// ── MASTER DETECTION ──
export function runDetection(text){
  if(!text||text.trim().length===0)return{score:0,verdict:'No text to analyze',spans:[],summary:{transition_count:0,rhythm_count:0,vocab_count:0,formal_count:0,high_confidence_count:0},subscores:{}}
  const p=preprocess(text)
  if(p.wc<20)return{score:0,verdict:'Text too short for accurate analysis',spans:[],summary:{transition_count:0,rhythm_count:0,vocab_count:0,formal_count:0,high_confidence_count:0},subscores:{}}

  // Run all 25 modules
  const r={m1:m1_vocab(p),m2:m2_transitions(p),m3:m3_rhythm(p),m4:m4_contractions(p),m5:m5_passive(p),m6:m6_parasym(p),m7:m7_hedging(p),m8:m8_punctuation(p),m9:m9_openers(p),m10:m10_formality(p),m11:m11_infodensity(p),m12:m12_semantic(p),m13:m13_redundancy(p),m14:m14_clause(p),m15:m15_entropy(p),m16:m16_memoryleak(p),m17:m17_burstiness(p),m18:m18_narrative(p),m19:m19_revision(p),m20:m20_emotion(p),m21:m21_syntactic(p),m22:m22_pragmatic(p),m23:m23_idioms(p),m24:m24_temporal(p),m25:m25_collocations(p)}

  // Compute 8 subscores
  const sub={
    structuralPredictability:clamp((r.m3.score+r.m6.score+r.m14.score)/3*1.5),
    semanticSmoothness:clamp((r.m12.score+r.m13.score+r.m16.score)/3*1.5),
    informationDensityStability:clamp((r.m11.score+r.m21.score)/2*1.5),
    syntacticRepetition:clamp((r.m9.score+r.m15.score)/2*1.5),
    emotionalFlatness:r.m20.score,
    concreteExperienceScarcity:clamp((r.m18.score+r.m24.score)/2*1.5),
    lexicalBurstiness:r.m17.score,
    revisionArtifactAbsence:clamp((r.m19.score+r.m22.score)/2*1.5)
  }

  // Surface-level signals (vocab, transitions, contractions etc) add bonus
  const surfaceScore=(r.m1.score+r.m2.score+r.m4.score+r.m5.score+r.m7.score+r.m8.score+r.m10.score+r.m23.score+r.m25.score)/9

  // Weighted ensemble
  let ensemble=0
  for(const k in WEIGHTS)ensemble+=sub[k]*WEIGHTS[k]
  // Blend: 60% deep subscores + 40% surface signals
  const blended=ensemble*0.6+surfaceScore*0.4
  const finalScore=Math.min(Math.round(blended*120),100)

  // Verdicts
  let verdict,color
  if(finalScore<20){verdict='Likely Human Written';color='#22c55e'}
  else if(finalScore<40){verdict='Mostly Human with AI Touches';color='#84cc16'}
  else if(finalScore<60){verdict='Mixed — AI Assisted';color='#eab308'}
  else if(finalScore<80){verdict='Likely AI Generated';color='#f97316'}
  else{verdict='Almost Certainly AI Generated';color='#ef4444'}

  // Collect flagged spans
  const allFlagged=[...r.m1.flagged,...r.m2.flagged,...r.m3.flagged,...r.m4.flagged,...r.m5.flagged,...r.m7.flagged,...r.m8.flagged,...r.m9.flagged,...r.m25.flagged]
  const hc=flagHighConf(allFlagged,p.sentences)
  const allSpans=[...hc,...allFlagged]
  // Deduplicate
  const seen=new Set(),spans=[]
  allSpans.forEach(s=>{const k=s.text.trim();if(!seen.has(k)){seen.add(k);spans.push({text:s.text,category:s.type,reason:s.reason})}})

  const summary={
    transition_count:r.m2.flagged.length+r.m7.flagged.length,
    rhythm_count:r.m3.flagged.length+r.m9.flagged.length,
    vocab_count:r.m1.flagged.length+r.m25.flagged.length,
    formal_count:r.m4.flagged.length+r.m5.flagged.length,
    high_confidence_count:hc.length
  }

  return{score:finalScore,verdict,color,spans,summary,subscores:sub}
}
