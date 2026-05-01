import ExcelJS from 'exceljs';
import * as expenseService from '../services/expenseService.js';
import { format } from 'date-fns';

const exportExpenses = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    // Get ALL matching expenses (no pagination limit)
    const filters = { ...req.query, page: 1, limit: 10000, export_all: 'true' };
    const result = await expenseService.getExpenses({ userId, role, filters });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OfficeFlow';
    const sheet = workbook.addWorksheet('Expenses');

    // Define columns
    sheet.columns = [
      { header: 'Employee', key: 'employee_name', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Type', key: 'expense_type', width: 12 },
      { header: 'Title', key: 'title', width: 28 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Amount (Rs.)', key: 'amount', width: 15 },
      { header: 'Expense Date', key: 'expense_date', width: 16 },
      { header: 'Submitted At', key: 'submitted_at', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Add data rows
    result.data.forEach((exp, i) => {
      const row = sheet.addRow({
        employee_name: exp.employee_name || 'N/A',
        department: exp.department || 'N/A',
        expense_type: exp.expense_type,
        title: exp.title,
        description: exp.description || '',
        amount: exp.amount,
        expense_date: exp.expense_date ? format(new Date(exp.expense_date), 'dd MMM yyyy') : 'N/A',
        submitted_at: exp.submitted_at ? format(new Date(exp.submitted_at), 'dd MMM yyyy') : 'N/A',
        status: exp.is_settled ? 'Settled' : 'Unsettled',
      });

      // Alternating row colors
      if (i % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8FF' } };
      }

      // Currency formatting
      row.getCell('amount').numFmt = '#,##0.00';
    });

    // Auto filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: result.data.length + 1, column: 9 }
    };

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Set response headers
    const fileName = `expenses-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export expenses error:', err);
    return res.status(500).json({ success: false, message: 'Export failed' });
  }
};

const exportLeave = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Leave export not yet implemented' });
};

const exportTrips = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Trips export not yet implemented' });
};

export const exportController = { exportExpenses, exportLeave, exportTrips };
