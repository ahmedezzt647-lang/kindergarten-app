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

// قواعد البيانات المحلية المؤقتة
let students = [];
let expenses = [];
let paymentsHistory = [];
let attendance = []; // سجل الحضور والغياب

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة الروضة المتكامل | Enterprise ERP</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1250px; margin: 0 auto; background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
      h1 { text-align: center; color: #1a2a3a; margin-bottom: 25px; font-size: 26px; }
      
      .stats-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px; }
      .card { padding: 15px; background: #fff; border-radius: 8px; text-align: center; border: 1px solid #e1e8ed; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
      .card:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.08); }
      .card.blue { border-top: 4px solid #3498db; }
      .card.green { border-top: 4px solid #2ecc71; }
      .card.red { border-top: 4px solid #e74c3c; }
      .card.purple { border-top: 4px solid #9b59b6; }
      .card.orange { border-top: 4px solid #e67e22; }
      .card h3 { margin: 0 0 5px 0; font-size: 13px; color: #7f8c8d; }
      .card .number { font-size: 22px; font-weight: bold; color: #2c3e50; }
      .card .hint { font-size: 11px; color: #95a5a6; margin-top: 4px; }

      .section-title { font-size: 17px; margin: 25px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #3498db; color: #2c3e50; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
      .section-title.red { border-bottom-color: #e74c3c; }
      .section-title.green { border-bottom-color: #2ecc71; }

      .form-group { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
      input, select, button { padding: 10px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 13px; }
      input, select { flex: 1; min-width: 140px; }
      button { background: #3498db; color: white; border: none; cursor: pointer; font-weight: bold; transition: 0.2s; }
      button.btn-expense { background: #e74c3c; }
      button.btn-success { background: #2ecc71; }
      button.btn-pay { background: #27ae60; padding: 5px 10px; font-size: 12px; }
      button.btn-absent { background: #e74c3c; padding: 5px 10px; font-size: 12px; }
      button.btn-delete { background: #95a5a6; padding: 4px 8px; font-size: 11px; }
      button.btn-toggle { background: #7f8c8d; font-size: 12px; padding: 5px 10px; }
      button:hover { opacity: 0.9; }

      table { width: 100%; border-collapse: collapse; margin-top: 10px; background: #fff; }
      th, td { border: 1px solid #dee2e6; padding: 9px 7px; text-align: center; font-size: 13px; }
      th { background-color: #f1f3f5; color: #495057; }
      .badge-danger { color: #e74c3c; font-weight: bold; }
      .badge-success { color: #2ecc71; font-weight: bold; }
      
      .details-box { background: #fff; padding: 18px; border: 1px solid #ced4da; border-radius: 8px; margin-bottom: 25px; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
      .details-box.active { display: block; }
      
      .print-receipt { display: none; padding: 20px; border: 2px dashed #333; margin-top: 20px; background: #fff; }
      @media print {
        body * { visibility: hidden; }
        .print-receipt, .print-receipt * { visibility: visible; }
        .print-receipt { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🏫 نظام إدارة ومحاسبة الروضة الشامل</h1>
      
      <!-- لوحة المؤشرات الرئيسية -->
      <div class="stats-cards">
        <div class="card blue" onclick="showBox('students-details-box')">
          <h3>إجمالي الأطفال 🔍</h3>
          <div class="number" id="total-students">0</div>
          <div class="hint">قائمة الطلاب والتسجيل</div>
        </div>
        
        <div class="card green" onclick="showBox('revenue-details-box')">
          <h3>المقبوضات والإيرادات 🔍</h3>
          <div class="number" id="total-revenue">0 ر.س</div>
          <div class="hint">سجل الدفعات المقبوضة</div>
        </div>
        
        <div class="card red" onclick="showBox('expense-details-box')">
          <h3>إجمالي المصروفات 🔍</h3>
          <div class="number" id="total-expenses">0 ر.س</div>
          <div class="hint">سجل النفقات التشغيلية</div>
        </div>

        <div class="card purple" onclick="showBox('profit-details-box')">
          <h3>صافي الربح / الخسارة 🔍</h3>
          <div class="number" id="net-profit">0 ر.س</div>
          <div class="hint">التقرير المالي النهائي</div>
        </div>

        <div class="card orange" onclick="showBox('attendance-details-box')">
          <h3>حضور اليوم 🔍</h3>
          <div class="number" id="today-attendance">0</div>
          <div class="hint">تتبع الحضور والغياب</div>
        </div>
      </div>

      <!-- 1. صندوق تفاصيل الحضور والغياب -->
      <div id="attendance-details-box" class="details-box">
        <div class="section-title">
          <span>📅 سجل الحضور والغياب اليومي</span>
          <button class="btn-toggle" onclick="hideBox('attendance-details-box')">إغلاق ✖</button>
        </div>
        <table>
          <thead>
            <tr><th>اسم الطفل</th><th>الصف</th><th>حالة الحضور</th><th>وقت التسجيل</th><th>إجراء تسديد الحضور</th></tr>
          </thead>
          <tbody id="attendance-table"></tbody>
        </table>
      </div>

      <!-- 2. صندوق تفاصيل الطلاب -->
      <div id="students-details-box" class="details-box">
        <div class="section-title">
          <span>👶 بيان وقائمة الطلاب التفصيلية</span>
          <div>
            <button class="btn-success" onclick="exportToCSV('students')">📥 تصدير Excel</button>
            <button class="btn-toggle" onclick="hideBox('students-details-box')">إغلاق ✖</button>
          </div>
        </div>
        <div class="form-group">
          <input type="text" id="search-std" onkeyup="filterStudents()" placeholder="🔍 ابحث باسم الطالب أو الصف...">
        </div>
        <table>
          <thead>
            <tr><th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>الرسم</th><th>الخصم</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th>إجراءات</th></tr>
          </thead>
          <tbody id="students-table-detail"></tbody>
        </table>
      </div>

      <!-- 3. صندوق تفاصيل الإيرادات -->
      <div id="revenue-details-box" class="details-box">
        <div class="section-title green">
          <span>💰 سجل المقبوضات والإيرادات التفصيلي</span>
          <button class="btn-toggle" onclick="hideBox('revenue-details-box')">إغلاق ✖</button>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>رقم الإيصال</th><th>اسم الطالب</th><th>المبلغ المحصل</th><th>التاريخ</th><th>طباعة إيصال</th></tr>
          </thead>
          <tbody id="revenue-table"></tbody>
        </table>
      </div>

      <!-- 4. صندوق تفاصيل المصروفات -->
      <div id="expense-details-box" class="details-box">
        <div class="section-title red">
          <span>📋 البيان التفصيلي للمصروفات والنفقات</span>
          <button class="btn-toggle" onclick="hideBox('expense-details-box')">إغلاق ✖</button>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>بند المصروف</th><th>المبلغ</th><th>التاريخ</th><th>حذف</th></tr>
          </thead>
          <tbody id="expenses-table"></tbody>
        </table>
      </div>

      <!-- 5. صندوق التقرير المالي -->
      <div id="profit-details-box" class="details-box">
        <div class="section-title">
          <span>📊 التقرير المالي الختامي</span>
          <button class="btn-toggle" onclick="hideBox('profit-details-box')">إغلاق ✖</button>
        </div>
        <div style="display:flex; justify-content:space-around; background:#f8f9fa; padding:15px; border-radius:8px;">
          <div><h4>المقبوضات</h4><p style="color:#2ecc71; font-weight:bold;" id="rep-rev">0 ر.س</p></div>
          <div><h4>المصروفات</h4><p style="color:#e74c3c; font-weight:bold;" id="rep-exp">0 ر.س</p></div>
          <div><h4>صافي الأرباح</h4><p style="color:#9b59b6; font-weight:bold;" id="rep-net">0 ر.س</p></div>
        </div>
      </div>

      <!-- نموذج تسجيل مصروف -->
      <div class="section-title red"><span>💸 تسجيل مصروف جديد</span></div>
      <div class="form-group">
        <input type="text" id="exp-title" placeholder="بند المصروف (إيجار، رواتب، نظافة)">
        <input type="number" id="exp-amount" placeholder="المبلغ (ر.س)">
        <input type="date" id="exp-date">
        <button class="btn-expense" onclick="addExpense()">إضافة المصروف</button>
      </div>

      <!-- نموذج إضافة طالب -->
      <div class="section-title green"><span>👶 إضافة طالب جديد وحساب الرسوم</span></div>
      <div class="form-group">
        <input type="text" id="std-name" placeholder="اسم الطفل ثلاثي">
        <input type="text" id="std-class" placeholder="الصف (تمهيدي، روضة 1)">
        <input type="text" id="std-phone" placeholder="رقم هاتف الولي">
        <input type="date" id="std-join-date" title="تاريخ الالتحاق">
        <input type="number" id="std-monthly-fee" placeholder="الرسم الشهري">
        <input type="number" id="std-discount" placeholder="خصم شهري (إن وجد)">
        <input type="number" id="std-paid" placeholder="الدفعة الأولى">
        <button class="btn-success" onclick="addStudent()">تسجيل الطالب</button>
      </div>

      <!-- جدول الطلاب الرئيسي -->
      <div class="section-title"><span>📜 جدول الطلاب الرئيسي وإدارة السداد والحضور</span></div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>الاسم</th><th>الصف</th><th>الهاتف</th><th>تاريخ الالتحاق</th><th>الأشهر</th><th>الرسم</th><th>الخصم</th><th>المستحق</th><th>المدفوع</th><th>المتبقي</th><th>حضور اليوم</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="students-table-main"></tbody>
        </table>
      </div>

      <!-- قالب الإيصال المخصص للطباعة -->
      <div id="receipt-print-area" class="print-receipt">
        <h2 style="text-align:center;">إيصال استلام نقدية - روضة الأطفال</h2>
        <hr>
        <p><strong>رقم الإيصال:</strong> <span id="rec-id"></span></p>
        <p><strong>التاريخ:</strong> <span id="rec-date"></span></p>
        <p><strong>استلمنا من الطالب/ة:</strong> <span id="rec-name"></span></p>
        <p><strong>مبلغ وقدره:</strong> <span id="rec-amount"></span> ر.س</p>
        <br><br>
        <div style="display:flex; justify-content:space-between;">
          <p>توقيع المحاسب: ....................</p>
          <p>ختم الروضة: ....................</p>
        </div>
      </div>

    </div>

    <script>
      document.getElementById('exp-date').valueAsDate = new Date();
      document.getElementById('std-join-date').valueAsDate = new Date();

      let allExpenses = [];
      let allStudents = [];
      let allPayments = [];
      let allAttendance = [];

      function calculateMonths(joinDateStr) {
        const joinDate = new Date(joinDateStr);
        const now = new Date();
        let months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()) + 1;
        return months > 0 ? months : 1;
      }

      function showBox(boxId) {
        document.querySelectorAll('.details-box').forEach(box => box.classList.remove('active'));
        document.getElementById(boxId).classList.add('active');
      }

      function hideBox(boxId) {
        document.getElementById(boxId).classList.remove('active');
      }

      async function fetchData() {
        const resExp = await fetch('/api/expenses');
        allExpenses = await resExp.json();
        
        const resStd = await fetch('/api/students');
        allStudents = await resStd.json();

        const resPay = await fetch('/api/payments');
        allPayments = await resPay.json();

        const resAtt = await fetch('/api/attendance');
        allAttendance = await resAtt.json();
        
        renderExpenses(allExpenses);
        renderStudents(allStudents);
        renderRevenue(allPayments);
        renderAttendance(allStudents, allAttendance);
        updateStats(allExpenses, allStudents, allPayments, allAttendance);
      }

      function renderExpenses(data) {
        const tbody = document.getElementById('expenses-table');
        if(data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5">لا توجد مصروفات مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = data.map((e, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>\${e.title}</b></td>
          <td style="color:#e74c3c; font-weight:bold;">\${e.amount} ر.س</td>
          <td>\${e.date || '-'}</td>
          <td><button class="btn-delete" onclick="deleteExpense('\${e.id}')">حذف</button></td>
        </tr>\`).join('');
      }

      function renderRevenue(payments) {
        const tbody = document.getElementById('revenue-table');
        if(payments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6">لا توجد عمليات دفع مسجلة حتى الآن</td></tr>';
          return;
        }
        tbody.innerHTML = payments.map((p, index) => \`<tr>
          <td>\${index + 1}</td>
          <td><b>#\${p.id || index + 1001}</b></td>
          <td>\${p.studentName}</td>
          <td style="color:#2ecc71; font-weight:bold;">\${p.amount} ر.س</td>
          <td>\${p.date}</td>
          <td><button class="btn-pay" onclick="printReceipt('\${p.id || index + 1001}', '\${p.studentName}', '\${p.amount}', '\${p.date}')">🖨️ طباعة</button></td>
        </tr>\`).join('');
      }

      function renderAttendance(students, attendance) {
        const today = new Date().toISOString().split('T')[0];
        const tbody = document.getElementById('attendance-table');
        
        tbody.innerHTML = students.map(s => {
          const rec = attendance.find(a => a.studentId === s.id && a.date === today);
          const statusText = rec ? (rec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'لم يسجل';
          return \`<tr>
            <td>\${s.name}</td>
            <td>\${s.className}</td>
            <td><b>\${statusText}</b></td>
            <td>\${rec ? rec.time : '-'}</td>
            <td>
              <button class="btn-pay" onclick="markAttendance('\${s.id}', 'present')">حاضر</button>
              <button class="btn-absent" onclick="markAttendance('\${s.id}', 'absent')">غائب</button>
            </td>
          </tr>\`;
        }).join('');
      }

      function renderStudents(data) {
        const today = new Date().toISOString().split('T')[0];
        const rows = data.map(s => {
          const months = calculateMonths(s.joinDate || new Date());
          const discount = parseFloat(s.discount) || 0;
          const monthlyAfterDiscount = (parseFloat(s.monthlyFee) || 0) - discount;
          const totalDue = monthlyAfterDiscount * months;
          const paid = parseFloat(s.paid) || 0;
          const remaining = totalDue - paid;
          const remainingClass = remaining > 0 ? 'badge-danger' : 'badge-success';

          const attRec = allAttendance.find(a => a.studentId === s.id && a.date === today);
          const attStatus = attRec ? (attRec.status === 'present' ? '✅ حاضر' : '❌ غائب') : 'غير مسجل';

          return \`<tr>
            <td><b>\${s.name}</b></td>
            <td>\${s.className}</td>
            <td><a href="tel:\${s.phone}">\${s.phone}</a></td>
            <td>\${s.joinDate || '-'}</td>
            <td>\${months} شهر</td>
            <td>\${s.monthlyFee} ر.س</td>
            <td>\${discount} ر.س</td>
            <td>\${totalDue} ر.س</td>
            <td>\${paid} ر.س</td>
            <td class="\${remainingClass}">\${remaining} ر.س</td>
            <td>\${attStatus}</td>
            <td>
              <button class="btn-pay" onclick="payExtra('\${s.id}', '\${s.name}')">+ دفعة</button>
              <button class="btn-delete" onclick="deleteStudent('\${s.id}')">حذف</button>
            </td>
          </tr>\`;
        }).join('');

        document.getElementById('students-table-main').innerHTML = rows;
        document.getElementById('students-table-detail').innerHTML = rows;
      }

      function updateStats(expenses, students, payments, attendance) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('total-students').innerText = students.length;
        
        const totalExp = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const totalRev = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const todayAttCount = attendance.filter(a => a.date === today && a.status === 'present').length;

        document.getElementById('total-expenses').innerText = totalExp + ' ر.س';
        document.getElementById('total-revenue').innerText = totalRev + ' ر.س';
        document.getElementById('net-profit').innerText = (totalRev - totalExp) + ' ر.س';
        document.getElementById('today-attendance').innerText = todayAttCount + ' طفل';

        document.getElementById('rep-rev').innerText = totalRev + ' ر.س';
        document.getElementById('rep-exp').innerText = totalExp + ' ر.س';
        document.getElementById('rep-net').innerText = (totalRev - totalExp) + ' ر.س';
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
        fetchData();
      }

      async function addStudent() {
        const name = document.getElementById('std-name').value;
        const className = document.getElementById('std-class').value;
        const phone = document.getElementById('std-phone').value;
        const joinDate = document.getElementById('std-join-date').value;
        const monthlyFee = document.getElementById('std-monthly-fee').value;
        const discount = document.getElementById('std-discount').value;
        const paid = document.getElementById('std-paid').value;
        if(!name || !monthlyFee) return alert('يرجى كتابة اسم الطفل والرسم الشهري');

        await fetch('/api/students', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name, className, phone, joinDate, monthlyFee, discount, paid })
        });
        document.getElementById('std-name').value = '';
        document.getElementById('std-monthly-fee').value = '';
        document.getElementById('std-paid').value = '';
        fetchData();
      }

      async function payExtra(id, studentName) {
        const amount = prompt('أدخل مبلغ الدفعة الجديدة (ر.س):');
        if(!amount || isNaN(amount)) return;

        await fetch('/api/students/pay', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, amount, studentName })
        });
        fetchData();
      }

      async function markAttendance(studentId, status) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ studentId, status })
        });
        fetchData();
      }

      async function deleteStudent(id) {
        if(!confirm('هل أنت تأكد من حذف هذا الطالب؟')) return;
        await fetch('/api/students/' + id, { method: 'DELETE' });
        fetchData();
      }

      async function deleteExpense(id) {
        if(!confirm('هل أنت تأكد من حذف هذا المصروف؟')) return;
        await fetch('/api/expenses/' + id, { method: 'DELETE' });
        fetchData();
      }

      function printReceipt(id, name, amount, date) {
        document.getElementById('rec-id').innerText = id;
        document.getElementById('rec-name').innerText = name;
        document.getElementById('rec-amount').innerText = amount;
        document.getElementById('rec-date').innerText = date;
        window.print();
      }

      fetchData();
    </script>
  </body>
  </html>
  `);
});

// --- مسارات الـ API التشغيلية ---
app.get('/api/students', (req, res) => res.json(students));
app.post('/api/students', (req, res) => {
  const student = { id: Date.now().toString(), ...req.body };
  students.push(student);
  if (parseFloat(req.body.paid) > 0) {
    paymentsHistory.push({
      id: Math.floor(1000 + Math.random() * 9000),
      studentName: req.body.name,
      amount: parseFloat(req.body.paid),
      date: new Date().toISOString().split('T')[0]
    });
  }
  res.json(student);
});
app.delete('/api/students/:id', (req, res) => {
  students = students.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/payments', (req, res) => res.json(paymentsHistory));
app.post('/api/students/pay', (req, res) => {
  const { id, amount, studentName } = req.body;
  const student = students.find(s => s.id === id);
  if (student) {
    student.paid = (parseFloat(student.paid) || 0) + parseFloat(amount);
    paymentsHistory.push({
      id: Math.floor(1000 + Math.random() * 9000),
      studentName: studentName || student.name,
      amount: parseFloat(amount),
      date: new Date().toISOString().split('T')[0]
    });
    res.json(student);
  } else {
    res.status(404).json({ error: 'غير موجود' });
  }
});

app.get('/api/expenses', (req, res) => res.json(expenses));
app.post('/api/expenses', (req, res) => {
  const expense = { id: Date.now().toString(), ...req.body };
  expenses.push(expense);
  res.json(expense);
});
app.delete('/api/expenses/:id', (req, res) => {
  expenses = expenses.filter(e => e.id !== req.params.id);
  res.json({ success: true });
});

app.get('/api/attendance', (req, res) => res.json(attendance));
app.post('/api/attendance', (req, res) => {
  const { studentId, status } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ar-EG');
  
  attendance = attendance.filter(a => !(a.studentId === studentId && a.date === today));
  attendance.push({ studentId, status, date: today, time });
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
