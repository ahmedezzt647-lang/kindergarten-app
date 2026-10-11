const express = require('express');
const mongoose = require('mongoose');
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

// ====== الاتصال بقاعدة البيانات ======
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ahmedezzt647_db_user:9bzkHHpQHewrlz4K@cluster0.j3dytch.mongodb.net/kindergarten?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB متصل'))
  .catch(err => console.error('❌ خطأ في الاتصال:', err));

// ====== النماذج (Schemas) ======
const studentSchema = new mongoose.Schema({
  id: String,
  name: String,
  grade: String,
  parent_phone: String,
  join_date: String,
  monthlyFee: String,
  discount: { type: String, default: '0' },
  paid: { type: String, default: '0' },
  status: { type: String, default: 'active' }
});

const paymentSchema = new mongoose.Schema({
  id: String,
  studentName: String,
  amount: Number,
  date: String
});

const expenseSchema = new mongoose.Schema({
  id: String,
  title: String,
  amount: Number,
  date: String
});

const attendanceSchema = new mongoose.Schema({
  studentId: String,
  status: String,
  date: String,
  time: String
});

const bookSchema = new mongoose.Schema({
  id: String,
  studentId: String,
  studentName: String,
  title: String,
  price: String,
  date: String
});

const Student   = mongoose.model('Student',   studentSchema);
const Payment   = mongoose.model('Payment',   paymentSchema);
const Expense   = mongoose.model('Expense',   expenseSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Book      = mongoose.model('Book',      bookSchema);

// ====== الصفحة الرئيسية ======
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ====== الطلاب ======
app.get('/api/students', async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.post('/api/students', async (req, res) => {
  const student = new Student({ id: Date.now().toString(), status: 'active', ...req.body });
  await student.save();
  if (parseFloat(req.body.paid) > 0) {
    const payment = new Payment({
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      studentName: req.body.name,
      amount: parseFloat(req.body.paid),
      date: new Date().toISOString().split('T')[0]
    });
    await payment.save();
  }
  res.json(student);
});

app.delete('/api/students/:id', async (req, res) => {
  await Student.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

app.put('/api/students/status/:id', async (req, res) => {
  await Student.updateOne({ id: req.params.id }, { status: req.body.status });
  res.json({ success: true });
});

// ====== المدفوعات ======
app.get('/api/payments', async (req, res) => {
  const payments = await Payment.find();
  res.json(payments);
});

app.post('/api/students/pay', async (req, res) => {
  const { id, amount, studentName } = req.body;
  const s = await Student.findOne({ id });
  if (s) {
    s.paid = String((parseFloat(s.paid) || 0) + parseFloat(amount));
    await s.save();
    const payment = new Payment({
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      studentName: studentName || s.name,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0]
    });
    await payment.save();
  }
  res.json({ success: true });
});

app.delete('/api/payments/:id', async (req, res) => {
  await Payment.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ====== المصروفات ======
app.get('/api/expenses', async (req, res) => {
  const expenses = await Expense.find();
  res.json(expenses);
});

app.post('/api/expenses', async (req, res) => {
  const exp = new Expense({ id: Date.now().toString(), ...req.body });
  await exp.save();
  res.json(exp);
});

app.delete('/api/expenses/:id', async (req, res) => {
  await Expense.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ====== الحضور ======
app.get('/api/attendance', async (req, res) => {
  const attendance = await Attendance.find();
  res.json(attendance);
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  await Attendance.deleteOne({ studentId, date: today });
  const att = new Attendance({
    studentId, status, date: today,
    time: new Date().toLocaleTimeString('ar-EG')
  });
  await att.save();
  res.json({ success: true });
});

// ====== الكتب ======
app.get('/api/books', async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

app.post('/api/books', async (req, res) => {
  const book = new Book({ id: Date.now().toString(), ...req.body });
  await book.save();
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  await Book.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
