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

let students = [];
let expenses = [];

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>نظام إدارة ومحاسبة الروضة</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { text-align: center; color: #2c3e50; }
      
      .stats-cards { display: flex; gap: 10px; margin-bottom: 25px; }
      .card { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; border: 1px solid #ddd; transition: all 0.2s ease; }
      .card.clickable { cursor: pointer; border-color: #e74c3c; background-color: #fdf3f2; }
      .card.clickable:hover { background-color: #fcdad7; transform: translateY(-2px); }
      .card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
      .card .number { font-size: 20px; font-weight: bold; color: #2c3e50; }
      .card .hint { font-size: 11px; color: #e74c3c; margin-top: 4px; }

      .section-title { font-size: 18px; margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #27ae60; color: #27ae60; display: flex; justify-content: space-between; align-items: center; }
      .section-title.red { border-bottom-color: #e74c3c; color: #e74c3c; }

      .form-group { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
      input, select, button { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
      input { flex: 1; min-width: 130px; }
      button { background: #27ae60; color: white; border: none; cursor: pointer; font-weight: bold; }
      button.btn-expense { background: #e74c3c; }
      button.btn-pay { background: #2980b9; padding: 5px 10px; font-size: 12px; }
      button.btn-toggle { background: #7f8c8d; font-size: 12px; padding: 5px 10px; }
      button:hover { opacity: 0.9; }

      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: center; font-size: 14px; }
      th { background-color: #f2f2f2; }
      .badge-danger { color: #e74c3c; font-weight: bold; }
      .badge-success { color: #27ae60; font-weight: bold; }
      
      .details-box { background: #fff5f5; padding: 15px; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 25px; display: none; }
      .details-box.active { display: block; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>نظام إدارة ومحاسبة الروضة</h1>
      
      <div class="stats-cards">
        <div class="card"><h3>إجمالي الطلاب</h3><div class="number" id="total-students">0</div></div>
        <div class="card"><h3>إجمالي الإيرادات</h3><div class="number" id="total-revenue">0 ر.س</div></div>
        
        <!-- بطاقة المصروفات التفاعلية عند الضغط تفتح التفاصيل -->
        <div class="card clickable" onclick="toggleExpenseDetails()" title="اضغط هنا لعرض كافة المصروفات والبيانات التفصيلية">
          <h3>إجمالي المصروفات 🔍</h3>
          <div class="number" id="total-expenses">0 ر.س</div>
          <div class="hint">اضغط هنا للبيان التفصيلي</div>
        </div>

        <div class="card"><h3>صافي الربح / الخسارة</h3><div class="number" id="net-profit">0 ر.س</div></div>
      </div>

      <!-- نموذج إضافة المصروفات -->
      <div class="section-title red">
        <span>💸 تسجيل مصروف جديد</span>
      </div>
      <div class="form-group">
        <input type="text" id="exp-title" placeholder="بند المصروف (مثلاً: إيجار، نظافة، أدوات)">
        <input type="number" id="exp-amount" placeholder="المبلغ (ر.س)">
        <input type="date" id="exp-date">
        <button class="btn-expense" onclick="addExpense()">إضافة مصروف</button>
      </div>

      <!-- بيان المصروفات التفصيلي (يفتح ويغلق عند الضغط على كارت المصروفات) -->
      <div id="expense-details-box" class="details-box">
        <div class="section-title red" style="margin-top:0;">
          <span>📋 البيان التفصيلي للمصروفات والسجلات</span>
          <button class="btn-toggle" onclick="toggleExpenseDetails()">إغلاق البيان ✖</button>
        </div>
        <div class="form-group">
          <input type="text" id="search-exp" onkeyup="filterExpenses()" placeholder="🔍 ابحث باسم البند (مثلاً: صيانة)...">
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>بند المصروفات / البيان</th>
              <th>المبلغ المدفوع</th>
              <th>تاريخ الصرف</th>
            </tr>
          </thead>
          <tbody id="expenses-table"></tbody>
        </table>
      </div>

      <!-- قسم الطلاب والرسوم -->
      <div class="section-title">👶 إدارة إيرادات الأطفال والرسوم الشهريّة</div>
      <div class="form-group">
        <input type="text" id="std-name" placeholder="اسم الطفل">
        <input type="text" id="std-class" placeholder="الصف / المستوى">
        <input type="text" id="std-phone" placeholder="رقم هاتف ولي الأمر">
        <input type="date" id="std-join-date" title="تاريخ الالتحاق">
        <input type="number" id="std-monthly-fee" placeholder="الرسم الشهري">
        <input type="number" id="std-paid" placeholder="المبلغ المدفوع">
        <button onclick="addStudent()">إضافة طالب</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الصف</th>
            <th>رقم الولي</th>
            <th>تاريخ الالتحاق</th>
            <th>الأشهر المنقضية</th>
            <th>الرسم الشهري</th>
            <th>إجمالي المستحق</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody id="students-table"></tbody>
      </table>
    </div>

    <script>
      document.getElementById('exp-date').valueAsDate = new Date();
      document.getElementById('std-join-date').valueAsDate = new Date();

      let allExpenses = [];

      function calculateMonths(joinDateStr) {
        const joinDate = new Date(joinDateStr);
        const now = new Date();
        let months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()) + 1;
        return months > 0 ? months : 1;
      }

      function toggleExpenseDetails() {
        const box = document.getElementById('expense-details-box');
        box.classList.toggle('active');
      }

      async function fetchData() {
        const resExp = await fetch('/api/expenses');
        allExpenses = await resExp.json();
        const resStd = await fetch('/api/students');
        const students = await resStd.json();
        
        renderExpenses(allExpenses);
        renderStudents(students);
        updateStats(allExpenses, students);
      }

      function renderExpenses(data) {
        const tbody = document.getElementById('expenses-table');
        if(data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">لا توجد مصروفات مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = data.map((e, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>\${e.title}</b></td>
          <td style="color:#e74c3c; font-weight:bold;">\${e.amount} ر.س</td>
          <td>\${e.date || '-'}</td>
        </tr>\`).join('');
      }

      function filterExpenses() {
        const query = document.getElementById('search-exp').value.toLowerCase();
        const filtered = allExpenses.filter(e => e.title.toLowerCase().includes(query));
        renderExpenses(filtered);
      }

      function renderStudents(data) {
        const tbody = document.getElementById('students-table');
        tbody.innerHTML = data.map(s => {
          const months = calculateMonths(s.joinDate || new Date());
          const totalDue = (parseFloat(s.monthlyFee) || 0) * months;
          const paid = parseFloat(s.paid) || 0;
          const remaining = totalDue - paid;
          const remainingClass = remaining > 0 ? 'badge-danger' : 'badge-success';

          return \`<tr>
            <td>\${s.name}</td>
            <td>\${s.className}</td>
            <td>\${s.phone}</td>
            <td>\${s.joinDate || '-'}</td>
            <td>\${months} شهر</td>
            <td>\${s.monthlyFee} ر.س</td>
            <td>\${totalDue} ر.س</td>
            <td>\${paid} ر.س</td>
            <td class="\${remainingClass}">\${remaining} ر.س</td>
            <td><button class="btn-pay" onclick="payExtra('\${s.id}')">+ إضافة دفعة</button></td>
          </tr>\`;
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
        if(!title || !amount) return alert('يرجى كتابة بند المصروف والمبلغ');

        await fetch('/api/expenses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ title, amount, date })
        });
        document.getElementById('exp-title').value = '';
        document.getElementById('exp-amount').value = '';
        
        // فتح جدول التفاصيل تلقائياً عند إضافة مصروف جديد
        document.getElementById('expense-details-box').classList.add('active');
        fetchData();
      }

      async function addStudent() {
        const name = document.getElementById('std-name').value;
        const className = document.getElementById('std-class').value;
        const phone = document.getElementById('std-phone').value;
        const joinDate = document.getElementById('std-join-date').value;
        const monthlyFee = document.getElementById('std-monthly-fee').value;
        const paid = document.getElementById('std-paid').value;
        if(!name || !monthlyFee) return alert('يرجى كتابة اسم الطفل والرسم الشهري');

        await fetch('/api/students', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, className, phone, joinDate, monthlyFee, paid })
        });
        document.getElementById('std-name').value = '';
        document.getElementById('std-monthly-fee').value = '';
        document.getElementById('std-paid').value = '';
        fetchData();
      }

      async function payExtra(id) {
        const amount = prompt('أدخل مبلغ الدفعة الجديدة (ر.س):');
        if(!amount || isNaN(amount)) return;

        await fetch('/api/students/pay', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, amount })
        });
        fetchData();
      }

      fetchData();
    </script>
  </body>
  </html>
  `);
});

app.get('/api/students', (req, res) => res.json(students));
app.post('/api/students', (req, res) => {
  const student = { id: Date.now().toString(), ...req.body };
  students.push(student);
  res.json(student);
});

app.post('/api/students/pay', (req, res) => {
  const { id, amount } = req.body;
  const student = students.find(s => s.id === id);
  if (student) {
    student.paid = (parseFloat(student.paid) || 0) + parseFloat(amount);
    res.json(student);
  } else {
    res.status(404).json({ error: 'الطالب غير موجود' });
  }
});

app.get('/api/expenses', (req, res) => res.json(expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  expenses.push(expense);
  res.json(expense);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
