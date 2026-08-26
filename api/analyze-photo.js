export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Analyze this photo from a cleaning service job. Report:
1. Area/Room (be specific)
2. Condition (clean/dirty/damaged/needs_work)
3. Is this scope creep? (YES if extra work beyond standard cleaning, NO if normal)
4. Confidence level (HIGH/MEDIUM/LOW)
5. Recommended action

Format exactly as: AREA: [name] | CONDITION: [status] | SCOPE CREEP: [YES/NO] | CONFIDENCE: [HIGH/MEDIUM/LOW] | ACTION: [recommendation]`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Claude');
    }

    res.status(200).json({
      success: true,
      analysis: data.content[0].text
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
