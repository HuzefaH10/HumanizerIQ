import { runDetection } from './detector'

function countWords(text){return text.trim().split(/\s+/).filter(w=>w.length>0).length}

function buildPrompt(text, style, difficulty) {
  const toneGuide = style === 'Casual'
    ? 'Use a conversational, casual tone throughout. Use contractions freely (don\'t, isn\'t, won\'t). Write like you\'re explaining this to a friend.'
    : style === 'Academic'
    ? 'Keep the tone informed and knowledgeable, like a grad student writing a well-researched blog post — not a formal essay.'
    : 'Keep the tone professional but approachable, like a senior employee writing an internal memo — not a textbook.';

  let prompt = '';

  if (difficulty === 'Hard') {
    prompt = `You are rewriting text to fool AI detectors like GPTZero and Copyleaks. 

Rules you MUST follow:
- Write like a real person typing a point across, not an essay
- Mix sentence lengths aggressively — some 4 words, some 30 words, randomly
- Add filler reactions: "which is crazy", "and honestly", "but here's the thing", "that's the part nobody talks about"
- Start 2-3 sentences with "And" or "But"
- Include one slightly redundant phrase per paragraph like a human would
- Use contractions everywhere: don't, isn't, can't, it's, they're
- Kill these words entirely: Furthermore, Additionally, Moreover, Consequently, It is worth noting, significant, notably, crucial, paramount, imperative
- One sentence per paragraph should feel slightly rushed or informal
- Do NOT write clean structured prose
- Do NOT summarize or conclude neatly
- ${toneGuide}
- Return only the rewritten text, nothing else

Text to rewrite:
${text}`;
  } else if (difficulty === 'Medium') {
    prompt = `Rewrite this to sound like a smart human wrote it casually. Vary sentence lengths, use contractions, remove formal transition words, add one casual aside per paragraph. Not too informal but definitely not AI-polished. ${toneGuide} Return only rewritten text.

Text:
${text}`;
  } else {
    prompt = `Lightly rewrite this to feel less AI-generated. Small changes only — contractions, remove one or two formal phrases, maybe split one long sentence. Keep meaning identical. ${toneGuide} Return only rewritten text.

Text:
${text}`;
  }

  return prompt;
}

function postProcess(text) {
  let processed = text;
  
  // 4. Contractions
  processed = processed.replace(/\b(?:are not)\b/gi, m => m[0] === 'A' ? "Aren't" : "aren't");
  processed = processed.replace(/\b(?:do not)\b/gi, m => m[0] === 'D' ? "Don't" : "don't");
  processed = processed.replace(/\b(?:is not)\b/gi, m => m[0] === 'I' ? "Isn't" : "isn't");
  
  // 5. Remove Transitions
  processed = processed.replace(/\b(?:Furthermore|Additionally|Moreover|Consequently)[,;]?\s*/gi, '');

  const inserts = ["Worth pointing out.", "That part matters.", "Simple but true.", "And it shows.", "Most people miss this."];
  let inserted = false;
  let longSentenceCount = 0;

  let paragraphs = processed.split(/\n\n+/);
  paragraphs = paragraphs.map(para => {
    // 2. Capitalize a mid-sentence word
    let words = para.split(/\s+/);
    if (words.length > 10) {
      let tries = 5;
      while(tries-- > 0) {
        let idx = Math.floor(words.length * 0.3 + Math.random() * (words.length * 0.4));
        if (/^[a-zA-Z]{4,}$/.test(words[idx])) {
          words[idx] = words[idx].toUpperCase();
          break;
        }
      }
    }
    let p = words.join(' ');

    // Sentences
    let sentences = p.match(/[^.!?]+[.!?]+/g);
    if (!sentences) return p;

    let finalSents = [];
    for (let i = 0; i < sentences.length; i++) {
      let s = sentences[i];
      let wc = countWords(s);
      
      // 1. Split every 3rd long sentence
      if (wc > 20) {
        longSentenceCount++;
        if (longSentenceCount % 3 === 0) {
          const splitMatch = s.match(/,\s*(and|but|so|because|which|while)\s/i);
          if (splitMatch) {
            let p1 = s.substring(0, s.indexOf(splitMatch[0])).trim() + '.';
            let p2 = s.substring(s.indexOf(splitMatch[0]) + splitMatch[0].length).trim();
            p2 = p2.charAt(0).toUpperCase() + p2.slice(1);
            finalSents.push(p1);
            s = p2;
          }
        }
      }
      finalSents.push(s.trim());

      // 3. Insert phrase
      if (!inserted && Math.random() < 0.2 && finalSents.length >= 1) {
        finalSents.push(inserts[Math.floor(Math.random() * inserts.length)]);
        inserted = true;
      }
    }
    return finalSents.join(' ');
  });

  processed = paragraphs.join('\n\n');
  
  if (!inserted) {
    processed = processed.replace(/(.+?[.!?])\s/, `$1 ${inserts[Math.floor(Math.random() * inserts.length)]} `);
  }

  // Cleanup spaces
  processed = processed.replace(/\s{2,}/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  
  return processed;
}

export async function runHumanizer(text, style = 'Professional', difficulty = 'Medium') {
  if (!text || text.trim().length === 0) return { result: '', warning: 'No text provided.' }

  let cleanedText = text;
  if (cleanedText.includes('"')) {
    cleanedText = cleanedText.substring(cleanedText.indexOf('"'));
  }

  const wc = countWords(cleanedText)
  if (wc < 20) return { result: cleanedText, warning: 'Text is under 20 words — too short for effective humanization.' }

  // Optional: still run detector to get a "note"
  const det = runDetection(cleanedText)
  if (det.score < 15) return { result: cleanedText, note: `This text already reads as human-written (AI score: ${det.score}%). No changes needed.` }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  const promptText = buildPrompt(cleanedText, style, difficulty);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    }
  );

  console.log("API Response status:", response.status);
  try {
    console.log("API Response body:", await response.clone().json());
  } catch (e) {
    console.log("Failed to parse API response body:", e);
  }

  if (!response.ok) {
    throw new Error("Something went wrong, try again");
  }

  const data = await response.json();
  let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean up any potential markdown formatting the model might return
  result = result.replace(/^```[\w]*\n/g, '').replace(/\n```$/g, '').trim();

  // Apply post-processing rules
  result = postProcess(result);

  return { 
    result, 
    note: det.score > 70 ? `Original AI score: ${det.score}%. Heavy rewriting applied.` : undefined 
  }
}
