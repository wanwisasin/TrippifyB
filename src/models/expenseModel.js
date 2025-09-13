const db = require('../utils/db');

exports.createExpense = async (tripId, data, userId) => {
  const [result] = await db.query(
    `INSERT INTO trip_expenses
     (trip_id, user_id, category, amount, currency, note, paid_by, is_paid, split_with, date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tripId,
      userId,
      data.category,
      data.amount,
      data.currency,
      data.note,
      data.paidBy,
      data.isPaid ? 1 : 0,
      JSON.stringify(data.splitWith || []),
      data.date,
    ]
  );
  return result.insertId;
};

exports.getExpensesByTrip = async (tripId) => {
  const [rows] = await db.query(
    `SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY date DESC`,
    [tripId]
  );
  return rows.map(e => ({
    ...e,
    paidBy: e.paid_by,       
    isPaid: e.is_paid === 1,         
    splitWith: JSON.parse(e.split_with || "[]")
  }));
};

exports.updateExpense = async (expenseId, data) => {
  await db.query(
    `UPDATE trip_expenses
     SET category=?, amount=?, currency=?, note=?, paid_by=?, is_paid=?, split_with=?, date=? 
     WHERE expense_id=?`,
    [
      data.category,
      data.amount,
      data.currency,
      data.note,
      data.paidBy,
      data.isPaid ? 1 : 0,
      JSON.stringify(data.splitWith || []),
      data.date,
      expenseId,
    ]
  );
};

exports.deleteExpense = async (expenseId) => {
  await db.query(`DELETE FROM trip_expenses WHERE expense_id=?`, [expenseId]);
};
