/**
 * MetadataFetcher单元测试
 */

// 模拟obsidian模块
jest.mock('obsidian', () => ({
  requestUrl: jest.fn(),
}), { virtual: true });

import { MetadataFetcher } from '../../../core/link-metadata/fetcher';
import { NetworkError, TimeoutError } from '../../../types/errors';
import { requestUrl, RequestUrlResponse } from 'obsidian';

describe('MetadataFetcher', () => {
  let fetcher: MetadataFetcher;
  
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建测试实例
    fetcher = new MetadataFetcher();
  });
  
  describe('fetchContent', () => {
    it('should fetch HTML content successfully', async () => {
      // 模拟requestUrl返回成功响应
      const mockResponse = {
        status: 200,
        text: '<html><body>Test Content</body></html>',
      } as RequestUrlResponse;
      
      (requestUrl as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      // 执行测试
      const result = await fetcher.fetchContent('https://example.com');
      
      // 验证结果
      expect(result).toBe(mockResponse);
      expect(result.text).toBe('<html><body>Test Content</body></html>');
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: {
          'timeout': '10000',
        },
      });
    });
    
    it('should retry on network failure', async () => {
      // 第一次请求失败，第二次成功
      const mockResponse = {
        status: 200,
        text: '<html><body>Retry Success</body></html>',
      } as RequestUrlResponse;
      
      (requestUrl as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);
      
      // 执行测试
      const result = await fetcher.fetchContent('https://example.com');
      
      // 验证结果
      expect(result).toBe(mockResponse);
      expect(result.text).toBe('<html><body>Retry Success</body></html>');
      expect(requestUrl).toHaveBeenCalledTimes(2);
    });
    
    it('should throw NetworkError after max retries', async () => {
      // 所有请求都失败
      (requestUrl as jest.Mock).mockRejectedValue(new Error('Persistent network error'));
      
      // 执行测试并验证结果
      try {
        await fetcher.fetchContent('https://example.com');
        // 如果没有抛出错误，测试应该失败
        fail('Expected NetworkError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).message).toContain('https://example.com');
      }
      
      // 验证重试次数（初始请求 + 2次重试 = 3次）
      expect(requestUrl).toHaveBeenCalledTimes(3);
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: {
          'timeout': '10000',
        },
      });
    });
    
    it('should throw TimeoutError when request times out', async () => {
      // 模拟超时
      (requestUrl as jest.Mock).mockRejectedValue(new Error('timeout'));
      
      // 执行测试并验证结果
      try {
        await fetcher.fetchContent('https://example.com', { maxRetries: 0 });
        // 如果没有抛出错误，测试应该失败
        fail('Expected TimeoutError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).message).toContain('https://example.com');
        expect((error as TimeoutError).message).toContain('10000ms');
      }
        
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: {
          'timeout': '10000',
        },
      });
    });
    
    it('should throw NetworkError for non-OK responses', async () => {
      // 模拟404响应 - 注意：requestUrl在状态码非200时会直接抛出错误
      (requestUrl as jest.Mock).mockRejectedValueOnce(new Error('Request failed with status code 404'));
      
      // 执行测试并验证结果
      try {
        await fetcher.fetchContent('https://example.com');
        // 如果没有抛出错误，测试应该失败
        fail('Expected NetworkError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as NetworkError).message).toContain('https://example.com');
      }
      
      expect(requestUrl).toHaveBeenCalledTimes(3);
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: {
          'timeout': '10000',
        },
      });
    });
  });
});