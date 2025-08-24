import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
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

app.use('/api', buildApi(io));
const publicDir = path.join(__dirname, '../../web-public');
app.use(express.static(publicDir));
app.get('/healthz', (req,res)=>res.json({ok:true}));

setupSockets(io);

server.listen(config.port, ()=>{
  console.log('Servidor em http://localhost:'+config.port);
});