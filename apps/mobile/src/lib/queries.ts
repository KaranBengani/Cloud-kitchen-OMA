import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Customer, Due, MenuItem, Order, OrderInput, OrderStatus, PaymentInput } from './types';

// One place for every server call the screens make. In React web you'd write the same hooks;
// React Query is identical on native. Query keys group data so a mutation can refresh what it affects.
export const keys = {
  menu: ['menu'] as const,
  customers: (q: string) => ['customers', q] as const,
  orders: (from?: string, to?: string) => ['orders', from, to] as const,
  order: (id: number) => ['order', id] as const,
  dues: ['dues'] as const,
};

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const useMenu = () => useQuery({ queryKey: keys.menu, queryFn: () => api<MenuItem[]>('/menu-items') });

export function useSaveMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<MenuItem> & { id?: number }) =>
      id ? api<MenuItem>(`/menu-items/${id}`, json('PATCH', body)) : api<MenuItem>('/menu-items', json('POST', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.menu }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/menu-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.menu }),
  });
}

export const useCustomers = (q: string) =>
  useQuery({
    queryKey: keys.customers(q),
    queryFn: () => api<Customer[]>(`/customers?q=${encodeURIComponent(q)}`),
  });

export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Customer> & { id?: number }) =>
      id ? api<Customer>(`/customers/${id}`, json('PATCH', body)) : api<Customer>('/customers', json('POST', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export const useOrders = (from?: string, to?: string) =>
  useQuery({
    queryKey: keys.orders(from, to),
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return api<Order[]>(`/orders?${params}`);
    },
  });

export const useOrder = (id: number) =>
  useQuery({ queryKey: keys.order(id), queryFn: () => api<Order>(`/orders/${id}`) });

export const useDues = () => useQuery({ queryKey: keys.dues, queryFn: () => api<Due[]>('/dues') });

// Any order write can change the list, the calendar, the detail screen and the dues screen.
function useOrderWrite<TInput>(request: (input: TInput) => Promise<Order>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: keys.dues });
    },
  });
}

export const useCreateOrder = () =>
  useOrderWrite((input: OrderInput & { advance?: PaymentInput }) => api<Order>('/orders', json('POST', input)));

// A 409 here means another phone saved first; the screen shows the reload message (DECISIONS.md D6).
export const useUpdateOrder = () =>
  useOrderWrite(({ id, ...input }: OrderInput & { id: number; version: number }) =>
    api<Order>(`/orders/${id}`, json('PUT', input)),
  );

export const useSetOrderStatus = () =>
  useOrderWrite(({ id, ...input }: { id: number; status: OrderStatus; version: number }) =>
    api<Order>(`/orders/${id}/status`, json('PATCH', input)),
  );

export const useAddPayment = () =>
  useOrderWrite(({ orderId, ...input }: PaymentInput & { orderId: number }) =>
    api<Order>(`/orders/${orderId}/payments`, json('POST', input)),
  );

export const useDeletePayment = () =>
  useOrderWrite(({ orderId, paymentId }: { orderId: number; paymentId: number }) =>
    api<Order>(`/orders/${orderId}/payments/${paymentId}`, { method: 'DELETE' }),
  );
