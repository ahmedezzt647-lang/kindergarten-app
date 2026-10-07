const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// إنشاء قاعدة بيانات محلية دائمة ومستقرة على ملف داخل السيرفر
const db = new Database('database.sqlite');

// إنشـاء الجداول تلقائياً إذا لم تكن موجودة
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT,
    grade TEXT,
    parent_phone TEXT,
    join_date TEXT,
    monthlyFee TEXT,
    discount TEXT,
    paid TEXT
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    studentName TEXT,
    amount TEXT,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    title TEXT,
    amount TEXT,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS attendance (
    studentId TEXT,
    status TEXT,
    date TEXT,
    time TEXT
  );
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    studentId TEXT,
    studentName TEXT,
    title TEXT,
    price TEXT,
    date TEXT
  );
`);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- الطلاب ---
app.get('/api/students', (req, res) => {
  const rows = db.prepare('SELECT * FROM students').all();
  res.json(rows);
});

app.post('/api/students', (req, res) => {
  const student = { 
    id: Date.now().toString(), 
    name: req.body.name || '',
    grade: req.body.className || req.body.grade || 'تمهيدي',
    parent_phone: req.body.phone || req.body.parent_phone || '',
    join_date: req.body.joinDate || req.body.join_date || new Date().toISOString().split('T')[0],
    monthlyFee: req.body.monthlyFee || '0',
    discount: req.body.discount || '0',
    paid: req.body.paid || '0'
  };
  
  db.prepare('INSERT INTO students (id, name, grade, parent_phone, join_date, monthlyFee, discount, paid) VALUES (@id, @name, @grade, @parent_phone, @join_date, @monthlyFee, @discount, @paid)').run(student);
  
  if (parseFloat(req.body.paid) > 0) {
    const payment = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      studentName: student.name,
      amount: parseFloat(req.body.paid),
      date: new Date().toISOString().split('T')[0]
    };
    db.prepare('INSERT INTO payments (id, studentName, amount, date) VALUES (@id, @studentName, @amount, @date)').run(payment);
  }
  res.json(student);
});

app.delete('/api/students/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- المقبوضات والدفعات ---
app.get('/api/payments', (req, res) => {
  const rows = db.prepare('SELECT * FROM payments').all();
  res.json(rows);
});

app.post('/api/students/pay', (req, res) => {
  const { id, amount, studentName } = req.body;
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  if (student) {
    const newPaid = (parseFloat(student.paid) || 0) + parseFloat(amount);
    db.prepare('UPDATE students SET paid = ? WHERE id = ?').run(newPaid, id);
    
    const payment = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      studentName: studentName || student.name,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0]
    };
    db.prepare('INSERT INTO payments (id, studentName, amount, date) VALUES (@id, @studentName, @amount, @date)').run(payment);
  }
  res.json({ success: true });
});

// --- المصروفات ---
app.get('/api/expenses', (req, res) => {
  const rows = db.prepare('SELECT * FROM expenses').all();
  res.json(rows);
});

app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), title: req.body.title || '', amount: req.body.amount || '0', date: req.body.date || new Date().toISOString().split('T')[0] };
  db.prepare('INSERT INTO expenses (id, title, amount, date) VALUES (@id, @title, @amount, @date)').run(expense);
  res.json(expense);
});

app.delete('/api/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- الحضور والغياب ---
app.get('/api/attendance', (req, res) => {
  const rows = db.prepare('SELECT * FROM attendance').all();
  res.json(rows);
});

app.post('/api/attendance', (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ar-EG');
  
  db.prepare('DELETE FROM attendance WHERE studentId = ? AND date = ?').run(studentId, today);
  db.prepare('INSERT INTO attendance (studentId, status, date, time) VALUES (?, ?, ?, ?)').run(studentId, status, today, time);
  res.json({ success: true });
});

// --- الكتب ---
app.get('/api/books', (req, res) => {
  const rows = db.prepare('SELECT * FROM books').all();
  res.json(rows);
});

app.post('/api/books', (req, res) => {
  const book = { id: Date.now().toString(), studentId: req.body.studentId || '', studentName: req.body.studentName || '', title: req.body.title || '', price: req.body.price || '0', date: req.body.date || new Date().toISOString().split('T')[0] };
  db.prepare('INSERT INTO books (id, studentId, studentName, title, price, date) VALUES (@id, @studentId, @studentName, @title, @price, @date)').run(book);
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
