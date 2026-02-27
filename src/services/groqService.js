/**
 * GROQ LLM Service — First Aid Advice for Animal Health Alerts
 * Uses llama3-8b-8192 (fast, free-tier friendly) to generate
 * concise first aid steps when a health alert is triggered.
 */

import { GROQ_API_KEY } from '../config/constants';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.1-8b-instant';


// Max characters we allow in the LLM response (SMS budget)
const MAX_RESPONSE_CHARS = 400;

/**
 * Build a prompt based on alert type and sensor readings.
 * @param {'temperature'|'bpm'} alertType
 * @param {Object} data - { value, threshold, species }
 * @returns {string} prompt
 */
function buildPrompt(alertType, data) {
  const species = data.species || 'cow';

  if (alertType === 'temperature') {
    return (
      `A ${species} has a dangerously high body temperature of ${data.value}°C ` +
      `(normal range: 38.0–39.5°C). ` +
      `Give exactly 3 numbered first aid steps a farmer should take immediately before the vet arrives. ` +
      `Be very concise. Plain text only, no markdown, no extra explanation.`
    );
  }

  if (alertType === 'bpm') {
    return (
      `A ${species} has a dangerously high heart rate of ${data.value} BPM ` +
      `(normal range: 40–80 BPM). ` +
      `Give exactly 3 numbered first aid steps a farmer should take immediately before the vet arrives. ` +
      `Be very concise. Plain text only, no markdown, no extra explanation.`
    );
  }

  return (
    `A ${species} is showing a health alert: ${alertType}. ` +
    `Give exactly 3 numbered first aid steps a farmer should take right away. ` +
    `Be very concise. Plain text only, no markdown.`
  );
}

/**
 * Query GROQ API for first aid advice.
 * @param {'temperature'|'bpm'} alertType
 * @param {Object} data - { value, threshold, species? }
 * @returns {Promise<string>} trimmed first aid text, or fallback string on error
 */
export async function getFirstAidAdvice(alertType, data) {
  if (!GROQ_API_KEY) {
    console.warn('[GROQ] API key not set — skipping LLM call');
    return 'Contact your nearest vet immediately.';
  }

  const prompt = buildPrompt(alertType, data);

  try {
    console.log(`[GROQ] Requesting first aid advice for: ${alertType}`);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a veterinary first aid assistant. Respond only with numbered steps. ' +
              'Be extremely brief. No markdown, no headers, no extra text.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[GROQ] API error:', err);
      return 'Keep the animal calm and cool. Contact your vet immediately.';
    }

    const json = await response.json();
    const raw  = json?.choices?.[0]?.message?.content?.trim() || '';
    console.log('[GROQ] Response received:', raw.slice(0, 80) + '...');

    // Trim to SMS budget
    return raw.length > MAX_RESPONSE_CHARS
      ? raw.slice(0, MAX_RESPONSE_CHARS - 3) + '...'
      : raw;

  } catch (error) {
    console.error('[GROQ] Network error:', error.message);
    return 'Keep the animal calm. Contact your vet immediately.';
  }
}
