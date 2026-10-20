import { generateOrParseQuiz } from '../../src/lib/geminiQuizService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket?.remoteAddress || 'unknown';

  const customApiKey =
    (typeof req.headers?.['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : '') ||
    req.body?.apiKey;

  const result = await generateOrParseQuiz(req.body || {}, {
    authHeader: req.headers?.authorization,
    clientId: req.headers?.['x-client-id'],
    apiKey: customApiKey ? customApiKey.trim() : undefined,
    ip,
  });

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json(result.data);
}
