import React, { useCallback, useState } from 'react';
import ExpensesList from '../components/expense/ExpensesList';
import ExpensesForm from '../components/expense/ExpensesForm';
import Modal from '../components/ui/Modal';
import ExpensesCategoryList from '../components/expense/ExpensesCategoryList';
 
const ExpensesPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setInitialData(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((id, row) => {
    setEditingId(id);
    setInitialData(row || null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => setIsOpen(false), []);

  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
    setInitialData(null);
    setRefreshToken((x) => x + 1);
  }, []);

  return (
    <div className="p-2 sm:p-4">
      <ExpensesList onCreate={openCreate} onEdit={openEdit} refreshToken={refreshToken} />

      <div className="mt-6">
        <ExpensesCategoryList />
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} title={editingId ? 'Edit Expense' : 'Add Expense'} maxWidth="lg">
        <ExpensesForm
          expenseId={editingId}
          initialData={initialData}
          onSuccess={handleSuccess}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
};

export default ExpensesPage;