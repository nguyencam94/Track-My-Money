import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from './error-handler';

export async function updateUserProfile(userId: string, data: any) {
  const profileRef = doc(db, 'users', userId);
  try {
    await updateDoc(profileRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

export function subscribeTransactions(userId: string, callback: (data: any[]) => void) {
  const q = query(
    collection(db, 'users', userId, 'transactions'),
    orderBy('date', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
    }));
    callback(transactions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/transactions`);
  });
}

export function subscribeDebts(userId: string, callback: (data: any[]) => void) {
  const q = query(
    collection(db, 'users', userId, 'debts'),
    orderBy('startDate', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const debts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: (doc.data().startDate as Timestamp).toDate(),
      endDate: doc.data().endDate ? (doc.data().endDate as Timestamp).toDate() : null,
    }));
    callback(debts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/debts`);
  });
}

export async function cleanupDuplicateFunds(userId: string) {
  const path = `users/${userId}/funds`;
  try {
    const fundsRef = collection(db, path);
    const snapshot = await getDocs(fundsRef);
    const funds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    
    const fundsByType: Record<string, any[]> = {};
    funds.forEach(f => {
      if (!fundsByType[f.type]) fundsByType[f.type] = [];
      fundsByType[f.type].push(f);
    });

    for (const type in fundsByType) {
      const duplicates = fundsByType[type];
      if (duplicates.length > 1) {
        // Sort by createdAt or just pick first
        duplicates.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        const master = duplicates[0];
        const others = duplicates.slice(1);

        let mergedBalance = master.balance || 0;
        for (const other of others) {
          mergedBalance += (other.balance || 0);
          // Delete duplicate
          await deleteDoc(doc(db, 'users', userId, 'funds', other.id));
          
          // Migrate transactions that used this fund to the master one
          const transactionsRef = collection(db, 'users', userId, 'transactions');
          const q = query(transactionsRef, where('fundId', '==', other.id));
          const txSnap = await getDocs(q);
          const migratePromises = txSnap.docs.map(d => updateDoc(d.ref, { fundId: master.id }));
          await Promise.all(migratePromises);
        }

        // Update master balance
        await updateDoc(doc(db, 'users', userId, 'funds', master.id), { balance: mergedBalance });
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function addTransaction(userId: string, data: any) {
  const path = `users/${userId}/transactions`;
  try {
    const transactionRef = await addDoc(collection(db, path), {
      ...data,
      userId,
      date: Timestamp.fromDate(new Date(data.date)),
    });

    // If a fund is associated with this transaction, update its balance
    if (data.fundId) {
      const fundRef = doc(db, 'users', userId, 'funds', data.fundId);
      const fundSnap = await getDoc(fundRef);
      if (fundSnap.exists()) {
        const currentBalance = fundSnap.data().balance || 0;
        const amount = Number(data.amount) || 0;
        const newBalance = data.type === 'income' 
          ? currentBalance + amount 
          : currentBalance - amount;
        
        await updateDoc(fundRef, { balance: newBalance });
      }
    }

    return transactionRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransaction(userId: string, transactionId: string, data: any, oldData: any) {
  if (!transactionId) {
    console.error('updateTransaction: transactionId is undefined');
    return;
  }
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
    
    // Use Number() to avoid string concatenation bugs
    const newAmount = Number(data.amount) || 0;
    const oldAmount = oldData ? (Number(oldData.amount) || 0) : 0;
    const oldFundId = oldData?.fundId;
    const oldType = oldData?.type;

    // 1. If fund changed or type changed, revert old and apply new separately
    if (oldFundId !== data.fundId || oldType !== data.type) {
      // Revert old fund impact
      if (oldFundId) {
        const oldFundRef = doc(db, 'users', userId, 'funds', oldFundId);
        const oldFundSnap = await getDoc(oldFundRef);
        if (oldFundSnap.exists()) {
          const currentBalance = oldFundSnap.data().balance || 0;
          const revertedBalance = oldType === 'income' 
            ? currentBalance - oldAmount 
            : currentBalance + oldAmount;
          await updateDoc(oldFundRef, { balance: revertedBalance });
        }
      }

      // Apply new fund impact
      if (data.fundId) {
        const newFundRef = doc(db, 'users', userId, 'funds', data.fundId);
        const newFundSnap = await getDoc(newFundRef);
        if (newFundSnap.exists()) {
          const currentBalance = newFundSnap.data().balance || 0;
          const newBalance = data.type === 'income' 
            ? currentBalance + newAmount 
            : currentBalance - newAmount;
          await updateDoc(newFundRef, { balance: newBalance });
        }
      }
    } else if (data.fundId && oldAmount !== newAmount) {
      // Same fund, same type, but different amount - calculate delta
      const fundRef = doc(db, 'users', userId, 'funds', data.fundId);
      const fundSnap = await getDoc(fundRef);
      if (fundSnap.exists()) {
        const currentBalance = fundSnap.data().balance || 0;
        const delta = newAmount - oldAmount;
        const newBalance = data.type === 'income' 
          ? currentBalance + delta 
          : currentBalance - delta;
        await updateDoc(fundRef, { balance: newBalance });
      }
    }

    // 2. Update the transaction itself
    await updateDoc(transactionRef, {
      ...data,
      date: Timestamp.fromDate(new Date(data.date)),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addDebt(userId: string, data: any) {
  const path = `users/${userId}/debts`;
  try {
    const debtRef = await addDoc(collection(db, path), {
      ...data,
      userId,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
    });
    
    // Generate installments if it's an installment debt
    if (data.category === 'installment') {
      const totalPeriods = data.totalPeriods || 0;
      const completedPeriods = data.completedPeriods || 0;
      
      for (let i = 1; i <= totalPeriods; i++) {
        const dueDate = new Date(data.startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const isPaid = i <= completedPeriods;
        
        await addDoc(collection(db, 'users', userId, 'debts', debtRef.id, 'schedule'), {
          userId,
          debtId: debtRef.id,
          dueDate: Timestamp.fromDate(dueDate),
          amount: data.monthlyInstallment,
          status: isPaid ? 'paid' : 'pending',
          paidAt: isPaid ? Timestamp.fromDate(new Date(data.startDate)) : null // Approximation for historical payments
        });
      }
    }
    
    return debtRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDebt(userId: string, debtId: string, data: any) {
  const path = `users/${userId}/debts/${debtId}`;
  try {
    const debtRef = doc(db, 'users', userId, 'debts', debtId);
    
    const updateData = {
      ...data,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
    };

    return await updateDoc(debtRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function payInstallment(userId: string, debtId: string, scheduleId: string, amount: number, debtTitle: string) {
  try {
    // 1. Mark installment as paid
    const scheduleRef = doc(db, 'users', userId, 'debts', debtId, 'schedule', scheduleId);
    await updateDoc(scheduleRef, {
      status: 'paid',
      paidAt: Timestamp.fromDate(new Date())
    });

    // 2. Add transaction record
    await addTransaction(userId, {
      amount,
      type: 'expense',
      category: 'Trả nợ',
      note: `Trả góp: ${debtTitle}`,
      date: new Date(),
      debtId
    });

    // 3. Update debt remaining amount
    const debtRef = doc(db, 'users', userId, 'debts', debtId);
    // Get all paid installments for this debt
    const paidSnap = await getDocs(query(
      collection(db, 'users', userId, 'debts', debtId, 'schedule'), 
      where('status', '==', 'paid')
    ));
    const paidAmount = paidSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    // Get the initial debt to know totalAmount
    const debtSnap = await getDoc(debtRef);
    if (debtSnap.exists()) {
      const debtData = debtSnap.data();
      const newRemaining = Math.max(0, debtData.totalAmount - paidAmount);
      
      await updateDoc(debtRef, { 
        remainingAmount: newRemaining,
        completedPeriods: paidSnap.size,
        status: newRemaining === 0 ? 'paid' : 'active'
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/debts/${debtId}/schedule/${scheduleId}`);
  }
}

export async function deleteAllTransactions(userId: string) {
  const path = `users/${userId}/transactions`;
  try {
    const transactionsRef = collection(db, path);
    const snapshot = await getDocs(transactionsRef);
    const batch = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeFunds(userId: string, callback: (data: any[]) => void) {
  const q = query(
    collection(db, 'users', userId, 'funds'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const funds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(funds);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/funds`);
  });
}

export async function initializeFunds(userId: string) {
  const path = `users/${userId}/funds`;
  try {
    const fundsRef = collection(db, path);
    const existingSnap = await getDocs(fundsRef);
    
    const initialFunds = [
      { name: 'Quỹ tiêu dùng', type: 'consumption', balance: 0, description: 'Mua sắm, đổ xăng, sinh hoạt hàng ngày...', icon: 'ShoppingBag' },
      { name: 'Quỹ tiết kiệm', type: 'savings', balance: 0, description: 'Tiền dành dụm cho tương lai.', icon: 'PiggyBank' },
      { name: 'Quỹ trả nợ', type: 'debt', balance: 0, description: 'Dành riêng để trả nợ tháng này và tháng tới.', icon: 'CreditCard' },
      { name: 'Quỹ đầu tư', type: 'investment', balance: 0, description: 'Đầu tư vào các dự án cá nhân.', icon: 'Briefcase' }
    ];

    if (existingSnap.empty) {
      for (const fund of initialFunds) {
        await addDoc(fundsRef, {
          ...fund,
          userId,
          createdAt: Timestamp.now()
        });
      }
    } else {
      // Cleanup any duplicates that might have been created by previous bugs
      await cleanupDuplicateFunds(userId);
      
      // Refresh snapshot after cleanup
      const currentSnap = await getDocs(fundsRef);
      const existingTypes = new Set(currentSnap.docs.map(d => d.data().type));
      for (const fund of initialFunds) {
        if (!existingTypes.has(fund.type)) {
          await addDoc(fundsRef, {
            ...fund,
            userId,
            createdAt: Timestamp.now()
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resetAllFunds(userId: string) {
  const path = `users/${userId}/funds`;
  try {
    const fundsRef = collection(db, path);
    const snapshot = await getDocs(fundsRef);
    const promises = snapshot.docs.map(d => updateDoc(d.ref, { balance: 0 }));
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateFundBalance(userId: string, fundId: string, newBalance: number) {
  const path = `users/${userId}/funds/${fundId}`;
  try {
    const fundRef = doc(db, 'users', userId, 'funds', fundId);
    return await updateDoc(fundRef, { balance: newBalance });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function transferFunds(userId: string, sourceFundId: string, targetFundId: string, amount: number, note: string = '') {
  try {
    // 1. Get current balances
    const sourceRef = doc(db, 'users', userId, 'funds', sourceFundId);
    const targetRef = doc(db, 'users', userId, 'funds', targetFundId);
    
    const [sourceSnap, targetSnap] = await Promise.all([
      getDoc(sourceRef),
      getDoc(targetRef)
    ]);

    if (!sourceSnap.exists() || !targetSnap.exists()) {
      throw new Error('Một hoặc cả hai quỹ không tồn tại.');
    }

    const sourceData = sourceSnap.data();
    const targetData = targetSnap.data();

    if (sourceData.balance < amount) {
      throw new Error('Số dư quỹ nguồn không đủ để thực hiện chuyển tiền.');
    }

    // 2. Perform updates and create meta-transactions
    await Promise.all([
      updateDoc(sourceRef, { balance: sourceData.balance - amount }),
      updateDoc(targetRef, { balance: targetData.balance + amount }),
      // Record transaction for source fund (expense)
      addDoc(collection(db, 'users', userId, 'transactions'), {
        userId,
        amount,
        type: 'expense',
        category: 'Chuyển quỹ',
        note: `Chuyển đến ${targetData.name}${note ? ': ' + note : ''}`,
        date: Timestamp.now(),
        fundId: sourceFundId,
        isTransfer: true
      }),
      // Record transaction for target fund (income)
      addDoc(collection(db, 'users', userId, 'transactions'), {
        userId,
        amount,
        type: 'income',
        category: 'Chuyển quỹ',
        note: `Nhận từ ${sourceData.name}${note ? ': ' + note : ''}`,
        date: Timestamp.now(),
        fundId: targetFundId,
        isTransfer: true
      })
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/funds`);
  }
}

export async function migrateDataToKUnits(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      // If already migrated, skip
      if (userData.migratedToKUnits) return;

      const updates: any = { migratedToKUnits: true };
      
      // Threshold lowered: common values in VND are usually > 10,000 (10k)
      // Most transactions in k-unit won't exceed 10,000k (10 million VND) for daily tracking
      if (userData.monthlyBudget > 10000) {
        updates.monthlyBudget = userData.monthlyBudget / 1000;
      }
      
      await updateDoc(userRef, updates);
    }

    const MIGRATION_THRESHOLD = 10000;

    // Fix funds
    const fundsSnap = await getDocs(collection(db, 'users', userId, 'funds'));
    for (const fundDoc of fundsSnap.docs) {
      const balance = fundDoc.data().balance;
      if (Math.abs(balance) > MIGRATION_THRESHOLD) {
        await updateDoc(fundDoc.ref, { balance: balance / 1000 });
      }
    }

    // Fix debts
    const debtsSnap = await getDocs(collection(db, 'users', userId, 'debts'));
    for (const debtDoc of debtsSnap.docs) {
      const data = debtDoc.data();
      const updates: any = {};
      
      if (data.totalAmount > MIGRATION_THRESHOLD) updates.totalAmount = data.totalAmount / 1000;
      if (data.remainingAmount > MIGRATION_THRESHOLD) updates.remainingAmount = data.remainingAmount / 1000;
      if (data.monthlyInstallment > MIGRATION_THRESHOLD) updates.monthlyInstallment = data.monthlyInstallment / 1000;
      if (data.principalAmount > MIGRATION_THRESHOLD) updates.principalAmount = data.principalAmount / 1000;
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(debtDoc.ref, updates);
        
        // Also fix schedule if it exists
        const scheduleSnap = await getDocs(collection(db, 'users', userId, 'debts', debtDoc.id, 'schedule'));
        for (const scheduleDoc of scheduleSnap.docs) {
          if (scheduleDoc.data().amount > MIGRATION_THRESHOLD) {
            await updateDoc(scheduleDoc.ref, { amount: scheduleDoc.data().amount / 1000 });
          }
        }
      }
    }

    // Fix transactions
    const txSnap = await getDocs(collection(db, 'users', userId, 'transactions'));
    for (const txDoc of txSnap.docs) {
      const amount = txDoc.data().amount;
      if (amount > MIGRATION_THRESHOLD) {
        await updateDoc(txDoc.ref, { amount: amount / 1000 });
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}
