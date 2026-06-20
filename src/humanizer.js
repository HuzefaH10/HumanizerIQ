// HumanizerIQ — 20-Transform Humanizer Engine
import{CONTRACTION_PAIRS,VOCAB_REPLACEMENTS,VOCAB_ACADEMIC,VOCAB_CASUAL,IDIOMS,UNNATURAL_COLLOCATIONS,FUNCTION_WORDS}from'./engine-data'
import{runDetection}from'./detector'
import{CognitiveEngine}from'./cognitive-engine'

function escRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
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
      const merged=r[i].replace(/[.!?]+$/,'')+' — '+r[i+1].trim()[0].toLowerCase()+r[i+1].trim().slice(1)
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
      const s=r[i].trim();r[i]=' '+pick(COG_TRANSITIONS)+' '+s[0].toLowerCase()+s.slice(1)
      docState.cogUsed=true;cogWc=0;continue
    }

    // Pragmatic markers: per 250w (Professional=mild subset, Casual=full list)
    if(pragWc>=250 && !isAcademic){
      const pool=isProfessional?["That said,","Honestly,","Admittedly,"]:PRAG_INSERTS
      if(chance(0.4)){
        const s=r[i].trim();r[i]=' '+pick(pool)+' '+s[0].toLowerCase()+s.slice(1);pragWc=0;continue
      }
    }

    // Fragments: never Academic, Professional/Casual hard only (1 per 400w, 1 per doc max)
    if(isHard && !isAcademic && fragWc>=400 && totalWordCount>=400 && !docState.fragUsed){
      if(chance(0.5)){r.splice(i+1,0,' '+pick(FRAGS));docState.fragUsed=true;fragWc=0;i++;continue}
    }

    // Casual Hard: memory anchors per 300w
    if(isHard && isCasual && cogWc>=250 && chance(0.2)){
      const s=r[i].trim();r[i]=' '+pick(MEM_ANCHORS)+' '+s[0].toLowerCase()+s.slice(1);continue
    }

    // Casual Hard: micro-digressions
    if(isHard && isCasual && chance(0.02) && countWords(r[i])>10){
      r.splice(i+1,0,' '+pick(DIGRESSIONS));i++;continue
    }

    // Context idioms (Professional/Casual medium+)
    if(!isAcademic && pragWc>=300 && chance(0.15)){
      const s=r[i].trim();r[i]=' '+pick(CONTEXT_IDIOMS)+', '+s[0].toLowerCase()+s.slice(1);pragWc=0
    }
  }
  return r
}

// ── T6: Dysfluency Injection (medium+) ──
const DYSFLUENCIES=["actually","I mean","well","to be fair","sort of","pretty much","kind of","or something like that","in a way","more or less"]
function t6_dysfluency(sentences){
  const r=[...sentences];const rate=0.02
  r.forEach((_,i)=>{if(chance(rate)&&countWords(r[i])>6){
    const d=pick(DYSFLUENCIES);const words=r[i].trim().split(/\s+/)
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
function t12_uncertainty(sentences){
  const r=[...sentences]
  r.forEach((_,i)=>{if(chance(0.15)&&countWords(r[i])>8){
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

// ── T15: Temporal Grounding (medium+) ──
const TIME_ANCHORS=["earlier","recently","at the time","a while back","not long after","at that point","since then","around that time"]
function t15_temporal(sentences){
  const r=[...sentences];let wc=0
  for(let i=1;i<r.length;i++){wc+=countWords(r[i])
    if(wc>=150){
      if(chance(0.5)){
        const t=pick(TIME_ANCHORS);const s=r[i].trim()
        r[i]=' '+t[0].toUpperCase()+t.slice(1)+', '+s[0].toLowerCase()+s.slice(1)
      }
      wc=0
    }
  }
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
  let result = text.replace(/\s{2,}/g,' ').replace(/\s+([.!?,;:])/g,'$1')
    .replace(/([.!?])([A-Z])/g,'$1 $2').replace(/\.{2,}/g,'.').replace(/,\s*,/g,',')
    .replace(/([.!?])\s+([a-z])/g,(_,p,l)=>p+' '+l.toUpperCase())
    .replace(/(^|\n\n)(\s*)([a-z])/g,(_,pr,sp,l)=>pr+sp+l.toUpperCase())
    .replace(/\n{3,}/g,'\n\n').trim()
  return result.replace(/([.!?])\s*,/g, '$1').replace(/,\s*\./g, '.').replace(/\.+/g, '.').replace(/\ba ([aeiouAEIOU])/g, 'an $1')
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

  const docState = { fragUsed: false, cogUsed: false };

  const chunks=chunkText(cleanedText)
  const processed=chunks.map(chunk=>processChunk(chunk,style,difficulty,docState))
  return{result:processed.join('\n\n'),note:det.score>70?`Original AI score: ${det.score}%. Heavy rewriting applied.`:undefined}
}

function processChunk(text,style,difficulty,docState){
  const isEasy=difficulty==='Easy',isMedium=difficulty==='Medium',isHard=difficulty==='Hard'
  const isAcademic=style==='Academic',isProfessional=style==='Professional',isCasual=style==='Casual'
  const{cleaned,zones}=extractProtected(text)
  let r=cleaned

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
        const s=sents[i].trim();sents[i]=' '+pick(PRAG_INSERTS)+' '+s[0].toLowerCase()+s.slice(1);wc=0
      }
    }
    r=sents.join(' ')
  }

  // ── MEDIUM + HARD ──
  if(isMedium||isHard){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]

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
      sents=t6_dysfluency(sents)
    }

    // Professional medium also gets mild dysfluency
    if(isProfessional && isMedium) sents=t6_dysfluency(sents)

    // Temporal grounding (not Academic)
    if(!isAcademic) sents=t15_temporal(sents)

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

  // ── HARD ONLY ──
  if(isHard){
    let sents=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]

    // Academic Hard: only parentheticals (1 per 400w) + mild uncertainty ("this may suggest")
    if(isAcademic){
      // Mild academic uncertainty (not "I think" but "this may suggest")
      const ACAD_HEDGES=["this may suggest","it appears that","one could argue","this seems to indicate","it is plausible that"]
      sents.forEach((_,i)=>{if(chance(0.10)&&countWords(sents[i])>8){
        const s=sents[i].trim();sents[i]=' '+pick(ACAD_HEDGES)+' '+s[0].toLowerCase()+s.slice(1)}})
    }

    // Professional Hard: uncertainty modeling + run-ons
    if(isProfessional){
      sents=t12_uncertainty(sents)
      sents=t16_redundancy(sents)
    }

    // Casual Hard: full uncertainty + redundancy + memory anchors
    if(isCasual){
      sents=t12_uncertainty(sents)
      sents=t16_redundancy(sents)
    }

    r=sents.join(' ')

    // Incomplete enumeration (Professional + Casual only)
    if(!isAcademic) r=t11_enumeration(r)

    // Asymmetric detail distribution (all styles)
    const paras=r.split(/\n\n+/).filter(p=>p.trim().length>0)
    r=t18_asymmetric(paras).join('\n\n')

    // Oxford comma inconsistency (Professional + Casual)
    if(!isAcademic) r=t19_oxfordcomma(r)

    // Em dash spacing (Professional + Casual)
    if(!isAcademic) r=t20_emdash(r)

    // Academic Hard: parentheticals only (1 per 400w), via inline injection
    if(isAcademic){
      const ACAD_ASIDES=["(though this warrants further study)","(a point often overlooked)","(which merits consideration)","(notably)","(as one might expect)"]
      let sents2=r.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[r]
      let awc=0;let asideUsed=false
      for(let i=0;i<sents2.length;i++){
        awc+=countWords(sents2[i])
        if(awc>=400&&!asideUsed&&chance(0.6)){
          const words=sents2[i].trim().split(' ')
          const pos=Math.floor(words.length*0.7)
          words.splice(pos,0,pick(ACAD_ASIDES))
          sents2[i]=' '+words.join(' ');awc=0;asideUsed=true
        }
      }
      r=sents2.join(' ')
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
    experientialDepth:style==='Casual'?0.5:0.2
  })
  r=cog.run(r)

  r=cleanup(r)
  r=restoreProtected(r,zones)
  return r
}
