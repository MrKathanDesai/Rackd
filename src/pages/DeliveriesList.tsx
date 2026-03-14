import React from 'react';
import { OperationsList } from './OperationsList';
import { MOCK_OPERATIONS } from '../constants';

export const DeliveriesList: React.FC = () => {
  return <OperationsList operations={MOCK_OPERATIONS} type="delivery" typeLabel="Deliveries" />;
};
