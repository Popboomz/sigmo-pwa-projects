'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
}

let toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function toast({ message, type = 'success', duration = 2000 }: ToastOptions) {
  const container = getToastContainer();

  // 触觉反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'success' ? 50 : [50, 50, 50]);
  }

  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: rgba(26, 26, 26, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    color: white;
    font-size: 0.9375rem;
    opacity: 0;
    z-index: 9999;
    animation: toast-slide-in 0.3s ease forwards;
  `;

  // 添加样式到 head
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toast-slide-in {
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes toast-slide-out {
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 添加图标
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  const iconColor = type === 'success' ? '#22C55E' : '#EF4444';
  icon.innerHTML = type === 'success'
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  toast.appendChild(icon);

  // 添加消息
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  messageSpan.style.cssText = 'white-space: nowrap;';
  toast.appendChild(messageSpan);

  container.appendChild(toast);

  // 自动消失
  setTimeout(() => {
    toast.style.animation = 'toast-slide-out 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
        toastContainer = null;
      }
    }, 300);
  }, duration);
}

// React Hook for toast
export function useToast() {
  return { toast };
}
