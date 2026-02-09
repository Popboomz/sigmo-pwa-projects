'use client';

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export interface ActionSheetOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export function actionSheet({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  destructive = true
}: ActionSheetOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'action-sheet-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 9998;
      opacity: 0;
      animation: fade-in 0.2s ease forwards;
    `;

    // 创建 action sheet
    const sheet = document.createElement('div');
    sheet.className = 'action-sheet';
    sheet.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-radius: 20px 20px 0 0;
      padding: 20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
      z-index: 9999;
      transform: translateY(100%);
      animation: slide-up 0.3s ease forwards;
      max-width: 500px;
      margin: 0 auto;
    `;

    // 添加样式到 head
    if (!document.getElementById('action-sheet-styles')) {
      const style = document.createElement('style');
      style.id = 'action-sheet-styles';
      style.textContent = `
        @keyframes fade-in {
          to { opacity: 1; }
        }
        @keyframes slide-up {
          to { transform: translateY(0); }
        }
        @keyframes slide-down {
          to { transform: translateY(100%); }
        }
        @keyframes fade-out {
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // 标题
    const titleEl = document.createElement('h3');
    titleEl.className = 'action-sheet-title';
    titleEl.style.cssText = `
      font-weight: 600;
      font-size: 1rem;
      color: #1A1A1A;
      text-align: center;
      margin-bottom: 8px;
    `;
    titleEl.textContent = title;
    sheet.appendChild(titleEl);

    // 消息
    if (message) {
      const messageEl = document.createElement('p');
      messageEl.className = 'action-sheet-message';
      messageEl.style.cssText = `
        color: #6B7280;
        font-size: 0.875rem;
        text-align: center;
        margin-bottom: 20px;
        line-height: 1.5;
      `;
      messageEl.textContent = message;
      sheet.appendChild(messageEl);
    }

    // 按钮容器
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'action-sheet-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-action-delete';
    confirmBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      background: ${destructive ? '#EF4444' : '#4A7C59'};
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    `;
    confirmBtn.innerHTML = destructive
      ? `${confirmText}`
      : `${confirmText}`;

    confirmBtn.onmouseenter = () => {
      confirmBtn.style.opacity = '0.9';
    };
    confirmBtn.onmouseleave = () => {
      confirmBtn.style.opacity = '1';
    };

    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-action-cancel';
    cancelBtn.style.cssText = `
      width: 100%;
      padding: 14px;
      background: #F3F4F6;
      border: none;
      border-radius: 12px;
      color: #374151;
      font-weight: 500;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.textContent = cancelText;

    cancelBtn.onmouseenter = () => {
      cancelBtn.style.background = '#E5E7EB';
    };
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.background = '#F3F4F6';
    };

    // 事件处理
    const close = (result: boolean) => {
      overlay.style.animation = 'fade-out 0.2s ease forwards';
      sheet.style.animation = 'slide-down 0.3s ease forwards';

      setTimeout(() => {
        overlay.remove();
        sheet.remove();
        resolve(result);
        if (result && onConfirm) {
          onConfirm();
        } else if (onCancel) {
          onCancel();
        }
      }, 300);
    };

    confirmBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    overlay.onclick = () => close(false);

    buttonsContainer.appendChild(confirmBtn);
    buttonsContainer.appendChild(cancelBtn);
    sheet.appendChild(buttonsContainer);

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    // 防止 body 滚动
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  });
}
