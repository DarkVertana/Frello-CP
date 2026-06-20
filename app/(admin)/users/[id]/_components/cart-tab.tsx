import { ShoppingCart } from "lucide-react";
import { listCartByUser } from "@/lib/data/cart";
import { Card } from "../../../_components/card";
import { CartItems } from "./cart-items";

/** Server tab: loads a user's cart and renders the line items + totals. */
export async function CartTab({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const cart = await listCartByUser(userId);

  if (cart.items.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <ShoppingCart className="size-6 text-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Cart is empty</p>
          <p className="text-sm text-muted">
            Items this user adds to their cart in the app will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <CartItems
      userId={userId}
      items={cart.items}
      itemCount={cart.itemCount}
      subtotal={cart.subtotal}
      canManage={canManage}
    />
  );
}
