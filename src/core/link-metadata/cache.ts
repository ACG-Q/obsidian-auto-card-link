/**
 * 链接元数据缓存
 * 
 * 负责缓存已获取的元数据，减少重复请求
 */

import { LinkMetadata } from "src/types/metadata";
import { CacheError } from "src/types/errors";

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  /**
   * 缓存的数据
   */
  data: T;
  
  /**
   * 缓存创建时间戳
   */
  timestamp: number;
  
  /**
   * 缓存过期时间戳
   */
  expiry: number;
}

/**
 * 缓存配置接口
 */
export interface CacheOptions {
  /**
   * 缓存有效期（毫秒）
   */
  ttl?: number;
  
  /**
   * 最大缓存项数量
   */
  maxItems?: number;
}

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 3600000, // 1小时
  maxItems: 100,
};

/**
 * 元数据缓存类
 */
export class MetadataCache {
  private cache: Map<string, CacheItem<LinkMetadata>> = new Map();
  private options: CacheOptions;
  
  /**
   * 创建元数据缓存实例
   * 
   * @param options 缓存配置
   */
  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }
  
  /**
   * 获取缓存的元数据
   * 
   * @param url 网页URL
   * @returns 缓存的元数据，如果不存在或已过期则返回undefined
   */
  public get(url: string): LinkMetadata | undefined {
    try {
      const cacheKey = this.getCacheKey(url);
      const item = this.cache.get(cacheKey);
      
      // 检查缓存项是否存在且未过期
      if (item && Date.now() < item.expiry) {
        return item.data;
      }
      
      // 缓存不存在或已过期，删除过期项
      if (item) {
        this.cache.delete(cacheKey);
      }
      
      return undefined;
    } catch (error) {
      throw new CacheError(`Failed to get cache for ${url}: ${(error as Error).message}`);
    }
  }
  
  /**
   * 设置缓存的元数据
   * 
   * @param url 网页URL
   * @param metadata 元数据
   */
  public set(url: string, metadata: LinkMetadata): void {
    try {
      const cacheKey = this.getCacheKey(url);
      const now = Date.now();
      
      // 创建缓存项
      const item: CacheItem<LinkMetadata> = {
        data: metadata,
        timestamp: now,
        expiry: now + this.options.ttl!,
      };
      
      // 设置缓存
      this.cache.set(cacheKey, item);
      
      // 如果缓存项数量超过最大值，删除最旧的项
      if (this.cache.size > this.options.maxItems!) {
        this.evictOldest();
      }
    } catch (error) {
      throw new CacheError(`Failed to set cache for ${url}: ${(error as Error).message}`);
    }
  }
  
  /**
   * 清除指定URL的缓存
   * 
   * @param url 网页URL
   */
  public delete(url: string): void {
    const cacheKey = this.getCacheKey(url);
    this.cache.delete(cacheKey);
  }
  
  /**
   * 清除所有缓存
   */
  public clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存键
   * 
   * @param url 网页URL
   * @returns 缓存键
   */
  private getCacheKey(url: string): string {
    // 简单规范化URL作为缓存键
    return url.trim().toLowerCase();
  }
  
  /**
   * 删除最旧的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    // 查找最旧的缓存项
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    // 删除最旧的缓存项
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计信息，包括缓存大小和所有缓存键
   */
  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}