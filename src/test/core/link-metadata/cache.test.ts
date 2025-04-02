/**
 * MetadataCache单元测试
 */

import { MetadataCache } from '../../../core/link-metadata/cache';
import { LinkMetadata } from '../../../types/metadata';

describe('MetadataCache', () => {
  let cache: MetadataCache;
  let testMetadata: LinkMetadata;
  
  beforeEach(() => {
    // 创建测试实例，设置较短的TTL便于测试过期功能
    cache = new MetadataCache({
      ttl: 100, // 100毫秒
      maxItems: 3, // 最多3个缓存项
    });
    
    // 准备测试数据
    testMetadata = {
      url: 'https://example.com',
      title: 'Test Title',
      description: 'Test Description',
      image: 'https://example.com/image.jpg',
      siteName: 'Example Site',
      favicon: 'https://example.com/favicon.ico',
      indent: 0
    };
  });
  
  describe('set and get', () => {
    it('should store and retrieve metadata correctly', () => {
      // 设置缓存
      cache.set('https://example.com', testMetadata);
      
      // 获取缓存
      const result = cache.get('https://example.com');
      
      // 验证结果
      expect(result).toEqual(testMetadata);
    });
    
    it('should normalize URLs when used as cache keys', () => {
      // 设置缓存（使用带空格的URL）
      cache.set(' https://EXAMPLE.com ', testMetadata);
      
      // 获取缓存（使用小写URL）
      const result = cache.get('https://example.com');
      
      // 验证结果
      expect(result).toEqual(testMetadata);
    });
    
    it('should return undefined for non-existent cache entries', () => {
      // 获取不存在的缓存
      const result = cache.get('https://nonexistent.com');
      
      // 验证结果
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for expired cache entries', async () => {
      // 设置缓存
      cache.set('https://example.com', testMetadata);
      
      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 获取缓存
      const result = cache.get('https://example.com');
      
      // 验证结果
      expect(result).toBeUndefined();
    });
  });
  
  describe('delete', () => {
    it('should remove a specific cache entry', () => {
      // 设置缓存
      cache.set('https://example.com', testMetadata);
      cache.set('https://another.com', {...testMetadata, url: 'https://another.com'});
      
      // 删除特定缓存
      cache.delete('https://example.com');
      
      // 验证结果
      expect(cache.get('https://example.com')).toBeUndefined();
      expect(cache.get('https://another.com')).toBeDefined();
    });
  });
  
  describe('clear', () => {
    it('should remove all cache entries', () => {
      // 设置多个缓存
      cache.set('https://example.com', testMetadata);
      cache.set('https://another.com', {...testMetadata, url: 'https://another.com'});
      
      // 清除所有缓存
      cache.clear();
      
      // 验证结果
      expect(cache.get('https://example.com')).toBeUndefined();
      expect(cache.get('https://another.com')).toBeUndefined();
      
      // 验证缓存统计
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.keys.length).toBe(0);
    });
  });
  
  describe('eviction', () => {
    it('should evict oldest entry when cache size exceeds maxItems', () => {
      // 设置多个缓存项，超过最大限制
      cache.set('https://first.com', {...testMetadata, url: 'https://first.com', title: 'First'});
      cache.set('https://second.com', {...testMetadata, url: 'https://second.com', title: 'Second'});
      cache.set('https://third.com', {...testMetadata, url: 'https://third.com', title: 'Third'});
      
      // 添加第四个缓存项，应该导致第一个被淘汰
      cache.set('https://fourth.com', {...testMetadata, url: 'https://fourth.com', title: 'Fourth'});
      
      // 验证结果
      expect(cache.get('https://first.com')).toBeUndefined(); // 应该被淘汰
      expect(cache.get('https://second.com')).toBeDefined();
      expect(cache.get('https://third.com')).toBeDefined();
      expect(cache.get('https://fourth.com')).toBeDefined();
      
      // 验证缓存统计
      const stats = cache.getStats();
      expect(stats.size).toBe(3); // 最大缓存项数量为3
    });
  });
  
  describe('getStats', () => {
    it('should return correct cache statistics', () => {
      // 设置多个缓存
      cache.set('https://example.com', testMetadata);
      cache.set('https://another.com', {...testMetadata, url: 'https://another.com'});
      
      // 获取缓存统计
      const stats = cache.getStats();
      
      // 验证结果
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('https://example.com');
      expect(stats.keys).toContain('https://another.com');
    });
  });
});