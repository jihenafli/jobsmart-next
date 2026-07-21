require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const http      = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);

// ── Origines autorisées (env + fallback en dur pour la prod) ──
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://jobsmart-next.vercel.app', // fallback en dur si FRONTEND_URL n'est pas défini sur Render
].filter(Boolean);

// ── Socket.io ──
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Rendre io disponible dans les routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connecté: ${socket.id}`);
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => console.log(`🔌 Client déconnecté: ${socket.id}`));
});

// ── Middleware ──
app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origin (ex: Postman, curl, apps mobiles)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqué pour origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Répond explicitement aux préflights OPTIONS pour toutes les routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ── Routes ──
const { authRouter, cvRouter, jobsRouter, appRouter, payRouter } = require('./routes/index');
app.use('/api/auth',         authRouter);
app.use('/api/cv',           cvRouter);
app.use('/api/jobs',         jobsRouter);
app.use('/api/applications', appRouter);
app.use('/api/payments',     payRouter);
app.use('/api/cv',    require('./routes/cv-advanced')); // scan, chat, optimize

app.get('/api/health', (req, res) => res.json({ status: 'OK', version: '4.0.0', agents: ['Resume', 'Hunter', 'Apply', 'Email', 'Coach', 'Analytics'] }));


// ── MongoDB ──
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobsmart')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB:', err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 JobSmart AI OS v4 — Port ${PORT}`));

// require('dotenv').config();
// const express   = require('express');
// const mongoose  = require('mongoose');
// const cors      = require('cors');
// const rateLimit = require('express-rate-limit');
// const http      = require('http');
// const { Server } = require('socket.io');

// // const app    = express();
// const server = http.createServer(app);

// // ── Socket.io ──
// const io = new Server(server, {
//   cors: {
//     origin: [
//       process.env.FRONTEND_URL,
//       'http://localhost:3000',
//     ].filter(Boolean),
//     methods: ['GET', 'POST'],
//   },
// });

// // Rendre io disponible dans les routes
// app.set('io', io);

// io.on('connection', (socket) => {
//   console.log(`🔌 Client connecté: ${socket.id}`);
//   socket.on('join', (userId) => socket.join(userId));
//   socket.on('disconnect', () => console.log(`🔌 Client déconnecté: ${socket.id}`));
// });

// // ── Middleware ──
// app.set('trust proxy', 1);

// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     process.env.FRONTEND_URL,
//   ].filter(Boolean),
//   credentials: true,
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// // ── Routes ──
// const { authRouter, cvRouter, jobsRouter, appRouter, payRouter } = require('./routes/index');
// app.use('/api/auth',         authRouter);
// app.use('/api/cv',           cvRouter);
// app.use('/api/jobs',         jobsRouter);
// app.use('/api/applications', appRouter);
// app.use('/api/payments',     payRouter);
// app.use('/api/cv',    require('./routes/cv-advanced')); // scan, chat, optimize

// app.get('/api/health', (req, res) => res.json({ status: 'OK', version: '4.0.0', agents: ['Resume', 'Hunter', 'Apply', 'Email', 'Coach', 'Analytics'] }));


// // ── MongoDB ──
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobsmart')
//   .then(() => console.log('✅ MongoDB connecté'))
//   .catch(err => console.error('❌ MongoDB:', err.message));

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`🚀 JobSmart AI OS v4 — Port ${PORT}`));
