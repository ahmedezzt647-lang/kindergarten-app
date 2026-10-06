const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// البيانات الخاصة بـ Supabase
const SUPABASE_URL = 'https://dcnlwakmkszglwhydhr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FgEuiSA7OISBJP2AV3OSSA_h5Uxx_16';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// جلب قائمة الطلاب
app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const today = new Date().toISOString().split('T')[0];
  const processed = (data || []).map(s => {
    const totalFee = parseFloat(s.totalFee) || 0;
    const paidAmount = parseFloat(s.paidAmount) || 0;
    const remaining = totalFee - paidAmount;
    const isDue = s.nextPaymentDate && s.nextPaymentDate <= today && remaining > 0;
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      joinDate: s.joinDate,
      parentPhone: s.parentPhone,
      totalFee,
      paidAmount,
      remaining,
      nextPaymentDate: s.nextPaymentDate,
      isDue
    };
  });
  res.json(processed);
});

// إضافة طالب جديد
app.post('/api/students', async (req, res) => {
  const { name, grade, joinDate, parentPhone, totalFee, paidAmount, nextPaymentDate } = req.body;
  const { data, error } = await supabase.from('students').insert([{
    name, grade, joinDate, parentPhone,
    totalFee: parseFloat(totalFee) || 0,
    paidAmount: parseFloat(paidAmount) || 0,
    nextPaymentDate
  }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'تم إضافة الطالب بنجاح' });
});

// تسجيل دفع مبلغ طالب
app.post('/api/students/pay', async (req, res) => {
  const { id, amount, nextPaymentDate } = req.body;
  const { data: student, error: fetchError } = await supabase.from('students').select('paidAmount').eq('id', id).single();
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  const newPaidAmount = (parseFloat(student.paidAmount) || 0) + parseFloat(amount);
  const { error: updateError } = await supabase.from('students').update({
    paidAmount: newPaidAmount,
    nextPaymentDate: nextPaymentDate || null
  }).eq('id', id);

  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ message: 'تم تسجيل الدفعة بنجاح' });
});

// جلب المصروفات من Supabase
app.get('/api/expenses', async (req, res) => {
  const { data, error } = await supabase.from('expenses').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// إضافة مصروف جديد إلى Supabase
app.post('/api/expenses', async (req, res) => {
  const { title, amount, date } = req.body;
  const { data, error } = await supabase.from('expenses').insert([{
    title,
    amount: parseFloat(amount) || 0,
    date
  }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'تم إضافة المصروف بنجاح' });
});

// الواجهة الرئيسية (HTML + Supabase)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نظام إدارة ومحاسبة الروضة</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 1100px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h1 { text-align: center; color: #333; }
    .stats { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px; flex-wrap: wrap; }
    .card { background: #eef2f5; padding: 15px; border-radius: 6px; flex: 1; min-width: 150px; text-align: center; }
    .card h3 { margin: 0 0 5px 0; font-size: 13px; color: #666; }
    .card p { margin: 0; font-size: 18px; font-weight: bold; color: #2c3e50; }
    .card.profit { background: #e8f8f5; border: 1px solid #27ae60; }
    .card.expense { background: #fdf2e9; border: 1px solid #e67e22; }
    form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px; background: #fafafa; padding: 15px; border-radius: 6px; }
    input, select, button { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    button { background: #27ae60; color: white; border: none; cursor: pointer; }
    button:hover { background: #219150; }
    .btn-danger { background: #e74c3c; }
    .btn-danger:hover { background: #c0392b; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
    th { background-color: #f8f9fa; }
    .section-title { margin-top: 30px; border-bottom: 2px solid #27ae60; padding-bottom: 5px; color: #2c3e50; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; color: white; }
    .badge-paid { background-color: #27ae60; }
    .badge-due { background-color: #e74c3c; }
    .btn-whatsapp { color: #25D366; text-decoration: none; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>نظام إدارة ومحاسبة الروضة</h1>
    
    <div class="stats">
      <div class="card"><h3>إجمالي الطلاب</h3><p id="totalStudents">0</p></div>
      <div class="card"><h3>إجمالي الإيرادات (المحصول)</h3><p id="totalPaid">0 ر.س</p></div>
      <div class="card expense"><h3>إجمالي المصروفات</h3><p id="totalExpenses">0 ر.س</p></div>
      <div class="card profit"><h3>صافي الربح / الخسارة</h3><p id="netProfit" style="color: #27ae60;">0 ر.س</p></div>
      <div class="card"><h3>المتبقي عند الطلاب</h3><p id="totalRemaining">0 ر.س</p></div>
    </div>

    <h2 class="section-title">💸 تسجيل المصروفات (رواتب، إيجار، أدوات...)</h2>
    <form id="addExpenseForm" onsubmit="saveExpense(event)">
      <input type="text" id="expTitle" placeholder="بند المصروف (مثلاً: إيجار)" required>
      <input type="number" id="expAmount" placeholder="المبلغ (ر.س)" required>
      <input type="date" id="expDate" required>
      <button type="submit" class="btn-danger">إضافة مصروف</button>
    </form>

    <table>
      <thead>
        <tr>
          <th>البند</th>
          <th>المبلغ</th>
          <th>التاريخ</th>
        </tr>
      </thead>
      <tbody id="expensesTable"></tbody>
    </table>

    <h2 class="section-title">👶 إدارة إيرادات الأطفال والرسوم</h2>
    <form id="addStudentForm" onsubmit="saveStudent(event)">
      <input type="text" id="name" placeholder="اسم الطفل" required>
      <input type="text" id="grade" placeholder="الصف / المستوى" required>
      <input type="date" id="joinDate" required>
      <input type="text" id="parentPhone" placeholder="رقم هاتف الولي" required>
      <input type="number" id="totalFee" placeholder="الرسوم الإجمالية" required>
      <input type="number" id="paidAmount" placeholder="المبلغ المدفوع" required>
      <input type="date" id="nextPaymentDate" placeholder="تاريخ الدفعة التالية">
      <button type="submit">إضافة طالب</button>
    </form>

    <input type="text" id="search" placeholder="بحث باسم الطفل..." oninput="filterStudents()" style="width: 100%; box-sizing: border-box; margin-bottom: 10px;">

    <table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>الصف</th>
          <th>رقم الولي</th>
          <th>الرسوم</th>
          <th>المدفوع</th>
          <th>المتبقي</th>
          <th>الدفعة القادمة</th>
          <th>الحالة</th>
          <th>إجراءات</th>
        </tr>
      </thead>
      <tbody id="studentsTable"></tbody>
    </table>
  </div>

  <script>
    let allStudents = [];
    let allExpenses = [];

    async function loadAllData() {
      const [stRes, expRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/expenses')
      ]);
      allStudents = await stRes.json();
      allExpenses = await expRes.json();
      renderUI();
    }

    function renderUI() {
      const tbody = document.getElementById('studentsTable');
      tbody.innerHTML = '';
      let paidSum = 0, remSum = 0, dueCount = 0;

      const q = document.getElementById('search').value.toLowerCase();
      const filtered = allStudents.filter(s => s.name.toLowerCase().includes(q));

      filtered.forEach(s => {
        paidSum += s.paidAmount;
        remSum += s.remaining;
        if(s.isDue) dueCount++;

        const cleanPhone = s.parentPhone ? s.parentPhone.replace(/[^0-9]/g, '') : '';
        const waUrl = \`https://wa.me/\${cleanPhone}\`;

        const row = document.createElement('tr');
        row.innerHTML = \`
          <td>\${s.name}</td>
          <td>\${s.grade}</td>
          <td>\${s.parentPhone || '-'}</td>
          <td>\${s.totalFee} ر.س</td>
          <td>\${s.paidAmount} ر.س</td>
          <td style="color: \${s.remaining > 0 ? '#d97706' : '#166534'}; font-weight: bold;">\${s.remaining} ر.س</td>
          <td>\${s.nextPaymentDate || '-'}</td>
          <td>\${s.remaining === 0 ? '<span class="badge badge-paid">مكتمل</span>' : (s.isDue ? '<span class="badge badge-due">مستحق</span>' : 'معلق')}</td>
          <td>
            \${s.remaining > 0 ? \`<button onclick="makePayment('\${s.id}')">تسجيل دفعة</button>\` : '✅'}
            \${cleanPhone ? \`<a href="\${waUrl}" target="_blank" class="btn-whatsapp">📱واتساب</a>\` : '-'}
          </td>
        \`;
        tbody.appendChild(row);
      });

      const expBody = document.getElementById('expensesTable');
      expBody.innerHTML = '';
      let totalExpSum = 0;

      allExpenses.forEach(exp => {
        const amt = parseFloat(exp.amount) || 0;
        totalExpSum += amt;
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td>\${exp.title}</td>
          <td style="color: #e74c3c; font-weight: bold;">\${amt} ر.س</td>
          <td>\${exp.date}</td>
        \`;
        expBody.appendChild(row);
      });

      const netProfit = paidSum - totalExpSum;

      document.getElementById('totalStudents').innerText = allStudents.length;
      document.getElementById('totalPaid').innerText = paidSum + ' ر.س';
      document.getElementById('totalExpenses').innerText = totalExpSum + ' ر.س';
      
      const profitElem = document.getElementById('netProfit');
      profitElem.innerText = netProfit + ' ر.س';
      profitElem.style.color = netProfit >= 0 ? '#27ae60' : '#e74c3c';

      document.getElementById('totalRemaining').innerText = remSum + ' ر.س';
    }

    async function saveExpense(e) {
      e.preventDefault();
      const body = {
        title: document.getElementById('expTitle').value,
        amount: document.getElementById('expAmount').value,
        date: document.getElementById('expDate').value
      };
      await fetch('/api/expenses', {
        method: '
