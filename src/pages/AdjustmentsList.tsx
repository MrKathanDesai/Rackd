import React from 'react';
import { OperationsList } from './OperationsList';
import { MOCK_OPERATIONS } from '../constants';

export const AdjustmentsList: React.FC = () => {
  return <OperationsList operations={MOCK_OPERATIONS} type="adjustment" typeLabel="Adjustments" />;
};
