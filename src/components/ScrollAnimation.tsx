'use client';

import { useEffect } from 'react';

/**
 * 滚动动画控制器
 * 使用 IntersectionObserver 触发元素滚动时出现的动画
 */
export function ScrollAnimationController() {
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // 可选：动画触发后取消观察，避免重复触发
          // observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // 监听所有动画元素
    const animatedElements = document.querySelectorAll(
      '.animate-on-scroll, .animate-from-left, .animate-from-right, .animate-scale'
    );

    animatedElements.forEach((el) => observer.observe(el));

    // 清理
    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return null;
}

/**
 * 便捷 Hook，在需要滚动动画的组件中使用
 */
export function useScrollAnimation() {
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
      '.animate-on-scroll, .animate-from-left, .animate-from-right, .animate-scale'
    );

    animatedElements.forEach((el) => observer.observe(el));

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el));
    };
  }, []);
}
