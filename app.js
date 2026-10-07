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
let bookSales = []; // سجل مبيعات الكتب

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
        max-width: 1300px; 
        margin: 0 auto; 
        background: #ffffff; 
        padding: 30px; 
        border-radius: 16px; 
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); 
      }
      .header-title { text-align: center; margin-bottom: 30px; }
      .header-title h1 { color: #0f172a; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; }
      .header-title p { color: #64748b; font-size: 14px; margin: 0; }
      
      .stats-cards { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
        gap: 16px; 
        margin-bottom: 30px; 
      }
      .card { 
        padding: 20px 16px; 
        background: #ffffff; 
        border-radius: 14px; 
        text-align: center; 
        border: 1px solid #e2e8f0; 
        transition: all 0.25s ease; 
        cursor: pointer; 
        position: relative;
        overflow: hidden;
      }
      .card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08); }
      .card::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 4px; }
      .card.blue::before { background: #3b82f6; }
      .card.teal::before { background: #0d9488; }
      .card.orange::before { background: #f59e0b; }
      .card.green::before { background: #10b981; }
      .card.red::before { background: #ef4444; }
      .card.purple::before { background: #8b5cf6; }

      .card h3 { margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 500; }
      .card .number { font-size: 22px; font-weight: 700; color: #0f172a; }
      .card .hint { font-size: 11px; color: #94a3b8; margin-top: 6px; }

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
      .section-title.orange { border-bottom-color: #fde68a; color: #d97706; }

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
        flex: 1;
        min-width: 140px;
        outline: none;
      }
      input:focus, select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }

      button { 
        padding: 11px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-family: inherit;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      button.btn-primary { background: #3b82f6; color: #ffffff; }
      button.btn-expense { background: #ef4444; color: #ffffff; }
      button.btn-success { background: #10b981; color: #ffffff; }
      button.btn-orange { background: #f59e0b; color: #ffffff; }
      button.btn-pay { background: #059669; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-absent { background: #f43f5e; color: #ffffff; padding: 6px 12px; font-size: 12px; }
      button.btn-delete { background: #94a3b8; color: #ffffff; padding: 5px 10px; font-size: 11px; }
      button.btn-toggle { background: #f1f5f9; color: #475569; font-size: 12px; padding: 6px 12px; border: 1px solid #e2e8f0; }

      .table-responsive { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 1
