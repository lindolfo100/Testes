import express from 'express';
import http from 'http';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateOrParseQuiz } from './src/lib/geminiQuizService';

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

app.post('/api/gemini/generate-quiz', async (req, res) => {
  const result = await generateOrParseQuiz(req.body || {});
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json(result.data);
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
      console.warn(
        `Porta ${currentPort} ocupada. Alternando automaticamente para a porta ${currentPort + 1}...`
      );
      currentPort += 1;
      httpServer.listen(currentPort, '0.0.0.0');
    } else {
      throw err;
    }
  });

  httpServer.listen(currentPort, '0.0.0.0', () => {
    activeServerPort = currentPort;
    const lanIp = getLocalLanIp();
    console.log(`Valendo! Live server running on http://localhost:${currentPort}`);
    if (lanIp) {
      console.log(`Acesso na rede local (Wi-Fi/Celular): http://${lanIp}:${currentPort}`);
    }
  });
}

startServer();
