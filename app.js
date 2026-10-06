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

// تسجيل دفع مبلغ
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

// الواجهة الرئيسية (HTML)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تطبيق رياض الأطفال</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h1 { text-align: center; color: #333; }
    .stats { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 10px; }
    .card { background: #eef2f5; padding: 15px; border-radius: 6px; flex: 1; text-align: center; }
    .card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; }
    .card p { margin: 0; font-size: 20px; font-weight: bold; color: #2c3e50; }
    form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px; background: #fafafa; padding: 15px; border-radius: 6px; }
    input, select, button { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    button { background: #27ae60; color: white; border: none; cursor: pointer; }
    button:hover { background: #219150; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
    th { background-color: #f8f9fa; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; color: white; }
    .badge-paid { background-color: #27ae60; }
    .badge-due { background-color: #e74c3c; }
    .btn-whatsapp { color: #25D366; text-decoration: none; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>نظام إدارة أطفال الروضة</h1>
    <div class="stats">
      <div class="card"><h3>إجمالي الطلاب</h3><p id="totalStudents">0</p></div>
      <div class="card"><h3>إجمالي المدفوعات</h3><p id="totalPaid">0 ر.س</p></div>
      <div class="card"><h3>إجمالي المتبقي</h3><p id="totalRemaining">0 ر.س</p></div>
      <div class="card"><h3>مستحقات اليوم</h3><p id="dueAlerts">0</p></div>
    </div>

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

    async function fetchStudents() {
      const res = await fetch('/api/students');
      allStudents = await res.json();
      renderUI(allStudents);
    }

    function renderUI(students) {
      const tbody = document.getElementById('studentsTable');
      tbody.innerHTML = '';
      let paidSum = 0, remSum = 0, dueCount = 0;

      students.forEach(s => {
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

      document.getElementById('totalStudents').innerText = students.length;
      document.getElementById('totalPaid').innerText = paidSum + ' ر.س';
      document.getElementById('totalRemaining').innerText = remSum + ' ر.س';
      document.getElementById('dueAlerts').innerText = dueCount;
    }

    async function saveStudent(e) {
      e.preventDefault();
      const body = {
        name: document.getElementById('name').value,
        grade: document.getElementById('grade').value,
        joinDate: document.getElementById('joinDate').value,
        parentPhone: document.getElementById('parentPhone').value,
        totalFee: document.getElementById('totalFee').value,
        paidAmount: document.getElementById('paidAmount').value,
        nextPaymentDate: document.getElementById('nextPaymentDate').value
      };
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      document.getElementById('addStudentForm').reset();
      fetchStudents();
    }

    async function makePayment(id) {
      const amount = prompt('أدخل المبلغ المدفوع الجديد:');
      if (!amount) return;
      const nextDate = prompt('أدخل تاريخ الدفعة القادمة (YYYY-MM-DD):');
      await fetch('/api/students/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amount, nextPaymentDate: nextDate })
      });
      fetchStudents();
    }

    function filterStudents() {
      const q = document.getElementById('search').value.toLowerCase();
      const filtered = allStudents.filter(s => s.name.toLowerCase().includes(q));
      renderUI(filtered);
    }

    document.getElementById('joinDate').value = new Date().toISOString().split('T')[0];
    fetchStudents();
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
