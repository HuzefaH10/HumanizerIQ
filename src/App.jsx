import{useState,useRef,useEffect,useCallback}from'react'
import{Wand2,ScanSearch,Type,Copy,Check,Trash2,ArrowLeft,AlertCircle,FileText,Sparkles,ChevronRight,Info,Clock}from'lucide-react'
import{runDetection}from'./detector'
import{runHumanizer}from'./humanizer'
import{HIGHLIGHT_COLORS}from'./engine-data'

const MAX_WORDS=2500
const LEGEND_ITEMS=[
  {key:'transition',label:'Transition / Hedging',color:'#1e3a5f'},
  {key:'rhythm',label:'Robotic Rhythm',color:'#1a3a2a'},
  {key:'vocab',label:'AI Vocabulary',color:'#2d1b4e'},
  {key:'formal',label:'Formal / Zero Contractions',color:'#3a2800'},
  {key:'highConfidence',label:'High-Confidence AI',color:'#3a1a1a'},
]
function countWords(t){if(!t.trim())return 0;return t.trim().split(/\s+/).length}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function highlightSpans(text,spans){
  if(!spans||!spans.length)return escHtml(text)
  const positions=[]
  spans.forEach(span=>{
    const color=HIGHLIGHT_COLORS[span.category]?.bg||'#3a1a1a'
    let idx=0
    while(true){const i=text.indexOf(span.text,idx);if(i===-1)break
      positions.push({start:i,end:i+span.text.length,color,reason:span.reason||''});idx=i+1}
  })
  positions.sort((a,b)=>a.start-b.start||b.end-a.end)
  const filtered=[];let lastEnd=-1
  positions.forEach(p=>{if(p.start>=lastEnd){filtered.push(p);lastEnd=p.end}})
  let result='',cursor=0
  filtered.forEach(p=>{
    if(p.start>cursor)result+=escHtml(text.slice(cursor,p.start))
    result+=`<mark style="background:${p.color};border-radius:3px;padding:1px 3px" title="${escHtml(p.reason)}">${escHtml(text.slice(p.start,p.end))}</mark>`
    cursor=p.end})
  if(cursor<text.length)result+=escHtml(text.slice(cursor))
  return result
}

function getScoreColor(s){if(s<30)return'green';if(s<60)return'yellow';if(s<80)return'orange';return'red'}

function generateSentenceHtml(text, sentencesData) {
  if(!sentencesData||!sentencesData.length)return escHtml(text)
  const positions=[]
  sentencesData.forEach(sd=>{
    let idx=0
    while(true){const i=text.indexOf(sd.text,idx);if(i===-1)break
      let color='#22c55e';if(sd.confidence>=80)color='#ef4444';else if(sd.confidence>=60)color='#f97316';else if(sd.confidence>=30)color='#eab308'
      const reasonsList=sd.reasons.length>0?sd.reasons.join(', '):'None'
      const tooltip=`AI Confidence: ${sd.confidence}% — [${reasonsList}]`
      positions.push({start:i,end:i+sd.text.length,color,tooltip});idx=i+1}
  })
  positions.sort((a,b)=>a.start-b.start||b.end-a.end)
  const filtered=[];let lastEnd=-1
  positions.forEach(p=>{if(p.start>=lastEnd){filtered.push(p);lastEnd=p.end}})
  let result='',cursor=0
  filtered.forEach(p=>{
    if(p.start>cursor)result+=escHtml(text.slice(cursor,p.start))
    result+=`<span style="border-left: 3px solid ${p.color}; padding-left: 4px; margin-left: 2px;" title="${escHtml(p.tooltip)}">${escHtml(text.slice(p.start,p.end))}</span>`
    cursor=p.end})
  if(cursor<text.length)result+=escHtml(text.slice(cursor))
  return result
}

// Animated counter hook
function useAnimatedCounter(target,duration=600){
  const[display,setDisplay]=useState(0)
  useEffect(()=>{
    if(target===0){setDisplay(0);return}
    let start=null;const from=0
    const step=ts=>{if(!start)start=ts;const progress=Math.min((ts-start)/duration,1)
      setDisplay(Math.round(from+(target-from)*progress))
      if(progress<1)requestAnimationFrame(step)}
    requestAnimationFrame(step)
  },[target,duration])
  return display
}

export default function App(){
  const[mode,setMode]=useState('humanize')
  const[inputText,setInputText]=useState('')
  const[style,setStyle]=useState('Professional')
  const[difficulty,setDifficulty]=useState('Medium')
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState(null)
  const[humanizedText,setHumanizedText]=useState('')
  const[humanizeNote,setHumanizeNote]=useState(null)
  const[detectResult,setDetectResult]=useState(null)
  const[copied,setCopied]=useState(false)
  const[outputWords,setOutputWords]=useState(0)
  const[history,setHistory]=useState(()=>{
    try{const h=sessionStorage.getItem('humanizer_history');return h?JSON.parse(h):[]}catch{return[]}
  })
  const[showHistory,setShowHistory]=useState(false)
  const[detectView,setDetectView]=useState('category')

  useEffect(()=>{
    const handleClickOutside=(e)=>{
      if(!e.target.closest('.history-wrapper')) setShowHistory(false);
    };
    if(showHistory) document.addEventListener('click',handleClickOutside);
    return()=>document.removeEventListener('click',handleClickOutside);
  },[showHistory])
  
  const[formatState,setFormatState]=useState({
    bold:false,italic:false,underline:false,strikeThrough:false,
    h1:false,h2:false,h3:false,ul:false,ol:false,blockquote:false
  })

  const humanizeBtnRef=useRef(null),detectBtnRef=useRef(null),sliderRef=useRef(null),outputRef=useRef(null)
  const words=countWords(inputText),overLimit=words>MAX_WORDS
  const animatedScore=useAnimatedCounter(detectResult?.score||0)

  const handleOutputInput=useCallback(()=>{
    if(outputRef.current) setOutputWords(countWords(outputRef.current.innerText))
  },[])

  const updateFormatState=useCallback(()=>{
    setFormatState({
      bold:document.queryCommandState('bold'),
      italic:document.queryCommandState('italic'),
      underline:document.queryCommandState('underline'),
      strikeThrough:document.queryCommandState('strikeThrough'),
      h1:document.queryCommandValue('formatBlock')==='h1',
      h2:document.queryCommandValue('formatBlock')==='h2',
      h3:document.queryCommandValue('formatBlock')==='h3',
      ul:document.queryCommandState('insertUnorderedList'),
      ol:document.queryCommandState('insertOrderedList'),
      blockquote:document.queryCommandValue('formatBlock')==='blockquote'
    })
  },[])

  useEffect(()=>{
    const handleSelectionChange=()=>{
      if(document.activeElement===outputRef.current) updateFormatState()
    }
    document.addEventListener('selectionchange',handleSelectionChange)
    return ()=>document.removeEventListener('selectionchange',handleSelectionChange)
  },[updateFormatState])

  const execCmd=(cmd,val=null)=>{
    if(cmd==='formatBlock'&&val==='BLOCKQUOTE'){
      // custom blockquote wrap
      document.execCommand('formatBlock',false,'BLOCKQUOTE')
    }else{
      document.execCommand(cmd,false,val)
    }
    outputRef.current?.focus()
    updateFormatState()
  }

  const handleCopyPlain=()=>{
    if(!outputRef.current)return
    navigator.clipboard.writeText(outputRef.current.innerText).then(()=>{
      setCopied(true);setTimeout(()=>setCopied(false),2000)
    })
  }

  const handleCopyFormatted=async()=>{
    if(!outputRef.current)return
    try{
      const html=outputRef.current.innerHTML
      const blobHtml=new Blob([html],{type:'text/html'})
      const blobText=new Blob([outputRef.current.innerText],{type:'text/plain'})
      const item=new ClipboardItem({'text/html':blobHtml,'text/plain':blobText})
      await navigator.clipboard.write([item])
      setCopied(true);setTimeout(()=>setCopied(false),2000)
    }catch(e){
      console.error(e)
      handleCopyPlain()
    }
  }

  useEffect(()=>{
    const btn=mode==='humanize'?humanizeBtnRef.current:detectBtnRef.current
    const sl=sliderRef.current
    if(btn&&sl){sl.style.left=btn.offsetLeft+'px';sl.style.width=btn.offsetWidth+'px'}
  },[mode])

  const handleHumanize=useCallback((overrideText = null)=>{
    const txt = typeof overrideText === 'string' ? overrideText : inputText;
    if(!txt.trim()||countWords(txt)>MAX_WORDS)return
    setLoading(true);setError(null);setHumanizedText('');setHumanizeNote(null);setOutputWords(0)
    setTimeout(()=>{try{
      const{result,note,warning}=runHumanizer(txt,style,difficulty)
      setHumanizedText(result)
      setOutputWords(countWords(result))
      const newEntry = { id: Date.now(), timestamp: Date.now(), inputText: txt, outputText: result, style, difficulty };
      setHistory(prev => {
        const next = [newEntry, ...prev].slice(0, 3);
        sessionStorage.setItem('humanizer_history', JSON.stringify(next));
        return next;
      });
      if(warning)setHumanizeNote({type:'warning',text:warning})
      else if(note)setHumanizeNote({type:'note',text:note})
    }catch(e){setError(e.message)}finally{setLoading(false)}},0)
  },[inputText,style,difficulty])

  const handleDetect=useCallback((overrideText = null)=>{
    const txt = typeof overrideText === 'string' ? overrideText : inputText;
    if(!txt.trim()||countWords(txt)>MAX_WORDS)return
    setLoading(true);setError(null);setDetectResult(null)
    setTimeout(()=>{try{
      const result=runDetection(txt)
      const highlightedHtml=highlightSpans(txt,result.spans)
      const sentenceHtml=generateSentenceHtml(txt,result.sentencesData)
      setDetectResult({...result,highlightedHtml,sentenceHtml})
    }catch(e){setError(e.message)}finally{setLoading(false)}},0)
  },[inputText])

  const handleHumanizeAgain = () => {
    if(!outputRef.current)return;
    const t = outputRef.current.innerText;
    setInputText(t);
    handleHumanize(t);
  };

  const handleDetectThis = () => {
    if(!outputRef.current)return;
    const t = outputRef.current.innerText;
    setInputText(t);
    setMode('detect');
    handleDetect(t);
  };

  const handleCopy=()=>{
    let t='';if(mode==='humanize')t=humanizedText
    else if(detectResult)t=`AI Score: ${detectResult.score}%\n${detectResult.verdict}`
    if(!t)return;navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}

  const hasOutput=mode==='humanize'?!!humanizedText:!!detectResult
  // Filter legend to only show detected categories
  const activeCategories=detectResult?new Set(detectResult.spans.map(s=>s.category)):new Set()

  return(<>
    <header className="navbar">
      <a href="https://aorbub.com" className="nav-brand" target="_blank" rel="noreferrer">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="5" cy="5" r="2.5" fill="#6366f1"/><circle cx="15" cy="5" r="2.5" fill="#6366f1"/>
          <circle cx="5" cy="15" r="2.5" fill="#6366f1"/><circle cx="15" cy="15" r="2.5" fill="#6366f1"/>
        </svg>
        <span>HumanizerIQ</span><span className="nav-brand-sub">by Aorbub</span>
      </a>
      <div className="nav-right">
        <a href="https://aorbub.com" className="nav-back" target="_blank" rel="noreferrer"><ArrowLeft size={14}/>All Tools</a>
      </div>
    </header>

    <div className="mode-toggle-container"><div className="mode-toggle">
      <div className="mode-toggle-slider" ref={sliderRef}/>
      <button ref={humanizeBtnRef} className={`mode-toggle-btn ${mode==='humanize'?'active':''}`}
        onClick={()=>{setMode('humanize');setError(null)}}><Wand2 size={16}/>Humanize</button>
      <button ref={detectBtnRef} className={`mode-toggle-btn ${mode==='detect'?'active':''}`}
        onClick={()=>{setMode('detect');setError(null)}}><ScanSearch size={16}/>Detect</button>
    </div></div>

    <main className="app-main">
      <div className="panel">
        <div className="panel-header"><div className="panel-title"><Type size={14}/>Input Text</div></div>
        <div className="textarea-wrapper">
          <textarea className="text-input" placeholder={mode==='humanize'?'Paste your AI-generated text here...':'Paste any text to analyze for AI patterns...'}
            value={inputText} onChange={e=>setInputText(e.target.value)} spellCheck={false}/>
          <div className="textarea-footer">
            <span className={`word-count ${overLimit?'over':words>MAX_WORDS*0.9?'warning':''}`}>
              {words.toLocaleString()} / {MAX_WORDS.toLocaleString()} words</span>
            {inputText&&<button className="clear-btn" onClick={()=>{setInputText('');setError(null);setHumanizedText('');setHumanizeNote(null);setDetectResult(null)}}>
              <Trash2 size={12}/>Clear</button>}
          </div>
        </div>
        {mode==='humanize'&&<>
          <div className="control-group"><span className="control-label">Style</span>
            <div className="pill-tabs">{['Academic','Professional','Casual'].map(s=>
              <button key={s} className={`pill-tab ${style===s?'active':''}`} onClick={()=>setStyle(s)}>{s}</button>)}</div></div>
          <div className="control-group"><span className="control-label">Difficulty</span>
            <div className="pill-tabs">{['Easy','Medium','Hard'].map(d=>
              <button key={d} className={`pill-tab ${difficulty===d?'active':''}`} onClick={()=>setDifficulty(d)}>{d}</button>)}</div></div>
        </>}
        {mode==='humanize'?
          <button className={`cta-btn ${loading?'loading':''}`} disabled={!inputText.trim()||overLimit||loading} onClick={handleHumanize}>
            {loading?<span className="spinner"/>:<Sparkles size={18}/>}{loading?'Humanizing...':'Humanize'}</button>:
          <button className={`cta-btn ${loading?'loading':''}`} disabled={!inputText.trim()||overLimit||loading} onClick={handleDetect}>
            {loading?<span className="spinner"/>:<ScanSearch size={18}/>}{loading?'Analyzing...':'Analyze'}</button>}
      </div>

      <div className="panel">
        <div className="panel-header" style={{ position: 'relative' }}>
          <div className="panel-title"><FileText size={14}/>{mode==='humanize'?'Humanized Output':'Detection Results'}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {mode==='humanize' && (
              <div className="history-wrapper" style={{ position: 'relative' }}>
                <button className="copy-output-btn" onClick={() => setShowHistory(!showHistory)}>
                  <Clock size={14}/>History ({history.length})
                </button>
                {showHistory && (
                  <div className="history-dropdown">
                    <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: 'var(--text)' }}>Recent Generations</div>
                    {history.length === 0 ? <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No history yet.</div> : history.map((entry) => (
                      <div key={entry.id} className="history-item">
                        <div className="history-item-header">
                          <span className="history-item-badges">
                            <span className="history-badge">{entry.style}</span>
                            <span className="history-badge">{entry.difficulty}</span>
                          </span>
                          <span className="history-time">{Math.max(0, Math.floor((Date.now() - entry.timestamp) / 60000))}m ago</span>
                        </div>
                        <div className="history-preview">{entry.outputText.slice(0, 80)}...</div>
                        <button className="action-btn" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={() => {
                          setHumanizedText(entry.outputText);
                          setInputText(entry.inputText);
                          setStyle(entry.style);
                          setDifficulty(entry.difficulty);
                          setOutputWords(countWords(entry.outputText));
                          setShowHistory(false);
                        }}>Restore</button>
                      </div>
                    ))}
                    {history.length > 0 && <button className="clear-history-btn" onClick={() => { setHistory([]); sessionStorage.removeItem('humanizer_history'); }}>Clear History</button>}
                  </div>
                )}
              </div>
            )}
            {mode==='detect'&&hasOutput&&<button className={`copy-output-btn ${copied?'copied':''}`} onClick={handleCopy}>
              {copied?<Check size={14}/>:<Copy size={14}/>}{copied?'Copied!':'Copy'}</button>}
          </div>
        </div>
        {error&&<div className="error-banner"><AlertCircle size={16}/>{error}</div>}
        <div className="output-area">
          {mode==='humanize'&&(humanizedText?<>
            <div className="rtf-toolbar">
              <button className={`rtf-btn ${formatState.bold?'active':''}`} onClick={()=>execCmd('bold')} style={{fontWeight:'bold'}}>B</button>
              <button className={`rtf-btn ${formatState.italic?'active':''}`} onClick={()=>execCmd('italic')} style={{fontStyle:'italic'}}>I</button>
              <button className={`rtf-btn ${formatState.underline?'active':''}`} onClick={()=>execCmd('underline')} style={{textDecoration:'underline'}}>U</button>
              <button className={`rtf-btn ${formatState.strikeThrough?'active':''}`} onClick={()=>execCmd('strikeThrough')} style={{textDecoration:'line-through'}}>S</button>
              <div className="rtf-divider"/>
              <button className={`rtf-btn text-btn ${formatState.h1?'active':''}`} onClick={()=>execCmd('formatBlock','H1')}>H1</button>
              <button className={`rtf-btn text-btn ${formatState.h2?'active':''}`} onClick={()=>execCmd('formatBlock','H2')}>H2</button>
              <button className={`rtf-btn text-btn ${formatState.h3?'active':''}`} onClick={()=>execCmd('formatBlock','H3')}>H3</button>
              <button className="rtf-btn text-btn" onClick={()=>execCmd('formatBlock','P')}>Body</button>
              <div className="rtf-divider"/>
              <button className={`rtf-btn ${formatState.ul?'active':''}`} onClick={()=>execCmd('insertUnorderedList')}>•</button>
              <button className={`rtf-btn ${formatState.ol?'active':''}`} onClick={()=>execCmd('insertOrderedList')}>1.</button>
              <button className={`rtf-btn ${formatState.blockquote?'active':''}`} onClick={()=>execCmd('formatBlock','BLOCKQUOTE')}>"</button>
              <div className="rtf-divider" style={{marginLeft:'auto'}}/>
              <button className="rtf-btn text-btn" onClick={()=>execCmd('removeFormat')}>Clear</button>
              <button className="rtf-btn text-btn" onClick={handleCopyPlain}>{copied?'Copied!':'Copy Plain'}</button>
              <button className="rtf-btn text-btn" onClick={handleCopyFormatted}>{copied?'Copied!':'Copy Formatted'}</button>
            </div>
            <div className="output-status-bar">
              <span className={`word-count ${outputWords > 0 && Math.abs(outputWords - words) / (words || 1) > 0.2 ? 'warning' : outputWords > 0 && Math.abs(outputWords - words) / (words || 1) <= 0.1 ? 'success' : ''}`}>
                {outputWords.toLocaleString()} / {words.toLocaleString()} words
              </span>
              <button className="clear-btn" onClick={() => { if(outputRef.current) outputRef.current.innerHTML=''; setHumanizedText(''); setOutputWords(0); setHumanizeNote(null); }}>
                <Trash2 size={12}/>Clear
              </button>
            </div>
            {humanizeNote&&<div className={humanizeNote.type==='warning'?'warning-banner':'info-banner'}><Info size={16}/>{humanizeNote.text}</div>}
            <div ref={outputRef} className="output-text" contentEditable={true} suppressContentEditableWarning={true}
                 onInput={handleOutputInput}
                 onKeyUp={updateFormatState} onMouseUp={updateFormatState}
                 dangerouslySetInnerHTML={{__html:escHtml(humanizedText).replace(/\n\n/g,'<br><br>')}} />
            <div className="output-hint">Click to edit</div>
            <div className="action-row">
              <button className="action-btn" onClick={handleHumanizeAgain}>↻ Humanize Again</button>
              <button className="action-btn" onClick={handleDetectThis}>⊙ Detect This</button>
            </div>
          </>:!loading&&!error&&<div className="output-placeholder"><Sparkles size={48}/>
            <p>Paste AI-generated text on the left,<br/>choose your style &amp; difficulty,<br/>then click <strong>Humanize</strong>.</p></div>)}

          {mode==='detect'&&(detectResult?<div className="detection-result">
            <div className="score-display">
              <div className="score-label">AI Probability Score</div>
              <div className={`score-value ${getScoreColor(detectResult.score)}`}>{animatedScore}%</div>
              <div className="score-verdict">{detectResult.verdict}</div>
              <div className="score-bar-track"><div className={`score-bar-fill ${getScoreColor(detectResult.score)}`} style={{width:`${detectResult.score}%`}}/></div>
            </div>
            {detectResult.summary&&<div className="detection-summary">
              <div className="summary-chip"><span className="summary-chip-count">{detectResult.summary.transition_count}</span><span className="summary-chip-label">Transitions</span></div>
              <div className="summary-chip"><span className="summary-chip-count">{detectResult.summary.rhythm_count}</span><span className="summary-chip-label">Rhythm</span></div>
              <div className="summary-chip"><span className="summary-chip-count">{detectResult.summary.vocab_count}</span><span className="summary-chip-label">Vocab</span></div>
              <div className="summary-chip"><span className="summary-chip-count">{detectResult.summary.formal_count}</span><span className="summary-chip-label">Formal</span></div>
              <div className="summary-chip"><span className="summary-chip-count">{detectResult.summary.high_confidence_count}</span><span className="summary-chip-label">High Conf.</span></div>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <div className="pill-tabs">
                <button className={`pill-tab ${detectView==='category'?'active':''}`} onClick={()=>setDetectView('category')}>Category View</button>
                <button className={`pill-tab ${detectView==='sentence'?'active':''}`} onClick={()=>setDetectView('sentence')}>Sentence View</button>
              </div>
            </div>
            {detectResult.highlightedHtml&&detectView==='category'&&<div className="output-text" dangerouslySetInnerHTML={{__html:detectResult.highlightedHtml.replace(/\n\n/g,'<br><br>')}}/>}
            {detectResult.sentenceHtml&&detectView==='sentence'&&<div className="output-text" dangerouslySetInnerHTML={{__html:detectResult.sentenceHtml.replace(/\n\n/g,'<br><br>')}}/>}
            {detectView==='category'&&<div className="legend">{LEGEND_ITEMS.filter(item=>activeCategories.has(item.key)).map(item=>
              <span key={item.key} className="legend-pill"><span className="legend-dot" style={{background:item.color}}/>{item.label}</span>)}</div>}
          </div>:!loading&&!error&&<div className="output-placeholder"><ScanSearch size={48}/>
            <p>Paste any text on the left,<br/>then click <strong>Analyze</strong> to detect<br/>AI-generated patterns.</p></div>)}

          {loading&&<div className="output-placeholder"><span className="spinner" style={{width:32,height:32,borderWidth:3}}/>
            <p>{mode==='humanize'?'Rewriting your text...':'Analyzing 25 pattern modules...'}</p></div>}
        </div>
      </div>
    </main>

    <footer className="app-footer">
      <div><span className="footer-brand">HumanizerIQ</span>© 2026 Huzefa Haveliwala</div>
      <a href="https://aorbub.com" target="_blank" rel="noreferrer">Part of the Aorbub Suite <ChevronRight size={12} style={{verticalAlign:'middle'}}/></a>
    </footer>
  </>)
}
