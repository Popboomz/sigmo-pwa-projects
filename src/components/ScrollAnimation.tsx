'use client';

import { useEffect } from 'react';

/**
 * 滚动动画控制器 - 性能优化版
 * 使用 IntersectionObserver 触发元素滚动时出现的动画
 * 包含性能优化和无障碍支持
 */
export function ScrollAnimationController() {
  useEffect(() => {
    // 检查用户是否偏好减少动画
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // 如果用户偏好减少动画，直接显示所有元素
    if (prefersReducedMotion) {
      const animatedElements = document.querySelectorAll(
        '.animate-on-scroll, .animate-from-left, .animate-from-right, .animate-scale, .animate-bounce-in, .animate-fade-in, .animate-slide-in-bottom, .animate-rotate-in'
      );
      animatedElements.forEach((el) => {
        el.classList.add('visible');
      });
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '50px', // 提前50px触发动画，更流畅
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // 动画完成后清理 will-change
          const element = entry.target as HTMLElement;
          element.addEventListener('transitionend', () => {
            element.style.willChange = 'auto';
          }, { once: true });

          // 动画触发后取消观察，避免重复触发，提升性能
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // 监听所有动画元素
    const animatedElements = document.querySelectorAll(
      '.animate-on-scroll, .animate-from-left, .animate-from-right, .animate-scale, .animate-bounce-in, .animate-fade-in, .animate-slide-in-bottom, .animate-rotate-in'
    );

    animatedElements.forEach((el) => observer.observe(el));

    // 清理
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}

/** 动画选择器常量 */
const ANIMATION_SELECTORS =
  '.animate-on-scroll, .animate-from-left, .animate-from-right, .animate-scale, .animate-bounce-in, .animate-fade-in, .animate-slide-in-bottom, .animate-rotate-in';

/**
 * 便捷 Hook，在需要滚动动画的组件中使用
 * 包含性能优化：will-change 清理 + 触发后取消观察
 */
export function useScrollAnimation() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const animatedElements = document.querySelectorAll(ANIMATION_SELECTORS);

    if (prefersReducedMotion) {
      animatedElements.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            const element = entry.target as HTMLElement;
            element.addEventListener(
              'transitionend',
              () => {
                element.style.willChange = 'auto';
              },
              { once: true }
            );

            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '50px', threshold: 0.1 }
    );

    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);
}
