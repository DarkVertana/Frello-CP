"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Makes the store's configured currency (from General settings) available to
 * client components — price cells, the product form — without threading it
 * through every wrapper. The admin layout reads it server-side once and
 * provides it here.
 */
const CurrencyContext = createContext<string>("INR");

export function CurrencyProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): string {
  return useContext(CurrencyContext);
}
