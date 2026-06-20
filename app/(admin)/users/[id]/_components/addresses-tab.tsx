import { listAddressesByUser } from "@/lib/data/addresses";
import { AddressPanel } from "./address-panel";

/** Server tab: loads a user's shipping addresses and renders the CRUD panel. */
export async function AddressesTab({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const addresses = await listAddressesByUser(userId);
  return (
    <AddressPanel userId={userId} addresses={addresses} canManage={canManage} />
  );
}
