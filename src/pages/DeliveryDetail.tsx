import React from 'react';
import { OperationDetail } from './OperationDetail';
import { MOCK_OPERATIONS } from '../constants';

export const DeliveryDetail: React.FC = () => {
  return <OperationDetail operations={MOCK_OPERATIONS} type="delivery" typeLabel="Deliveries" />;
};
