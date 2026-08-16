import { NextResponse } from 'next/server';
import { getMyCart } from '@/lib/actions/cart.actions';
import { convertToPlainObject, formatError } from '@/lib/utils';

export async function GET() {
  try {
    const cart = await getMyCart();
    return NextResponse.json(convertToPlainObject(cart));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: formatError(error) },
      { status: 500 }
    );
  }
}
