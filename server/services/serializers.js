export function toId(doc) {
  return { ...doc.toObject(), id: String(doc._id), _id: undefined, __v: undefined, userId: undefined };
}

export function accountDto(doc) {
  const item = toId(doc);
  return { ...item, openingBalance: item.openingBalance ?? item.currentBalance ?? 0 };
}

export function cardDto(doc) {
  const item = toId(doc);
  return { ...item, startingDebt: item.startingDebt ?? item.currentDebt ?? 0 };
}

export function transactionDto(doc) {
  const item = toId(doc);
  return { ...item, paymentAccountId: item.paymentAccountId || undefined };
}
