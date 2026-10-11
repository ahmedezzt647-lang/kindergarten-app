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

// قاعدة بيانات داخل ذاكرة السيرفر النشطة والمضمونة
let db = {
  students: [
    { id: '1', name: 'ابراهيم محمد', grade: '2', parent_phone: '05681033655', join_date: '2026-09-15', monthlyFee: '200', discount: '0', paid: '0', status: 'active' }
  ],
  payments: [],
  expenses: [],
  attendance: [],
  books: []
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// الطلاب
app.get('/api/students', (req, res) => res.json(db.students));
app.post('/api/students', (req, res) => {
  const student = { id: Date.now().toString(), status: 'active', ...req.body };
  db.students.push(student);
  if (parseFloat(req.body.paid) > 0) {
    db.payments.push({ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: req.body.name, amount: parseFloat(req.body.paid), date: new Date().toISOString().split('T')[0] });
  }
  res.json(student);
});
app.delete('/api/students/:id', (req, res) => {
  db.students = db.students.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});
app.put('/api/students/status/:id', (req, res) => {
  const s = db.students.find(x => x.id === req.params.id);
  if (s) { s.status = req.body.status; }
  res.json({ success: true });
});

// المقبوضات والدفعات
app.get('/api/payments', (req, res) => res.json(db.payments));
app.post('/api/students/pay', (req, res) => {
  const { id, amount, studentName } = req.body;
  const s = db.students.find(x => x.id === id);
  if (s) {
    s.paid = (parseFloat(s.paid) || 0) + parseFloat(amount);
    db.payments.push({ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: studentName || s.name, amount: parseFloat(amount), date: new Date().toISOString().split('T')[0] });
  }
  res.json({ success: true });
});

// المصروفات
app.get('/api/expenses', (req, res) => res.json(db.expenses));
app.post('/api/expenses', (req, res) => {
  const exp = { id: Date.now().toString(), ...req.body };
  db.expenses.push(exp);
  res.json(exp);
});
app.delete('/api/expenses/:id', (req, res) => {
  db.expenses = db.expenses.filter(e => e.id !== req.params.id);
  res.json({ success: true });
});

// الحضور
app.get('/api/attendance', (req, res) => res.json(db.attendance));
app.post('/api/attendance', (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  db.attendance = db.attendance.filter(a => !(a.studentId === studentId && a.date === today));
  db.attendance.push({ studentId, status, date: today, time: new Date().toLocaleTimeString('ar-EG') });
  res.json({ success: true });
});

// الكتب
app.get('/api/books', (req, res) => res.json(db.books));
app.post('/api/books', (req, res) => {
  const book = { id: Date.now().toString(), ...req.body };
  db.books.push(book);
  res.json(book);
});
app.delete('/api/books/:id', (req, res) => {
  db.books = db.books.filter(b => b.id !== req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
