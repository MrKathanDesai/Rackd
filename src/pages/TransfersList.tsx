import React from 'react';
import { OperationsList } from './OperationsList';
import { MOCK_OPERATIONS } from '../constants';

export const TransfersList: React.FC = () => {
  return <OperationsList operations={MOCK_OPERATIONS} type="transfer" typeLabel="Transfers" />;
};
