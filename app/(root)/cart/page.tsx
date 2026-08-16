import { getMyCart } from '@/lib/actions/cart.actions';
import CartTable from './cart-table';

export const metadata = {
  title: 'Shopping Cart',
};

const CartPage = async () => {
  const cart = await getMyCart();
  return (
    <>
      <CartTable cart={cart} />
      <p className="mt-4 text-xs text-slate-500">
        Checkout on the next step with secure Stripe payments and wallet options. Questions about size or shipping?
        Visit our support chat any time.
      </p>
    </>
  );
};

export default CartPage;
