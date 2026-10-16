import express from 'express';
import http from 'http';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
let activeServerPort = PORT;

app.use(express.json({ limit: '10mb' }));

function getLocalLanIp(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

app.get('/api/network-info', (_req, res) => {
  res.json({
    lanIp: getLocalLanIp(),
    port: activeServerPort,
  });
});

import { parseEducationalTextToQuestions } from './src/lib/quizParser';

// Lazy client helper: only instantiates GoogleGenAI when an API key is actually provided
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint: Generate or organize quiz questions with Gemini, including fallback models and graceful recovery
app.post('/api/gemini/generate-quiz', async (req, res) => {
  const { mode, text, questionType = 'mixed', count = 5, defaultTimeLimit = 20 } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'O texto ou tema deve ser fornecido.' });
  }

  const ai = getGeminiClient();

  // If no Gemini API key is configured in .env:
  if (!ai) {
    if (mode === 'paste') {
      console.log('Gemini API key não configurada: usando extrator local de perguntas.');
      const parsed = parseEducationalTextToQuestions(text, questionType, defaultTimeLimit);
      return res.json(parsed);
    } else {
      return res.status(400).json({
        error:
          'Para gerar questionários automáticos por tema com a IA Gemini, configure a variável GEMINI_API_KEY no arquivo .env. Se preferir, use a aba "Colar Questões" que funciona 100% offline!',
      });
    }
  }

  const formatDescription =
    questionType === 'boolean'
      ? "APENAS perguntas de 'Verdadeiro ou Falso'. Cada pergunta DEVE ter type 'boolean', options: ['Verdadeiro', 'Falso'], e correctAnswer sendo exatamente 'Verdadeiro' ou 'Falso'."
      : questionType === 'multiple'
      ? "APENAS perguntas de 'Múltipla Escolha'. Cada pergunta DEVE ter type 'multiple', exatamente 4 opções de resposta em options, e correctAnswer com o texto exato da alternativa correta."
      : "Uma mistura equilibrada de perguntas de 'Verdadeiro ou Falso' (type: 'boolean', options: ['Verdadeiro', 'Falso']) e 'Múltipla Escolha' (type: 'multiple', 4 opções em options).";

  const prompt =
    mode === 'paste'
      ? `O professor colou o seguinte material/anotação com perguntas e respostas para um quiz escolar:\n\n"""\n${text.trim()}\n"""\n\nInstrução: Organize e monte as perguntas a partir desse conteúdo fornecido com total fidelidade aos fatos e respostas indicadas. Formato desejado: ${formatDescription}. Quantidade sugerida: ${count} perguntas. Tempo padrão: ${defaultTimeLimit} segundos por questão.`
      : `O professor solicitou a criação de um quiz educativo sobre o seguinte tema:\n\n"""\n${text.trim()}\n"""\n\nInstrução: Crie ${count} perguntas de alta qualidade pedagógica, com enunciados claros e interessantes. Formato desejado: ${formatDescription}. Tempo padrão: ${defaultTimeLimit} segundos por questão.`;

  const config = {
    systemInstruction: `Você é um assistente pedagógico especializado em criar quizzes interativos para salas de aula brasileiras.
Siga com rigor:
1. Respeite com absoluta fidelidade as informações e gabaritos fornecidos quando o professor colar um texto existente.
2. Cada pergunta DEVE conter:
   - type: 'boolean' (Verdadeiro ou Falso) ou 'multiple' (Múltipla Escolha)
   - question: Enunciado claro, objetivo e contextualizado
   - options: Se boolean, ['Verdadeiro', 'Falso']. Se multiple, exatamente 4 alternativas claras.
   - correctAnswer: String idêntica à opção correta
   - timeLimit: Tempo em segundos (ex: 15, 20 ou 30)
   - points: 1000
   - explanation: Justificativa pedagógica concisa (1 ou 2 frases) explicando a resposta correta para ser exibida no telão da sala.
3. Responda em Português do Brasil com excelente qualidade didática.`,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título recomendado para o quiz' },
        subject: { type: Type.STRING, description: 'Área do conhecimento ou disciplina' },
        description: { type: Type.STRING, description: 'Descrição sucinta das instruções aos alunos' },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "'boolean' ou 'multiple'" },
              question: { type: Type.STRING, description: 'Enunciado da pergunta' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Opções de resposta (['Verdadeiro', 'Falso'] ou 4 opções)",
              },
              correctAnswer: { type: Type.STRING, description: 'Texto da opção correta' },
              timeLimit: { type: Type.INTEGER, description: 'Tempo em segundos' },
              points: { type: Type.INTEGER, description: 'Pontuação da pergunta' },
              explanation: { type: Type.STRING, description: 'Justificativa pedagógica' },
            },
            required: ['type', 'question', 'options', 'correctAnswer', 'timeLimit', 'points', 'explanation'],
          },
        },
      },
      required: ['title', 'subject', 'questions'],
    },
  };

  // Supported model candidates for resilience during demand spikes
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let parsed: any = null;
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      console.log(`Trying Gemini model ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const rawJson = response.text?.trim() || '{}';
      parsed = JSON.parse(rawJson);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        console.log(`Success with model ${model}`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} unavailable (status ${err?.status || err?.code || 'err'}).`);
      // Short backoff before trying next model
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // If Gemini models are experiencing high demand (503) and user provided pasted text, use local parser
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    if (mode === 'paste') {
      console.log('Gemini API busy: using local faithful text parser fallback.');
      parsed = parseEducationalTextToQuestions(text, questionType, defaultTimeLimit);
    } else {
      const is503 = lastError?.status === 503 || String(lastError?.message).includes('high demand') || String(lastError?.message).includes('503');
      const errorMessage = is503
        ? 'A IA Gemini está temporariamente com alta demanda no momento. Por favor, aguarde alguns segundos e clique em Tentar Novamente.'
        : lastError?.message || 'Falha ao processar perguntas com a IA. Tente novamente em instantes.';
      return res.status(503).json({ error: errorMessage });
    }
  }

  // Ensure unique IDs and valid defaults
  if (Array.isArray(parsed.questions)) {
    parsed.questions = parsed.questions.map((q: any, idx: number) => ({
      ...q,
      id: 'q_ai_' + Date.now().toString(36) + '_' + idx + '_' + Math.random().toString(36).substring(2, 5),
      points: q.points || 1000,
      timeLimit: q.timeLimit || defaultTimeLimit,
      options:
        q.type === 'boolean'
          ? ['Verdadeiro', 'Falso']
          : Array.isArray(q.options) && q.options.length >= 2
          ? q.options.slice(0, 4)
          : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correctAnswer:
        q.type === 'boolean'
          ? q.correctAnswer?.toLowerCase().includes('verdadeiro')
            ? 'Verdadeiro'
            : 'Falso'
          : q.correctAnswer,
    }));
  }

  return res.json(parsed);
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  let currentPort = Number(process.env.PORT) || PORT;

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Porta ${currentPort} ocupada. Alternando automaticamente para a porta ${currentPort + 1}...`);
      currentPort += 1;
      httpServer.listen(currentPort, '0.0.0.0');
    } else {
      throw err;
    }
  });

  httpServer.listen(currentPort, '0.0.0.0', () => {
    activeServerPort = currentPort;
    const lanIp = getLocalLanIp();
    console.log(`Valendo Live full-stack server running on http://localhost:${currentPort}`);
    if (lanIp) {
      console.log(`Acesso na rede local (Wi-Fi/Celular): http://${lanIp}:${currentPort}`);
    }
  });
}

startServer();
