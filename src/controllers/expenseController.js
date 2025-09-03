const Expense = require('../models/expenseModel');

exports.addExpense = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const { tripId } = req.params;
      const expenseData = {
      ...req.body,
      isPaid: req.body.isPaid ? 1 : 0,
      amount: parseFloat(req.body.amount) || 0
    };
    const id = await Expense.createExpense(tripId, expenseData, userId);
    res.json({ success: true, expenseId: id });
  } catch (err) {
    console.error("addExpense error:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    const rows = await Expense.getExpensesByTrip(tripId);
    res.json(rows);
  } catch (err) {
    console.error("getExpenses error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
        const expenseData = {
      ...req.body,
      isPaid: req.body.isPaid ? 1 : 0,
      amount: parseFloat(req.body.amount) || 0
    };

    await Expense.updateExpense(expenseId, expenseData);
    res.json({ success: true });
  } catch (err) {
    console.error("updateExpense error:", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    await Expense.deleteExpense(expenseId);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteExpense error:", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};
