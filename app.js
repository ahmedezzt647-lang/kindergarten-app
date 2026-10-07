const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// هذا الملف البسيط يعمل كـ API وهمي مستقر تماماً يمنع أي توقف أو اختفاء للأعمدة
app.get('/api/students', (req, res) => res.json([]));
app.post('/api/students', (req, res) => res.json({ id: Date.now().toString(), ...req.body }));
app.delete('/api/students/:id', (req, res) => res.json({ success: true }));

app.get('/api/payments', (req, res) => res.json([]));
app.post('/api/students/pay', (req, res) => res.json({ success: true }));

app.get('/api/expenses', (req, res) => res.json([]));
app.post('/api/expenses', (req, res) => res.json({ id: Date.now().toString(), ...req.body }));
app.delete('/api/expenses/:id', (req, res) => res.json({ success: true }));

app.get('/api/attendance', (req, res) => res.json([]));
app.post('/api/attendance', (req, res) => res.json({ success: true }));

app.get('/api/books', (req, res) => res.json([]));
app.post('/api/books', (req, res) => res.json({ id: Date.now().toString(), ...req.body }));
app.delete('/api/books/:id', (req, res) => res.json({ success: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
