import { useCallback, useEffect, useState } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

const toasts: Toast[] = [];
let toastId = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function toast({
  title,
  description,
  variant = "default",
}: Omit<Toast, "id">) {
  const id = (++toastId).toString();
  const newToast: Toast = { id, title, description, variant };

  toasts.push(newToast);
  notify();

  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      notify();
    }
  }, 3000);

  return id;
}

export function dismiss(toastId: string) {
  const index = toasts.findIndex((t) => t.id === toastId);
  if (index > -1) {
    toasts.splice(index, 1);
    notify();
  }
}

export function useToast() {
  const [, forceUpdate] = useState({});

  const toastFn = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      return toast({ title, description, variant });
    },
    []
  );

  const dismissFn = useCallback((toastId: string) => {
    return dismiss(toastId);
  }, []);

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    toast: toastFn,
    dismiss: dismissFn,
    toasts: [...toasts],
  };
}
