import { Metadata } from 'next';
import { getMyOrders } from '@/lib/actions/order-actions';
import OrdersClient from './orders-client';
import { convertToPlainObject } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'My Orders',
};

const OrdersPage = async (props: {
  searchParams: Promise<{ page: string }>;
}) => {
  const { page } = await props.searchParams;

  const orders = await getMyOrders({
    page: Number(page) || 1,
  });

  const plainOrders = convertToPlainObject(orders.data);

  return (
    <OrdersClient
      orders={plainOrders}
      page={Number(page) || 1}
      totalPages={orders.totalPages}
    />
  );
};

export default OrdersPage;
