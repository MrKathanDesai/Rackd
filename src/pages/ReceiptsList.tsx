import React from 'react';
import { OperationsList } from './OperationsList';
import { MOCK_OPERATIONS } from '../constants';

export const ReceiptsList: React.FC = () => {
  return <OperationsList operations={MOCK_OPERATIONS} type="receipt" typeLabel="Receipts" />;
};
