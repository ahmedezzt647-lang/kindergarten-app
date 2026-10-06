const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();

app.use(express.json());

// بيانات الربط مع Supabase
const SUPABASE_URL = 'https://dcnlwakmkszglwlhydhr.supabase.co';
const SUPABASE_KEY = sb_publishable_FgEuiSA7oISBJP2AV3OSSA_h5Uxx_l6
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// جلب قائمة الطلاب
app.get('/api/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*').order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const today = new Date().toISOString().split('T')[0];
  const processedStudents = (data || []).map(s => {
    const totalFee = parseFloat(s.total_fee) || 0;
    const paidAmount = parseFloat(s.paid_amount) || 0;
    const remaining = totalFee - paidAmount;
    const isDue = remaining > 0 && s.next_payment_date && s.next_payment_date <= today;
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      joinDate: s.join_date,
      parentPhone: s.parent_phone,
      totalFee,
      paidAmount,
      nextPaymentDate: s.next_payment_date,
      remaining,
      isDue
    };
  });

  res.json(processedStudents);
});

// إضافة طالب جديد
app.post('/api/students', async (req, res) => {
  const { name, grade, joinDate, parentPhone, totalFee, paidAmount, nextPaymentDate } = req.body;
  
  const { data, error } = await supabase.from('students').insert([{
    name,
    grade,
    join_date: joinDate || null,
    parent_phone: parentPhone || '',
    total_fee: parseFloat(totalFee) || 0,
    paid_amount: parseFloat(paidAmount) || 0,
    next_payment_date: nextPaymentDate || null
  }]).select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, student: data[0] });
});

// تسجيل دفعة جديدة
app.post('/api/students/pay', async (req, res) => {
  const { id, amount, nextPaymentDate } = req.body;

  const { data: student, error: fetchError } = await supabase.from('students').select('paid_amount').eq('id', id).single();
  if (fetchError || !student) return res.status(404).json({ error: 'الطالب غير موجود' });

  const newPaidAmount = (parseFloat(student.paid_amount) || 0) + (parseFloat(amount) || 0);
  const updateData = { paid_amount: newPaidAmount };
  if (nextPaymentDate) updateData.next_payment_date = nextPaymentDate;

  const { error: updateError } = await supabase.from('students').update(updateData).eq('id', id);
  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ success: true });
});

// الواجهة الرئيسية
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نظام إدارة الروضة</title>
  <style>
    :root { --primary: #0284c7; --bg: #f8fafc; --card: #ffffff; --text: #1e293b; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { color: var(--primary); text-align: center; margin-bottom: 25px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: var(--card); padding: 18px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .stat-card h3 { margin: 0; color: #64748b; font-size: 0.9em; }
    .stat-card p { margin: 10px 0 0; font-size: 1.6em; font-weight: bold; color: var(--primary); }
    .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 25px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    input, select, button { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95em; }
    button { background: var(--primary); color: white; border: none; cursor: pointer; font-weight: bold; }
    button:hover { background: #0369a1; }
    .btn-whatsapp { background: #25D366; color: white; padding: 6px 12px; text-decoration: none; border-radius: 6px; font-size: 0.85em; font-weight: bold; display: inline-block; }
    .btn-whatsapp:hover { background: #128C7E; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; color: #475569; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-due { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧸 نظام إدارة الروضة والرسوم</h1>
    <div class="stats-grid">
      <div class="stat-card"><h3>إجمالي الطلاب</h3><p id="totalStudents">0</p></div>
      <div class="stat-card"><h3>المقبوضات</h3><p id="totalPaid">0 ر.س</p></div>
      <div class="stat-card"><h3>المتبقي في الذمة</h3><p id="totalRemaining">0 ر.س</p></div>
      <div class="stat-card"><h3>تنبيهات الاستحقاق</h3><p id="dueAlerts" style="color:#ef4444;">0</p></div>
    </div>
    <div class="card">
      <h3>➕ إضافة طالب جديد</h3>
      <form id="addStudentForm" onsubmit="saveStudent(event)" class="form-grid">
        <input type="text" id="name" placeholder="اسم الطالب الثلاثي" required>
        <select id="grade" required>
          <option value="روضة أولى">روضة أولى</option>
          <option value="روضة ثانية">روضة ثانية</option>
          <option value="تمهيدي">تمهيدي</option>
        </select>
        <input type="date" id="joinDate" required>
        <input type="tel" id="parentPhone" placeholder="رقم جوال ولي الأمر (مثال: 966501234567)">
        <input type="number" id="totalFee" placeholder="إجمالي المصروفات" required>
        <input type="number" id="paidAmount" placeholder="المبلغ المدفوع حالياً" value="0">
        <input type="date" id="nextPaymentDate" placeholder="تاريخ الدفعة القادمة">
        <button type="submit">حفظ الطالب</button>
      </form>
    </div>
    <div class="card">
      <h3>📋 سجل الطلاب والحسابات</h3>
      <input type="text" id="search" placeholder="🔍 بحث باسم الطالب..." onkeyup="filterStudents()" style="width:100%; box-sizing:border-box; margin-bottom:15px;">
      <table>
        <thead>
          <tr>
            <th>اسم الطالب</th>
            <th>الصف</th>
            <th>الجوال</th>
            <th>المصروفات</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>موعد الدفعة</th>
            <th>الحالة</th>
            <th>إجراء</th>
            <th>تواصل</th>
          </tr>
        </thead>
        <tbody id="studentsTable"></tbody>
      </table>
    </div>
  </div>
  <script>
    let allStudents = [];
    async function fetchStudents() {
      const res = await fetch('/api/students');
      allStudents = await res.json();
      renderUI(allStudents);
    }
    function renderUI(data) {
      const tbody = document.getElementById('studentsTable');
      tbody.innerHTML = '';
      let paidSum = 0, remSum = 0, dueCount = 0;
      data.forEach(s => {
        paidSum += s.paidAmount;
        remSum += s.remaining;
        if (s.isDue) dueCount++;

        let cleanPhone = s.parentPhone ? s.parentPhone.replace(/[^0-9]/g, '') : '';
        if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.substring(1);
        
        const message = encodeURIComponent(\`السلام عليكم ورحمة الله وبركاته\\nولي أمر الطالب/ة: \${s.name}\\nنود تذكيركم بوجود دفعة مستحقة لرسوم الروضة قدرها: \${s.remaining} ريال سعودي.\\nيرجى السداد في أقرب وقت. شاكرين تعاونكم.\`);
        const waUrl = cleanPhone ? \`https://wa.me/\${cleanPhone}?text=\${message}\` : '#';

        const row = document.createElement('tr');
        row.innerHTML = '<td><strong>' + s.name + '</strong></td>' +
          '<td>' + s.grade + '</td>' +
          '<td>' + (s.parentPhone || '-') + '</td>' +
          '<td>' + s.totalFee + ' ر.س</td>' +
          '<td>' + s.paidAmount + ' ر.س</td>' +
          '<td style="color:' + (s.remaining > 0 ? '#d97706' : '#166534') + '; font-weight:bold;">' + s.remaining + ' ر.س</td>' +
          '<td>' + (s.nextPaymentDate || '-') + '</td>' +
          '<td>' + (s.remaining === 0 ? '<span class="badge badge-paid">مكتمل</span>' : (s.isDue ? '<span class="badge badge-due">مستحق الدفع</span>' : '<span class="badge" style="background:#fef3c7; color:#92400e;">متبقي</span>')) + '</td>' +
          '<td>' + (s.remaining > 0 ? '<button onclick="makePayment(' + s.id + ')">تسجيل دفعة</button>' : '✅') + '</td>' +
          '<td>' + (cleanPhone ? '<a href="' + waUrl + '" target="_blank" class="btn-whatsapp">📲 واتساب</a>' : '-') + '</td>';
        tbody.appendChild(row);
      });
      document.getElementById('totalStudents').innerText = data.length;
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
      const nextDate = prompt('تاريخ الدفعة القادمة (YYYY-MM-DD):');
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
