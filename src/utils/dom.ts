/**
 * DOM操作优化工具模块
 * 提供优化的DOM操作方法，减少重绘和回流
 */

import { debounce, throttle } from './performance';

/**
 * 批量DOM更新 - 使用DocumentFragment减少重绘和回流
 * @param container 容器元素
 * @param createElementsFn 创建元素的函数
 */
export function batchDOMUpdate(
  container: HTMLElement,
  createElementsFn: () => HTMLElement[]
): void {
  // 使用DocumentFragment作为临时容器
  const fragment = document.createDocumentFragment();
  
  // 创建元素并添加到fragment
  const elements = createElementsFn();
  elements.forEach(el => fragment.appendChild(el));
  
  // 一次性将所有元素添加到DOM
  container.appendChild(fragment);
}

/**
 * 延迟加载图片
 * @param imgElement 图片元素
 * @param src 图片源URL
 * @param placeholder 占位图URL（可选）
 */
export function lazyLoadImage(
  imgElement: HTMLImageElement,
  src: string,
  placeholder?: string
): void {
  // 设置占位图
  if (placeholder) {
    imgElement.src = placeholder;
  }
  
  // 创建IntersectionObserver监听图片是否进入视口
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 图片进入视口，加载实际图片
          imgElement.src = src;
          // 图片加载完成后停止观察
          observer.unobserve(imgElement);
        }
      });
    }, { rootMargin: '50px' }); // 提前50px开始加载
    
    observer.observe(imgElement);
  } else {
    // 不支持IntersectionObserver的浏览器直接加载
    imgElement.src = src;
  }
}

/**
 * 创建节流滚动监听器
 * @param callback 滚动回调函数
 * @param delay 节流延迟（毫秒）
 * @returns 清除监听器的函数
 */
export function createThrottledScrollListener(
  callback: (event: Event) => void,
  delay = 100
): () => void {
  const throttledCallback = throttle(callback, delay);
  window.addEventListener('scroll', throttledCallback);
  
  // 返回清除函数
  return () => window.removeEventListener('scroll', throttledCallback);
}

/**
 * 优化的类名操作 - 批量更新类名
 * @param element 目标元素
 * @param classNames 要添加的类名数组
 * @param remove 是否移除这些类（默认为false，表示添加）
 */
export function updateClassNames(
  element: HTMLElement,
  classNames: string[],
  remove = false
): void {
  // 使用classList API批量操作
  if (remove) {
    element.classList.remove(...classNames);
  } else {
    element.classList.add(...classNames);
  }
}

/**
 * 安全地设置元素内容 - 防止XSS
 * @param element 目标元素
 * @param content 内容
 * @param asHTML 是否作为HTML插入（默认为false）
 */
export function setElementContent(
  element: HTMLElement,
  content: string,
  asHTML = false
): void {
  if (asHTML) {
    // 注意：只在内容可信的情况下使用
    element.innerHTML = content;
  } else {
    // 安全的文本内容设置
    element.textContent = content;
  }
}

/**
 * 创建防抖的尺寸调整监听器
 * @param callback 调整尺寸的回调函数
 * @param delay 防抖延迟（毫秒）
 * @returns 清除监听器的函数
 */
export function createDebouncedResizeListener(
  callback: (event: UIEvent) => void,
  delay = 200
): () => void {
  const debouncedCallback = debounce(callback, delay);
  window.addEventListener('resize', debouncedCallback as EventListener);
  
  // 返回清除函数
  return () => window.removeEventListener('resize', debouncedCallback as EventListener);
}

/**
 * 优化的元素创建函数 - 一次性设置多个属性
 * @param tag HTML标签名
 * @param attributes 属性对象
 * @param children 子元素数组
 * @returns 创建的HTML元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  children: (HTMLElement | string)[] = []
): HTMLElementTagNameMap[K] {
  // 创建元素
  const element = document.createElement(tag);
  
  // 设置属性
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // 添加子元素
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}