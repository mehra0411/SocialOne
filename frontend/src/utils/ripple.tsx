import { useEffect, useRef } from 'react';

export function useRipple<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const createRipple = (e: MouseEvent) => {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.6)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple-animation 0.6s ease-out';
      ripple.style.pointerEvents = 'none';

      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      element.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    };

    element.addEventListener('click', createRipple);

    return () => {
      element.removeEventListener('click', createRipple);
    };
  }, []);

  return elementRef;
}

// Add ripple animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
if (!document.head.querySelector('style[data-ripple]')) {
  style.setAttribute('data-ripple', 'true');
  document.head.appendChild(style);
}
