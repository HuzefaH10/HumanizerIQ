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
    prompt = `Rewrite the following text so it completely bypasses AI detectors like GPTZero. You must:
- Use irregular sentence lengths — mix very short sentences (4-6 words) with longer ones
- Add one personal opinion or reaction per paragraph (e.g. "which is wild when you think about it", "and that's the part most people miss")
- Remove ALL of these words and phrases completely: Furthermore, Additionally, Moreover, Consequently, It is worth noting, It is crucial, significant, notably, comprehensive, facilitate, leverage, utilize, robust, paradigm, streamline, enhance
- Start some sentences with "And" or "But"
- Add a minor imperfection or casual aside once per paragraph
- Do NOT use parallel sentence structures — vary how each sentence begins
- Do NOT sound like a formal essay
- ${toneGuide}
- Return only the rewritten text, no explanation

Text:
${text}`;
  } else if (difficulty === 'Medium') {
    prompt = `Rewrite the following text to sound like a real human wrote it, not AI. You must:
- Use irregular sentence lengths — mix short and long sentences naturally
- Add one brief personal reaction or opinion per paragraph
- Remove ALL of these words and phrases: Furthermore, Additionally, Moreover, Consequently, It is worth noting, It is crucial, notable, comprehensive, facilitate, leverage, utilize, robust, paradigm
- Start some sentences with "And" or "But"
- Do NOT use parallel sentence structures — vary how each sentence begins
- ${toneGuide}
- Return only the rewritten text, no explanation

Text:
${text}`;
  } else {
    prompt = `Lightly rewrite the following text to fix the most obvious AI patterns. You must:
- Remove these AI transition words if present: Furthermore, Additionally, Moreover, Consequently, It is worth noting, It is crucial
- Slightly vary sentence lengths where they feel too uniform
- Keep the original structure and meaning mostly intact
- ${toneGuide}
- Return only the rewritten text, no explanation

Text:
${text}`;
  }

  return prompt;
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

  return { 
    result, 
    note: det.score > 70 ? `Original AI score: ${det.score}%. Heavy rewriting applied.` : undefined 
  }
}
