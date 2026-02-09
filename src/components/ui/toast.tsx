'use client';

import * as React from "react"

import { toast as sonnerToast } from "sonner"
import { Loader2 } from "lucide-react"

type ToasterToast = typeof sonnerToast

// Type definitions for compatibility
export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type ToastActionElement = React.ReactNode

const Toaster = () => {
  return (
    <div id="toast-portal" />
  )
}

// Export toast components for compatibility
export const toast = sonnerToast
export const useToast = () => ({ toast: sonnerToast })

// Dummy exports for compatibility with children support
export const Toast = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastAction = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastClose = () => null
export const ToastTitle = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastDescription = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ToastViewport = () => null
