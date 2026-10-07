const express = require('express');
const { createClient } = require('@supabase/supabase-js');
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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;

// بيانات احتياطية لضمان عدم ظهور الجداول فارغة أبداً
let fallbackDb = {
  students: [
    { id: '1', name: 'أحمد محمد', grade: 'تمهيدي', parent_phone: '0501234567', join_date: '2026-01-01', monthlyFee: '500', discount: '0', paid: '500' }
  ],
  payments: [
    { id: '1001', studentName: 'أحمد محمد', amount: '500', date: '2026-01-01' }
  ],
  expenses: [
    { id: '1', title: 'إيجار المقر', amount: '2000', date: '2026-01-01' }
  ],
  attendance: [],
  books: []
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/students', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('students').select('*');
      if (!error && data && data.length > 0) return res.json(data);
    }
  } catch (e) {}
  res.json(fallbackDb.students);
});

app.post('/api/students', async (req, res) => {
  const student = { 
    id: Date.now().toString(), 
    name: req.body.name,
    grade: req.body.className || req.body.grade || 'تمهيدي',
    parent_phone: req.body.phone || req.body.parent_phone || '',
    join_date: req.body.joinDate || req.body.join_date || new Date().toISOString().split('T')[0],
    monthlyFee: req.body.monthlyFee || '0',
    discount: req.body.discount || '0',
    paid: req.body.paid || '0'
  };
  fallbackDb.students.push(student);
  if (parseFloat(req.body.paid) > 0) {
    fallbackDb.payments.push({ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: req.body.name, amount: parseFloat(req.body.paid), date: new Date().toISOString().split('T')[0] });
  }
  try {
    if (supabase) {
      await supabase.from('students').insert([student]);
      if (parseFloat(req.body.paid) > 0) {
        await supabase.from('payments').insert([{ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: req.body.name, amount: parseFloat(req.body.paid), date: new Date().toISOString().split('T')[0] }]);
      }
    }
  } catch (e) {}
  res.json(student);
});

app.delete('/api/students/:id', async (req, res) => {
  fallbackDb.students = fallbackDb.students.filter(s => s.id !== req.params.id);
  try {
    if (supabase) await supabase.from('students').delete().eq('id', req.params.id);
  } catch (e) {}
  res.json({ success: true });
});

app.get('/api/payments', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('payments').select('*');
      if (!error && data && data.length > 0) return res.json(data);
    }
  } catch (e) {}
  res.json(fallbackDb.payments);
});

app.post('/api/students/pay', async (req, res) => {
  const { id, amount, studentName } = req.body;
  const s = fallbackDb.students.find(x => x.id === id);
  if (s) {
    s.paid = (parseFloat(s.paid) || 0) + parseFloat(amount);
    fallbackDb.payments.push({ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: studentName || s.name, amount: parseFloat(amount), date: new Date().toISOString().split('T')[0] });
  }
  try {
    if (supabase) {
      const { data } = await supabase.from('students').select('*').eq('id', id).single();
      if (data) {
        const newPaid = (parseFloat(data.paid) || 0) + parseFloat(amount);
        await supabase.from('students').update({ paid: newPaid }).eq('id', id);
        await supabase.from('payments').insert([{ id: Math.floor(1000 + Math.random() * 9000).toString(), studentName: studentName || data.name, amount: parseFloat(amount), date: new Date().toISOString().split('T')[0] }]);
      }
    }
  } catch (e) {}
  res.json({ success: true });
});

app.get('/api/expenses', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('expenses').select('*');
      if (!error && data && data.length > 0) return res.json(data);
    }
  } catch (e) {}
  res.json(fallbackDb.expenses);
});

app.post('/api/expenses', async (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  fallbackDb.expenses.push(expense);
  try {
    if (supabase) await supabase.from('expenses').insert([expense]);
  } catch (e) {}
  res.json(expense);
});

app.delete('/api/expenses/:id', async (req, res) => {
  fallbackDb.expenses = fallbackDb.expenses.filter(e => e.id !== req.params.id);
  try {
    if (supabase) await supabase.from('expenses').delete().eq('id', req.params.id);
  } catch (e) {}
  res.json({ success: true });
});

app.get('/api/attendance', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('attendance').select('*');
      if (!error && data) return res.json(data);
    }
  } catch (e) {}
  res.json(fallbackDb.attendance);
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ar-EG');
  fallbackDb.attendance = fallbackDb.attendance.filter(a => !(a.studentId === studentId && a.date === today));
  fallbackDb.attendance.push({ studentId, status, date: today, time });
  try {
    if (supabase) {
      await supabase.from('attendance').delete().eq('studentId', studentId).eq('date', today);
      await supabase.from('attendance').insert([{ studentId, status, date: today, time }]);
    }
  } catch (e) {}
  res.json({ success: true });
});

app.get('/api/books', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('books').select('*');
      if (!error && data) return res.json(data);
    }
  } catch (e) {}
  res.json(fallbackDb.books);
});

app.post('/api/books', async (req, res) => {
  const book = { id: Date.now().toString(), ...req.body };
  fallbackDb.books.push(book);
  try {
    if (supabase) await supabase.from('books').insert([book]);
  } catch (e) {}
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  fallbackDb.books = fallbackDb.books.filter(b => b.id !== req.params.id);
  try {
    if (supabase) await supabase.from('books').delete().eq('id', req.params.id);
  } catch (e) {}
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
