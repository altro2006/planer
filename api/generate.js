export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, systemPrompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Brak prompta' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt || 'Jesteś ekspertem fitness i dietetykiem. Zawsze odpowiadaj TYLKO w formacie JSON, bez żadnych dodatkowych komentarzy, bez markdown, bez backticks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err?.error?.message || 'Błąd API Groq' });
    }

    const data = await response.json();
    return res.status(200).json({ result: data.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: 'Błąd serwera: ' + err.message });
  }
}
