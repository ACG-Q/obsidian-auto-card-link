/**
 * LinkMetadataService单元测试
 */

import { LinkMetadataService, MetadataServiceOptions } from '../../../core/link-metadata/service';
import { MetadataFetcher } from '../../../core/link-metadata/fetcher';
import { MetadataParser } from '../../../core/link-metadata/parser';
import { MetadataCache } from '../../../core/link-metadata/cache';
import { LinkMetadata, ImageAttachmentSaverCallback } from '../../../types/metadata';
import { NetworkError } from '../../../types/errors';

// 模拟依赖组件
jest.mock('../../../core/link-metadata/fetcher');
jest.mock('../../../core/link-metadata/parser');
jest.mock('../../../core/link-metadata/cache');

describe('LinkMetadataService', () => {
  let service: LinkMetadataService;
  let mockSaveImageCallback: jest.Mock<Promise<string>, [string, string]>;
  let mockFetcher: jest.Mocked<MetadataFetcher>;
  let mockParser: jest.Mocked<MetadataParser>;
  let mockCache: jest.Mocked<MetadataCache>;
  
  // 测试数据
  const testUrl = 'https://example.com';
  const testHtmlContent = '<html><body>Test Content</body></html>';
  const testMetadata: LinkMetadata = {
    url: testUrl,
    title: 'Test Title',
    description: 'Test Description',
    image: 'https://example.com/image.jpg',
    siteName: 'Example Site',
    favicon: 'https://example.com/favicon.ico',
    indent: 0
  };
  
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置模拟函数
    mockSaveImageCallback = jest.fn().mockResolvedValue('local/path/to/image.jpg');
    
    // 获取模拟实例
    mockFetcher = MetadataFetcher as unknown as jest.Mocked<MetadataFetcher>;
    mockParser = MetadataParser as unknown as jest.Mocked<MetadataParser>;
    mockCache = MetadataCache as unknown as jest.Mocked<MetadataCache>;
    
    // 模拟fetchContent方法
    mockFetcher.fetchContent = jest.fn().mockResolvedValue({
      text: testHtmlContent,
      status: 200,
      ok: true
    });
    
    // 模拟parse方法
    mockParser.parse = jest.fn().mockReturnValue(testMetadata);
    
    // 模拟缓存方法
    mockCache.get = jest.fn().mockReturnValue(undefined); // 默认缓存未命中
    mockCache.set = jest.fn();
    mockCache.delete = jest.fn();
    mockCache.clear = jest.fn();
    
    // 创建测试实例
    service = new LinkMetadataService(mockSaveImageCallback);
  });
  
  describe('getMetadata', () => {
    it('should return cached metadata when available', async () => {
      // 模拟缓存命中
      mockCache.get = jest.fn().mockReturnValue(testMetadata);
      
      // 执行测试
      const result = await service.getMetadata(testUrl);
      
      // 验证结果
      expect(result).toEqual(testMetadata);
      expect(mockCache.get).toHaveBeenCalledWith(testUrl);
      expect(mockFetcher.fetchContent).not.toHaveBeenCalled(); // 不应该调用获取器
    });
    
    it('should fetch and parse metadata when cache misses', async () => {
      // 执行测试
      const result = await service.getMetadata(testUrl);
      
      // 验证结果
      expect(result).toEqual(testMetadata);
      expect(mockCache.get).toHaveBeenCalledWith(testUrl);
      expect(mockFetcher.fetchContent).toHaveBeenCalledWith(testUrl, expect.any(Object));
      expect(mockParser.parse).toHaveBeenCalledWith(testUrl, testHtmlContent);
      expect(mockCache.set).toHaveBeenCalledWith(testUrl, testMetadata);
    });
    
    it('should save image to attachment when image URL is present', async () => {
      // 执行测试
      const result = await service.getMetadata(testUrl);
      
      // 验证结果
      expect(mockSaveImageCallback).toHaveBeenCalledWith(
        testMetadata.image,
        expect.stringContaining('.png')
      );
      expect(result.image).toBe('local/path/to/image.jpg'); // 应该更新为本地路径
    });
    
    it('should handle image saving failure gracefully', async () => {
      // 模拟图片保存失败
      mockSaveImageCallback.mockRejectedValueOnce(new Error('Failed to save image'));
      
      // 执行测试
      const result = await service.getMetadata(testUrl);
      
      // 验证结果 - 应该保留原始图片URL
      expect(result.image).toBe(testMetadata.image);
    });
    
    it('should bypass cache when enableCache is false', async () => {
      // 创建禁用缓存的服务实例
      const noCacheService = new LinkMetadataService(
        mockSaveImageCallback,
        undefined,
        { enableCache: false }
      );
      
      // 执行测试
      await noCacheService.getMetadata(testUrl);
      
      // 验证结果
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
    
    it('should propagate network errors', async () => {
      // 模拟网络错误
      const networkError = new NetworkError('Connection failed', testUrl);
      mockFetcher.fetchContent.mockRejectedValueOnce(networkError);
      
      // 执行测试并验证结果
      await expect(service.getMetadata(testUrl))
        .rejects
        .toThrow(NetworkError);
    });
  });
  
  describe('clearCache', () => {
    it('should clear specific URL from cache', () => {
      // 执行测试
      service.clearCache(testUrl);
      
      // 验证结果
      expect(mockCache.delete).toHaveBeenCalledWith(testUrl);
    });
    
    it('should clear all cache when no URL is specified', () => {
      // 执行测试
      service.clearCache();
      
      // 验证结果
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});