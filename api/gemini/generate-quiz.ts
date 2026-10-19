import { generateOrParseQuiz } from '../../src/lib/geminiQuizService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await generateOrParseQuiz(req.body || {});
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json(result.data);
}
