

require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const http      = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
    ].filter(Boolean),
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
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
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
