'use client';
import { useState } from 'react';
import { formatCurrency, formatDateTime, formatId } from '@/lib/utils';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import TrackingModal from './tracking-modal';

interface Order {
  id: string;
  createdAt: Date;
  totalPrice: number | string;
  isPaid: boolean;
  paidAt?: Date | null;
  isDelivered: boolean;
  deliveredAt?: Date | null;
  trackingNumber?: string | null;
}

interface OrdersClientProps {
  orders: Order[];
  page: number;
  totalPages: number;
}

const OrdersClient = ({ orders, page, totalPages }: OrdersClientProps) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  const handleTrackClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsTrackingOpen(true);
  };

  return (
    <>
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='h2-bold'>Orders</h2>
          <Link href='/user/profile/inbox'>
            <Button
              variant='outline'
              size='sm'
              className='text-xs font-medium'
            >
              Inbox
            </Button>
          </Link>
        </div>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>DATE</TableHead>
                <TableHead>TOTAL</TableHead>
                <TableHead>PAID</TableHead>
                <TableHead>DELIVERED</TableHead>
                <TableHead>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{formatId(order.id)}</TableCell>
                  <TableCell>
                    {formatDateTime(order.createdAt).dateTime}
                  </TableCell>
                  <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                  <TableCell>
                    {order.isPaid && order.paidAt
                      ? formatDateTime(order.paidAt).dateTime
                      : 'Not Paid'}
                  </TableCell>
                  <TableCell>
                    {order.isDelivered && order.deliveredAt
                      ? formatDateTime(order.deliveredAt).dateTime
                      : 'Not Delivered'}
                  </TableCell>
                  <TableCell className='space-x-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleTrackClick(order.id)}
                      className='gap-1'
                    >
                      <Package className='h-4 w-4' />
                      Track
                    </Button>
                    <Link href={`/order/${order.id}`}>
                      <Button variant='outline' size='sm'>
                        Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
            />
          )}
        </div>
      </div>

      {selectedOrderId && (
        <TrackingModal
          orderId={selectedOrderId}
          isOpen={isTrackingOpen}
          onClose={() => {
            setIsTrackingOpen(false);
            setSelectedOrderId(null);
          }}
        />
      )}
    </>
  );
};

export default OrdersClient;
