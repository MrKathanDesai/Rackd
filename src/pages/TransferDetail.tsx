import React from 'react';
import { OperationDetail } from './OperationDetail';
import { MOCK_OPERATIONS } from '../constants';

export const TransferDetail: React.FC = () => {
  return <OperationDetail operations={MOCK_OPERATIONS} type="transfer" typeLabel="Transfers" />;
};
