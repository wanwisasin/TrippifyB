const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

router.post('/:tripId', expenseController.addExpense);
router.get('/:tripId', expenseController.getExpenses);
router.put('/:expenseId', expenseController.updateExpense);
router.delete('/:expenseId', expenseController.deleteExpense);

module.exports = router;
