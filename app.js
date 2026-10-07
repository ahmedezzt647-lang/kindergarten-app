const express = require('express');
const path = require('path');
const app = express();

// تفعيل استقبال البيانات والتعامل مع CORS
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// عرض ملفات الواجهة المباشرة (مثل index.html و CSS و JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// مصفوفات البيانات محلياً
let students = [];
let expenses = [];

// فتح صفحة الواجهة المباشرة عند دخول الرابط الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API الطلاب ---
app.get('/api/students', (req, res) => {
  res.json(students);
});

app.post('/api/students', (req, res) => {
  try {
    const student = { id: Date.now().toString(), ...req.body };
    students.push(student);
    res.json({ message: 'تم حفظ الطالب بنجاح', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students/pay', (req, res) => {
  try {
    const { id, amount } = req.body;
    const student = students.find(s => s.id === id);
    if (student) {
      student.paid = (parseFloat(student.paid) || 0) + parseFloat(amount);
      res.json({ message: 'تم تحديث الدفعة بنجاح', student });
    } else {
      res.status(404).json({ error: 'الطالب غير موجود' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API المصروفات ---
app.get('/api/expenses', (req, res) => {
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  try {
    const expense = { id: Date.now().toString(), ...req.body };
    expenses.push(expense);
    res.json({ message: 'تم حفظ المصروف بنجاح', expense });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
