const express = require('express');
const cors = require('cors');

const app = express();

// تفعيل CORS واستقبال بيانات JSON
app.use(cors());
app.use(express.json());

// مصفوفات لحفظ البيانات محلياً داخل السيرفر
let students = [];
let expenses = [];

// الصفحة الرئيسية لتأكيد عمل السيرفر
app.get('/', (req, res) => {
  res.send('Server is running smoothly!');
});

// --- مسارات الطلاب (Students API) ---

// جلب كافة الطلاب
app.get('/api/students', (req, res) => {
  res.json(students);
});

// إضافة طالب جديد
app.post('/api/students', (req, res) => {
  try {
    const student = { id: Date.now().toString(), ...req.body };
    students.push(student);
    res.json({ message: 'تم حفظ الطالب بنجاح', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تسديد دفعة للطفل
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

// --- مسارات المصروفات (Expenses API) ---

// جلب كافة المصروفات
app.get('/api/expenses', (req, res) => {
  res.json(expenses);
});

// إضافة مصروف جديد
app.post('/api/expenses', (req, res) => {
  try {
    const expense = { id: Date.now().toString(), ...req.body };
    expenses.push(expense);
    res.json({ message: 'تم حفظ المصروف بنجاح', expense });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تحديد المنفذ وتشغيل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
