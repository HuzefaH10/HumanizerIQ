// HumanizerIQ — 20-Transform Humanizer Engine
import{CONTRACTION_PAIRS,VOCAB_REPLACEMENTS,IDIOMS,UNNATURAL_COLLOCATIONS,FUNCTION_WORDS}from'./engine-data'
import{runDetection}from'./detector'

function escRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function chance(pct){return Math.random()<pct}

// ── Protected Zones (code, URLs, quotes, numbers) ──
function extractProtected(text){
  const zones=[];let c=text
  const rx=/```[\s\S]*?```|`[^`]+`|<code>[\s\S]*?<\/code>|https?:\/\/[^\s)>\]]+|"[^"]{4,}"|[$€£¥]?\d[\d,.]*\s*(?:%|percent|million|billion|thousand)?/gi
  c=c.replace(rx,m=>{const ph=`⟦P${zones.length}⟧`;zones.push(m);return ph})
  return{cleaned:c,zones}
}
function restoreProtected(text,zones){let r=text;zones.forEach((o,i)=>{r=r.replace(new RegExp(`⟦P${i}⟧`,'gi'),o)});return r}

// ── T1: Vocabulary Replacement (all) ──
function t1_vocab(text){
  let r=text;const sorted=Object.entries(VOCAB_REPLACEMENTS).sort((a,b)=>b[0].length-a[0].length)
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

// ── T4: Sentence Length Variation (medium+) ──
function t4_sentencevar(sentences){
  const r=[...sentences]
  for(let i=0;i<r.length-1;i++){
    const cw=r[i].trim().split(/\s+/).length,nw=r[i+1]?r[i+1].trim().split(/\s+/).length:0
    if(Math.abs(cw-nw)<5&&cw>15){
      const pts=[/,\s*(but|and|so|yet|while|although|because|since)\s/i,/;\s*/,/,\s*which\s/i]
      for(const p of pts){const m=r[i].match(p)
        if(m){const idx=r[i].indexOf(m[0]);if(idx>8&&idx<r[i].length-8){
          const p1=r[i].substring(0,idx).trim()+'.';let p2=r[i].substring(idx+m[0].length).trim()
          const conj=m[1]?m[1][0].toUpperCase()+m[1].slice(1)+' ':''
          p2=conj+(p2[0]||'').toUpperCase()+p2.slice(1)
          r.splice(i,1,p1,p2);break}}}}
    if(cw<7&&nw<7&&nw>0&&chance(0.4)){
      const merged=r[i].replace(/[.!?]+$/,'')+' — '+r[i+1].trim()[0].toLowerCase()+r[i+1].trim().slice(1)
      r.splice(i,2,merged)}}
  return r
}

// ── T5: Run-on & Fragment Injection (medium+) ──
function t5_fragments(sentences){
  const frags=["Simple as that.","Not ideal.","Worth considering.","Big difference.","Exactly.","Fair enough.","No question.","Not even close.","A real shift.","That matters.","Key point.","Think about it."]
  const r=[...sentences]
  const targetCount=Math.max(1,Math.floor(r.length*0.12))
  for(let n=0;n<targetCount&&r.length>3;n++){
    const idx=Math.floor(Math.random()*(r.length-2))+1
    r.splice(idx,0,' '+pick(frags))}
  return r
}

// ── T6: Dysfluency Injection (medium+) ──
const DYSFLUENCIES=["actually","I mean","well","to be fair","sort of","pretty much","kind of","or something like that","in a way","more or less"]
function t6_dysfluency(sentences){
  const r=[...sentences];const rate=0.02
  r.forEach((_,i)=>{if(chance(rate)&&r[i].trim().split(/\s+/).length>6){
    const d=pick(DYSFLUENCIES);const words=r[i].trim().split(/\s+/)
    const pos=Math.floor(words.length*0.3)+1;words.splice(pos,0,d)
    r[i]=' '+words.join(' ')}})
  return r
}

// ── T7: Pragmatic Marker Insertion (medium+) ──
const PRAG_INSERTS=["Anyway,","Honestly,","By the way,","You know,","That said,","Come to think of it,","Look,","Mind you,","Granted,","Admittedly,","The thing is,","Here's the deal —"]
function t7_pragmatic(sentences,style){
  if(style==='Academic')return sentences
  const r=[...sentences];const rate=0.08
  for(let i=1;i<r.length;i++){if(chance(rate)){
    const s=r[i].trim();r[i]=' '+pick(PRAG_INSERTS)+' '+s[0].toLowerCase()+s.slice(1)}}
  return r
}

// ── T8: Cognitive Transition Replacement (medium+) ──
const COG_TRANSITIONS=["That got me thinking...","What's interesting here is","The odd part is","At first this seems","Here's where it gets interesting —","Which brings up another point —","Now here's the thing —","This is where it gets tricky —"]
function t8_cognitive(sentences){
  const r=[...sentences];let inserted=0
  for(let i=2;i<r.length-1;i+=Math.floor(r.length/3)){
    if(inserted<2){const s=r[i].trim()
      r[i]=' '+pick(COG_TRANSITIONS)+' '+s[0].toLowerCase()+s.slice(1);inserted++}}
  return r
}

// ── T9: Memory Anchor Injection (hard) ──
const MEM_ANCHORS=["in one project I worked on,","I remember running into this —","a weird thing I noticed was","the first time I tried this,","if I remember correctly,","roughly speaking,","something along those lines —","from what I've seen,","in my experience,","now that I think about it,"]
function t9_memanchors(sentences){
  const r=[...sentences];let wc=0
  for(let i=1;i<r.length;i++){wc+=r[i].split(/\s+/).length
    if(wc>=300){const s=r[i].trim();r[i]=' '+pick(MEM_ANCHORS)+' '+s[0].toLowerCase()+s.slice(1);wc=0}}
  return r
}

// ── T10: Micro-Digression (hard) ──
const DIGRESSIONS=["One unexpected side effect of this was how it changed the whole approach.","I once ran into a case where this backfired completely.","An odd exception to this rule popped up in practice.","Side note — this almost never works the way textbooks describe it.","There's a funny story here but I'll save it for another time."]
function t10_digression(sentences){
  if(sentences.length<10)return sentences
  const r=[...sentences];const pos=Math.floor(r.length*0.6)
  r.splice(pos,0,' '+pick(DIGRESSIONS)+' Anyway, back to the main point —')
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
function t12_uncertainty(sentences){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.15)&&r[i].trim().split(/\s+/).length>8){
    const s=r[i].trim();r[i]=' '+pick(HEDGES)+', '+s[0].toLowerCase()+s.slice(1)}})
  return r
}

// ── T13: Collocation Normalization (all) ──
function t13_collocations(text){
  let r=text;Object.entries(UNNATURAL_COLLOCATIONS).sort((a,b)=>b[0].length-a[0].length).forEach(([from,to])=>{
    const rx=new RegExp(`\\b${escRx(from)}\\b`,'gi')
    r=r.replace(rx,m=>{if(m[0]===m[0].toUpperCase())return to[0].toUpperCase()+to.slice(1);return to})})
  return r
}

// ── T14: Idiom Injection (medium+) ──
function t14_idioms(sentences){
  const r=[...sentences];let wc=0
  const contextIdioms=["at the end of the day","to put it bluntly","in a nutshell","when push comes to shove","for what it's worth","the bottom line is","all things considered","no two ways about it"]
  for(let i=1;i<r.length;i++){wc+=r[i].split(/\s+/).length
    if(wc>=400){const s=r[i].trim();r[i]=' '+pick(contextIdioms)+', '+s[0].toLowerCase()+s.slice(1);wc=0}}
  return r
}

// ── T15: Temporal Grounding (medium+) ──
const TIME_ANCHORS=["earlier","recently","at the time","a while back","not long after","at that point","back then","since then","around that time"]
function t15_temporal(sentences){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.05)&&r[i].trim().split(/\s+/).length>6){
    const words=r[i].trim().split(/\s+/);words.splice(1,0,pick(TIME_ANCHORS))
    r[i]=' '+words.join(' ')}})
  return r
}

// ── T16: Redundancy Weaving (hard) ──
const EMPHASIS_PAIRS=[["big","massive"],["clear","obvious"],["fast","quick"],["slow","gradual"],["hard","difficult"],["easy","straightforward"],["new","fresh"],["old","dated"],["simple","basic"],["complex","layered"]]
function t16_redundancy(sentences){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.03)){const pair=pick(EMPHASIS_PAIRS)
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
function t18_asymmetric(paragraphs){
  if(paragraphs.length<4)return paragraphs
  const r=[...paragraphs]
  // Expand ~20%
  const expandCount=Math.max(1,Math.floor(r.length*0.2))
  for(let n=0;n<expandCount;n++){const i=Math.floor(Math.random()*r.length)
    r[i]=r[i]+' '+pick(ELABORATIONS)}
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

// ── Cleanup ──
function cleanup(text){
  return text.replace(/\s{2,}/g,' ').replace(/\s+([.!?,;:])/g,'$1')
    .replace(/([.!?])([A-Z])/g,'$1 $2').replace(/\.{2,}/g,'.').replace(/,\s*,/g,',')
    .replace(/([.!?])\s+([a-z])/g,(_,p,l)=>p+' '+l.toUpperCase())
    .replace(/(^|\n\n)(\s*)([a-z])/g,(_,pr,sp,l)=>pr+sp+l.toUpperCase())
    .replace(/\n{3,}/g,'\n\n').trim()
}

// ── Chunker ──
function chunkText(text,max=2500){
  const total=text.split(/\s+/).length;if(total<=max)return[text]
  const paras=text.split(/\n\n+/);const chunks=[];let cur=[],count=0
  paras.forEach(p=>{const len=p.split(/\s+/).length
    if(count+len>max&&cur.length){chunks.push(cur.join('\n\n'));cur=[p];count=len}
    else{cur.push(p);count+=len}})
  if(cur.length)chunks.push(cur.join('\n\n'));return chunks
}

// ── MASTER HUMANIZER ──
export function runHumanizer(text,style='Professional',difficulty='Medium'){
  if(!text||text.trim().length===0)return{result:'',warning:'No text provided.'}
  const wc=text.trim().split(/\s+/).length
  if(wc<20)return{result:text,warning:'Text is under 20 words — too short for effective humanization.'}

  const det=runDetection(text)
  if(det.score<15)return{result:text,note:`This text already reads as human-written (AI score: ${det.score}%). No changes needed.`}

  const chunks=chunkText(text)
  const processed=chunks.map(chunk=>processChunk(chunk,style,difficulty))
  return{result:processed.join('\n\n'),note:det.score>70?`Original AI score: ${det.score}%. Heavy rewriting applied.`:undefined}
}

function processChunk(text,style,difficulty){
  const isEasy=difficulty==='Easy',isMedium=difficulty==='Medium',isHard=difficulty==='Hard'
  const{cleaned,zones}=extractProtected(text)
  let r=cleaned

  // T1: Vocab replacement (all)
  r=t1_vocab(r)
  // T13: Collocation normalization (all)
  r=t13_collocations(r)
  // T3: Transition softening (all)
  r=t3_transitions(r)
  // T2: Contractions (all except Academic+Easy)
  if(!(style==='Academic'&&isEasy))r=t2_contractions(r,style)

  // Medium + Hard transforms
  if(isMedium||isHard){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
    sents=t4_sentencevar(sents)         // T4
    sents=t5_fragments(sents)           // T5
    sents=t6_dysfluency(sents)          // T6
    sents=t7_pragmatic(sents,style)     // T7
    sents=t8_cognitive(sents)           // T8
    sents=t14_idioms(sents)             // T14
    sents=t15_temporal(sents)           // T15
    sents=t17_rhymedisrupt(sents)       // T17
    r=sents.join(' ')
    // Paragraph rebalancing
    const paras=r.split(/\n\n+/).filter(p=>p.trim().length>0)
    if(paras.length>2){const rebal=[];for(let i=0;i<paras.length;i++){const p=paras[i].trim();if(!p)continue
      const ps=p.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[p]
      if(ps.length>5&&chance(0.5)){const sp=Math.floor(ps.length*(0.3+Math.random()*0.4));rebal.push(ps.slice(0,sp).join(' '));rebal.push(ps.slice(sp).join(' '))}
      else if(ps.length<=2&&i+1<paras.length&&chance(0.5)){rebal.push(p+' '+paras[i+1].trim());i++}
      else rebal.push(p)}
      r=rebal.join('\n\n')}
  }

  // Hard-only transforms
  if(isHard){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
    sents=t9_memanchors(sents)          // T9
    sents=t12_uncertainty(sents)        // T12
    sents=t16_redundancy(sents)         // T16
    r=sents.join(' ')
    // T10: Micro-digression
    const dsents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
    r=t10_digression(dsents).join(' ')
    // T11: Incomplete enumeration
    r=t11_enumeration(r)
    // T18: Asymmetric detail
    const paras=r.split(/\n\n+/).filter(p=>p.trim().length>0)
    r=t18_asymmetric(paras).join('\n\n')
    // T19: Oxford comma inconsistency
    r=t19_oxfordcomma(r)
    // T20: Em dash spacing
    r=t20_emdash(r)
  }

  r=cleanup(r)
  r=restoreProtected(r,zones)
  return r
}
