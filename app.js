const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// مصفوفات حفظ البيانات محلياً
let students = [];
let expenses = [];

// عرض واجهة نظام الروضة مباشرة
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>نظام إدارة ومحاسبة الروضة</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { text-align: center; color: #2c3e50; }
      .stats-cards { display: flex; gap: 10px; margin-bottom: 25px; }
      .card { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; border: 1px solid #ddd; }
      .card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
      .card .number { font-size: 20px; font-weight: bold; color: #2c3e50; }
      .section-title { font-size: 18px; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #27ae60; color: #27ae60; }
      .form-group { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
      input, select, button { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
      input { flex: 1; min-width: 150px; }
      button { background: #27ae60; color: white; border: none; cursor: pointer; font-weight: bold; }
      button.btn-expense { background: #e74c3c; }
      button:hover { opacity: 0.9; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 14px; }
      th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>نظام إدارة ومحاسبة الروضة</h1>
      
      <div class="stats-cards">
        <div class="card"><h3>إجمالي الطلاب</h3><div class="number" id="total-students">0</div></div>
        <div class="card"><h3>إجمالي الإيرادات</h3><div class="number" id="total-revenue">0 ر.س</div></div>
        <div class="card"><h3>إجمالي المصروفات</h3><div class="number" id="total-expenses">0 ر.س</div></div>
        <div class="card"><h3>صافي الربح / الخسارة</h3><div class="number" id="net-profit">0 ر.س</div></div>
      </div>

      <div class="section-title">💸 تسجيل المصروفات (رواتب، إيجار، أدوات...)</div>
      <div class="form-group">
        <input type="text" id="exp-title" placeholder="بند المصروف (مثلاً: نظافة)">
        <input type="number" id="exp-amount" placeholder="المبلغ (ر.س)">
        <input type="date" id="exp-date">
        <button class="btn-expense" onclick="addExpense()">إضافة مصروف</button>
      </div>
      <table>
        <thead><tr><th>البند</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
        <tbody id="expenses-table"></tbody>
      </table>

      <div class="section-title">👶 إدارة إيرادات الأطفال والرسوم</div>
      <div class="form-group">
        <input type="text" id="std-name" placeholder="اسم الطفل">
        <input type="text" id="std-class" placeholder="الصف / المستوى">
        <input type="text" id="std-phone" placeholder="رقم هاتف ولي الأمر">
        <input type="number" id="std-total" placeholder="الرسوم الإجمالية">
        <input type="number" id="std-paid" placeholder="المبلغ المدفوع">
        <button onclick="addStudent()">إضافة طالب</button>
      </div>
      <table>
        <thead><tr><th>الاسم</th><th>الصف</th><th>رقم الولي</th><th>الرسوم</th><th>المدفوع</th><th>المتبقي</th></tr></thead>
        <tbody id="students-table"></tbody>
      </table>
    </div>

    <script>
      document.getElementById('exp-date').valueAsDate = new Date();

      async function fetchData() {
        const resExp = await fetch('/api/expenses');
        const expenses = await resExp.json();
        const resStd = await fetch('/api/students');
        const students = await resStd.json();
        
        renderExpenses(expenses);
        renderStudents(students);
        updateStats(expenses, students);
      }

      function renderExpenses(data) {
        const tbody = document.getElementById('expenses-table');
        tbody.innerHTML = data.map(e => \`<tr><td>\${e.title}</td><td>\${e.amount} ر.س</td><td>\${e.date || '-'}</td></tr>\`).join('');
      }

      function renderStudents(data) {
        const tbody = document.getElementById('students-table');
        tbody.innerHTML = data.map(s => {
          const remaining = (s.total || 0) - (s.paid || 0);
          return \`<tr><td>\${s.name}</td><td>\${s.className}</td><td>\${s.phone}</td><td>\${s.total}</td><td>\${s.paid}</td><td>\${remaining}</td></tr>\`;
        }).join('');
      }

      function updateStats(expenses, students) {
        document.getElementById('total-students').innerText = students.length;
        const totalExp = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const totalRev = students.reduce((acc, curr) => acc + Number(curr.paid || 0), 0);
        document.getElementById('total-expenses').innerText = totalExp + ' ر.س';
        document.getElementById('total-revenue').innerText = totalRev + ' ر.س';
        document.getElementById('net-profit').innerText = (totalRev - totalExp) + ' ر.س';
      }

      async function addExpense() {
        const title = document.getElementById('exp-title').value;
        const amount = document.getElementById('exp-amount').value;
        const date = document.getElementById('exp-date').value;
        if(!title || !amount) return alert('يرجى ملء كافة البيانات');

        await fetch('/api/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ title, amount, date })
        });
        document.getElementById('exp-title').value = '';
        document.getElementById('exp-amount').value = '';
        fetchData();
      }

      async function addStudent() {
        const name = document.getElementById('std-name').value;
        const className = document.getElementById('std-class').value;
        const phone = document.getElementById('std-phone').value;
        const total = document.getElementById('std-total').value;
        const paid = document.getElementById('std-paid').value;
        if(!name) return alert('يرجى كتابة اسم الطفل');

        await fetch('/api/students', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, className, phone, total, paid })
        });
        document.getElementById('std-name').value = '';
        fetchData();
      }

      fetchData();
    </script>
  </body>
  </html>
  `);
});

// API البيانات
app.get('/api/students', (req, res) => res.json(students));
app.post('/api/students', (req, res) => {
  const student = { id: Date.now().toString(), ...req.body };
  students.push(student);
  res.json(student);
});

app.get('/api/expenses', (req, res) => res.json(expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  expenses.push(expense);
  res.json(expense);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
