const text = `"In today's rapidly evolving landscape, it is crucial to understand the multifaceted nature of artificial intelligence. Furthermore, it is worth noting that the implementation of robust machine learning models can significantly leverage organizational paradigms. Moreover, meticulous attention to nuanced data patterns is paramount for achieving comprehensive results. Additionally, one must endeavor to foster a holistic approach that underscores the pivotal role of innovative methodologies in transforming business ecosystems."`;

function extractProtected(text){
  const zones=[];
  const rx = /```[\s\S]*?```|`[^`]+`|<code>[\s\S]*?<\/code>|https?:\/\/[^\s)>\]]+|"[^"]{4,}"|[$€£¥]?\d[\d,.]*\s*(?:%|percent|million|billion|thousand)?/gi;
  const cleaned = text.replace(rx, m => {
    const ph=`\u27e6P${zones.length}\u27e7`;
    zones.push(m);
    return ph;
  });
  return{cleaned,zones}
}

function restoreProtected(text,zones){let r=text;zones.forEach((o,i)=>{r=r.replace(new RegExp(`\u27e6P${i}\u27e7`,'gi'),o)});return r}

const { cleaned, zones } = extractProtected(text);
console.log("cleaned:", cleaned);
console.log("zones:", zones);

let r = restoreProtected(cleaned, zones);
console.log("restored:", r);
