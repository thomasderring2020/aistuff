/* Rolo — Quick Intake AI parser (Vercel serverless function)
 *
 * Optional. If ANTHROPIC_API_KEY is set in Vercel (Project → Settings → Environment Variables),
 * Rolo sends the spoken note here and Claude sorts it into fields. Without the key, this returns
 * 501 and the app falls back to its built-in on-device parser.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  (required to enable)
 *   ANTHROPIC_MODEL    (optional, defaults to claude-haiku-4-5)
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const TOOL = {
  name: 'file_note',
  description: 'File the facts from a salesperson\'s spoken note into the contact record fields. Only include fields the note actually supports.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'A clean 1-3 sentence version of the note for the conversation history, written in third person, keeping concrete details.' },
      touchType: { type: 'string', enum: ['call', 'text', 'email', 'meeting', 'note'], description: 'What kind of interaction the note describes. Default call.' },
      nextStep: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Short imperative action, e.g. "Call back about switching brokers".' },
          due: { type: 'string', description: 'YYYY-MM-DD resolved from relative phrases like "next week" using today\'s date. Empty if no timing given.' }
        }
      },
      hobbies: { type: 'array', items: { type: 'string' }, description: 'Short title-case hobbies/interests, e.g. "Golf".' },
      favoriteLunch: { type: 'string' },
      favoriteDinner: { type: 'string', description: 'Use for a favorite restaurant when the meal is not specified.' },
      favoriteTreat: { type: 'string', description: 'Favorite drink, snack or small gift.' },
      giftIdeas: { type: 'string' },
      pinned: { type: 'array', items: { type: 'string' }, description: 'Important things to remember every time: pain points, frustrations, strong preferences. Short, no subject (e.g. "Unhappy with current broker").' },
      spouseName: { type: 'string' },
      kids: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } } },
      pets: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, kind: { type: 'string' } } } },
      birthday: { type: 'string', description: 'MM-DD or YYYY-MM-DD' },
      company: { type: 'string' },
      title: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Lowercase short tags, e.g. "competitor broker".' }
    },
    required: ['summary']
  }
};

module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return res.status(key ? 200 : 501).json({ ai: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(501).json({ error: 'not_configured' });

  // Light abuse guard: only accept calls from this site.
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && !origin.endsWith('//' + host)) return res.status(403).json({ error: 'origin' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const note = String(body.note || '').slice(0, 3000).trim();
  if (!note) return res.status(400).json({ error: 'empty' });
  const today = String(body.today || '').slice(0, 40);
  const contact = JSON.stringify(body.contact || {}).slice(0, 4000);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'file_note' },
        system: 'You help a salesperson keep a rolodex. Sort their dictated note about one contact into structured fields. Never invent facts. Resolve relative dates from today. Keep values short.',
        messages: [{ role: 'user', content: `Today is ${today}.\nCurrent record (for context): ${contact}\n\nNote:\n"""${note}"""` }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status });
    const data = await r.json();
    const block = (data.content || []).find((b) => b.type === 'tool_use');
    if (!block) return res.status(502).json({ error: 'no_result' });
    return res.status(200).json({ source: 'ai', ...block.input });
  } catch (e) {
    return res.status(500).json({ error: 'failed' });
  }
};
