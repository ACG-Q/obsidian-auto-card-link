/**
 * 性能优化工具模块
 * 提供节流、防抖等性能优化功能
 */

/**
 * 节流函数 - 限制函数在一定时间内只能执行一次
 * 适用场景：滚动事件、窗口调整大小事件等高频触发的事件
 * 
 * @param fn 需要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    
    if (remaining <= 0) {
      // 已经超过延迟时间，可以立即执行
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeout) {
      // 设置定时器，确保最后一次调用也能执行
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 防抖函数 - 延迟执行函数，如果在延迟时间内再次调用则重新计时
 * 适用场景：搜索输入、表单验证等需要等待用户输入完成的场景
 * 
 * @param fn 需要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行（默认为false）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number, 
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    }, delay);
    
    if (callNow) {
      fn.apply(this, args);
    }
  };
}

/**
 * 批量处理函数 - 将多次操作合并为一次执行
 * 适用场景：多次DOM更新、多次API调用等
 * 
 * @param fn 需要批量处理的函数
 * @param delay 延迟时间（毫秒）
 * @returns 批量处理后的函数
 */
export function batch<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  const items: Parameters<T>[] = [];
  
  return function(this: any, ...args: Parameters<T>) {
    items.push(args);
    
    if (!timeout) {
      timeout = setTimeout(() => {
        const batchItems = [...items];
        items.length = 0;
        timeout = null;
        fn.call(this, batchItems);
      }, delay);
    }
  };
}

/**
 * 缓存函数结果 - 记忆化函数，缓存计算结果避免重复计算
 * 适用场景：复杂计算、重复调用相同参数的函数
 * 
 * @param fn 需要缓存结果的函数
 * @param resolver 可选的键解析函数，用于自定义缓存键
 * @returns 带缓存的函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * 延迟加载函数 - 延迟执行函数直到空闲时间
 * 适用场景：非关键任务、后台处理
 * 
 * @param fn 需要延迟执行的函数
 * @returns Promise，解析为函数执行结果
 */
export function idle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve) => {
      // 使用requestIdleCallback如果可用，否则使用setTimeout
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          resolve(fn.apply(this, args));
        });
      } else {
        setTimeout(() => {
          resolve(fn.apply(this, args));
        }, 1);
      }
    });
  };
}