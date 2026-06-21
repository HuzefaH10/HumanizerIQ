import { runDetection } from './detector'

function countWords(text){return text.trim().split(/\s+/).filter(w=>w.length>0).length}

function buildPrompt(text, style, difficulty) {
  const isAcademic = style === 'Academic';
  const isCasual = style === 'Casual';
  const isProfessional = style === 'Professional';

  let prompt = '';

  if (isAcademic || isProfessional) {
    if (difficulty === 'Easy') {
      prompt = "Lightly rewrite this text to sound more natural while keeping formal tone. Fix obvious AI patterns but keep structure mostly intact. Return only the rewritten text, nothing else.";
    } else if (difficulty === 'Medium') {
      prompt = "Rewrite this text to sound like a knowledgeable human wrote it. Vary sentence lengths, remove AI transition words, keep it professional. Return only the rewritten text, nothing else.";
    } else {
      prompt = "Completely rewrite this to bypass AI detectors. Mix short and long sentences, use natural human rhythm, occasional informal phrases, reorder information, zero AI transition words like Furthermore/Additionally/Moreover. Must read as 100% human. Return only the rewritten text, nothing else.";
    }
  } else if (isCasual) {
    if (difficulty === 'Easy') {
      prompt = "Lightly rewrite this text to sound more natural and conversational. Fix obvious AI patterns but keep structure mostly intact. Return only the rewritten text, nothing else.";
    } else if (difficulty === 'Medium') {
      prompt = "Rewrite this text to sound like a real person wrote it casually. Use contractions, conversational tone, vary sentence lengths, remove AI transition words. Return only the rewritten text, nothing else.";
    } else {
      prompt = "Completely rewrite this to bypass AI detectors. Use a highly conversational tone, contractions, personal opinions, short reaction sentences, and natural human rhythm. Reorder information and use zero AI transition words. Must read as 100% human. Return only the rewritten text, nothing else.";
    }
  } else {
    // Default fallback
    prompt = "Rewrite this text to sound human. Return only the rewritten text, nothing else.";
  }

  return `${prompt}\n\nHere is the text to rewrite:\n${text}`;
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

  if (!response.ok) {
    throw new Error("Something went wrong, try again");
  }

  const data = await response.json();
  let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean up any potential markdown formatting the model might return
  result = result.replace(/^```[\w]*\n/g, '').replace(/\n```$/g, '').trim();

  return { 
    result, 
    note: det.score > 70 ? `Original AI score: ${det.score}%. Heavy rewriting applied.` : undefined 
  }
}
