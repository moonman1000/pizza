// apps/server/src/server.js
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from './config.js';
import { buildApi } from './routes.js';
import { setupSockets } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.appBaseUrl, credentials: true } });

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.appBaseUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// APIs
app.use('/api', buildApi(io));

// *** Detectar caminho correto para web-public (compatível com local e Render)
let publicDir = path.resolve(__dirname, '../../../web-public');
console.log('[static] Tentando publicDir =', publicDir);

// Verificar se a pasta existe, senão tentar caminho alternativo
if (!fs.existsSync(publicDir)) {
    console.log('[static] Pasta não encontrada, tentando caminho alternativo...');
    const altPublicDir = path.resolve(__dirname, '../../web-public');
    if (fs.existsSync(altPublicDir)) {
        publicDir = altPublicDir;
        console.log('[static] Usando caminho alternativo:', publicDir);
    } else {
        console.error('[static] ERRO: Pasta web-public não encontrada em nenhum caminho!');
        console.log('[static] Caminhos testados:');
        console.log('  -', path.resolve(__dirname, '../../../web-public'));
        console.log('  -', path.resolve(__dirname, '../../web-public'));
    }
} else {
    console.log('[static] ✅ Pasta web-public encontrada:', publicDir);
}

app.use(express.static(publicDir));

// *** rota raiz: serve o index.html ou redireciona para loja.html
app.get('/', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    const lojaPath = path.join(publicDir, 'loja.html');
    
    // Verificar se index.html existe
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else if (fs.existsSync(lojaPath)) {
        // Se não tiver index.html, redirecionar para loja.html
        res.redirect('/loja.html');
    } else {
        // Página de boas-vindas se não encontrar nenhum arquivo
        res.send(`
            <html>
            <head>
                <title>🍕 PIZZAPYE - Server Online!</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #e74c3c; text-align: center; }
                    ul { list-style: none; padding: 0; }
                    li { margin: 10px 0; }
                    a { display: block; padding: 15px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; text-align: center; }
                    a:hover { background: #2980b9; }
                    .status { text-align: center; color: #27ae60; margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🍕 PIZZAPYE</h1>
                    <div class="status">✅ Servidor funcionando perfeitamente!</div>
                    <p><strong>Páginas disponíveis:</strong></p>
                    <ul>
                        <li><a href="/admin.html">📊 Admin</a></li>
                        <li><a href="/loja.html">🛒 Loja</a></li>
                        <li><a href="/motorista.html">🏍️ Motorista</a></li>
                        <li><a href="/rastrearpedido.html">📦 Rastrear Pedido</a></li>
                    </ul>
                    <p style="text-align: center; color: #666; margin-top: 30px;">
                        Pasta estática: <code>${publicDir}</code>
                    </p>
                </div>
            </body>
            </html>
        `);
    }
});

// health check
app.get('/healthz', (req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

// sockets
setupSockets(io);

// start - usar PORT do ambiente (Render) ou 3000 local
const PORT = process.env.PORT || config.port || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🍕 PIZZAPYE Server iniciado!');
    console.log('📡 Servidor em http://localhost:' + PORT);
    console.log('📁 Servindo arquivos estáticos de:', publicDir);
    console.log('🌍 Ambiente:', process.env.NODE_ENV || 'development');
});
