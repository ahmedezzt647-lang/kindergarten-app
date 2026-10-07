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
let paymentsHistory = [];
let attendance = [];

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة ومحاسبة الروضة الشامل</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      body { 
        font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif; 
        background-color: #f1f5f9; 
        margin: 0; 
        padding: 24px 16px; 
        color: #1e293b; 
      }
      .container { 
        max-width: 1280px; 
        margin: 0 auto; 
        background: #ffffff; 
        padding: 30px; 
        border-radius: 16px; 
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); 
      }
      .header-title {
        text-align: center;
        margin-bottom: 30px;
      }
      .header-title h1 { 
        color: #0f172a; 
        font-size: 28px; 
        font-weight: 700;
        margin: 0 0 8px 0;
      }
      .header-title p {
        color: #64748b;
        font-size: 14px;
        margin: 0;
      }
      
      /* لوحة البطاقات الإحصائية */
      .stats-cards { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); 
        gap: 16px; 
        margin-bottom: 30px; 
      }
      .card { 
        padding: 20px 16px; 
        background: #ffffff; 
        border-radius: 14px; 
        text-align: center; 
        border: 1px solid #e2e8f0; 
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
        cursor: pointer; 
        position: relative;
        overflow: hidden;
      }
      .card:hover { 
        transform: translateY(-4px); 
        box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08); 
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0; right: 0; left: 0;
        height: 4px;
      }
      .card.blue::before { background: #3b82f6; }
      .card.teal::before { background: #0d9488; }
      .card.green::before { background: #10b981; }
      .card.red::before { background: #ef4444; }
      .card.purple::before { background: #8b5cf6; }

      .card h3 { margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 500; }
      .card .number { font-size: 24px; font-weight: 700; color: #0f172a; }
      .card .hint { font-size: 11px; color: #94a3b8; margin-top: 6px; }

      /* العناوين والتقسيمات */
      .section-title { 
        font-size: 16px; 
        margin: 32px 0 16px 0; 
        padding-bottom: 8px; 
        border-bottom: 2px solid #e2e8f0; 
        color: #0f172a; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        font-weight: 700; 
      }
      .section-title.red { border-bottom-color: #fca5a5; color: #dc2626; }
      .section-title.green { border-bottom-color: #6ee7b7; color: #059669; }
      .section-title.teal { border-bottom-color: #99f6e4; color: #0d9488; }

      /* النماذج وحقول الإدخال */
      .form-group { 
        display: flex; 
        gap: 12px; 
        margin-bottom: 20px; 
        flex-wrap: wrap; 
        background: #f8fafc; 
        padding: 18px; 
        border-radius: 12px; 
        border: 1px solid #f1f5f9; 
      }
      input, select { 
        padding: 11px 14px; 
        border: 1px solid #cbd5e1; 
        border-radius: 8px; 
        font-size: 13px; 
        font-family: inherit;
        background: #ffffff;
        transition: all 0.2s;
        flex: 1;
        min-width: 140px;
        outline: none;
      }
      input:focus, select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      /* الأزرار */
      button { 
        padding: 11px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-family: inherit;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      button.btn-primary { background: #3b82f6; color: #ffffff; }
      button.btn-primary:hover { background: #2563eb; }
      
      button.btn-expense { background: #ef4444; color: #ffffff; }
      button.btn-expense:hover { background: #dc2626; }
      
      button.btn-success { background: #10b981; color: #ffffff; }
      button.btn-success:hover { background: #059669; }
      
      button.btn-pay { background: #059669; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-pay:hover { background: #047857; }

      button.btn-absent { background: #f43f5e; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-delete { background: #94a3b8; color: #ffffff; padding: 5px 10px; font-size: 11px; }
      button.btn-delete:hover { background: #64748b; }
      
      button.btn-toggle { background: #f1f5f9; color: #475569; font-size: 12px; padding: 6px 12px; border: 1px solid #e2e8f0; }
      button.btn-toggle:hover { background: #e2e8f0; }

      /* الجداول */
      .table-responsive { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 12px; }
      table { width: 100%; border-collapse: collapse; background: #ffffff; }
      th, td { padding: 12px 10px; text-align: center; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
      th { background-color: #f8fafc; color: #475569; font-weight: 600; }
      tbody tr:hover { background-color: #f8fafc; }
      tbody tr:last-child td { border-bottom: none; }

      .badge-danger { color: #dc2626; font-weight: 700; background: #fef2f2; padding: 4px 8px; border-radius: 6px; }
      .badge-success { color: #059669; font-weight: 700; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; }
      
      .details-box { background: #ffffff; padding: 22px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 25px; display: none; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.04); }
      .details-box.active { display: block; }

      .print-receipt { display: none; padding: 30px; border: 2px dashed #0f172a; margin-top: 20px; background: #fff; border-radius: 12px; }
      @media print {
        body * { visibility: hidden; }
        .print-receipt, .print-receipt * { visibility: visible; }
        .print-receipt { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-title">
        <h1>🏫 نظام إدارة ومحاسبة الروضة</h1>
        <p>لوحة التحكم الشاملة لإدارة الطلاب والرسوم والمصروفات</p>
      </div>
      
      <!-- المؤشرات الرئيسية -->
      <div class="stats-cards">
        <div class="card blue" onclick="showBox('students-details-box')">
          <h3>إجمالي الأطفال 🔍</h3>
          <div class="number" id="total-students">0</div>
          <div class="hint">عرض التسجيل والطلاب</div>
        </div>

        <div class="card teal" onclick="showBox('classes-details-box')">
          <h3>الصفوف والشعب 🔍</h3>
          <div class="number" id="total-classes">0</div>
          <div class="hint">إحصاء الأرباح حسب الصف</div>
        </div>
        
        <div class="card green" onclick="showBox('revenue-details-box')">
          <h3>الإيرادات المقبوضة 🔍</h3>
          <div class="number" id="total-revenue">0 ر.س</div>
          <div class="hint">سجل التحصيل المالي</div>
        </div>
        
        <div class="card red" onclick="showBox('expense-details-box')">
          <h3>إجمالي المصروفات 🔍</h3>
          <div class="number" id="total-expenses">0 ر.س</div>
          <div class="hint">سجل النفقات التشغيلية</div>
        </div>

        <div class="card purple" onclick="showBox('profit-details-box')">
          <h3>صافي النتيجة 🔍</h3>
          <div class="number" id="net-profit">0 ر.س</div>
          <div class="hint">التقرير المالي النهائي</div>
        </div>
      </div>

      <!-- 1. تفاصيل الصفوف وإيراداتها -->
      <div id="classes-details-box" class="details-box">
        <div class="section-title teal">
          <span>🏫 تحليل إيرادات وأعداد كل صف دراسي</span>
          <button class="btn-toggle" onclick="hideBox('classes-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>اسم الصف / المستوى</th>
                <th>عدد الطلاب</th>
                <th>إجمالي المستحق</th>
                <th>الإيرادات المقبوضة</th>
                <th>المتبقي للتحصيل</th>
              </tr>
            </thead>
            <tbody id="classes-table"></tbody>
          </table>
        </div>
      </div>

      <!-- 2. تفاصيل الحضور والغياب -->
      <div id="attendance-details-box" class="details-box">
        <div class="section-title">
          <span>📅 سجل الحضور والغياب اليومي</span>
          <button class="btn-toggle" onclick="hideBox('attendance-details-box')">إغلاق ✖</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr><th>اسم الطفل</th>
