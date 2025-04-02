/**
 * 链接元数据获取器
 * 
 * 负责获取网页内容，处理请求错误和超时，支持请求重试机制
 */

import { requestUrl, RequestUrlResponse } from "obsidian";
import { NetworkError, TimeoutError } from "src/types/errors";

/**
 * 请求配置接口
 */
export interface FetchOptions {
  /**
   * 请求超时时间（毫秒）
   */
  timeout?: number;
  
  /**
   * 最大重试次数
   */
  maxRetries?: number;
  
  /**
   * 重试延迟时间（毫秒）
   */
  retryDelay?: number;
}

/**
 * 默认请求配置
 */
const DEFAULT_FETCH_OPTIONS: Required<FetchOptions> = {
  timeout: 10000, // 10秒
  maxRetries: 2,
  retryDelay: 1000, // 1秒
};

/**
 * 链接元数据获取器类
 */
export class MetadataFetcher {
  /**
   * 获取网页内容
   * 
   * @param url 网页URL
   * @param options 请求配置
   * @returns 网页内容响应对象
   * @throws {NetworkError} 当网络请求失败时抛出
   * @throws {TimeoutError} 当请求超时时抛出
   */
  public async fetchContent(url: string, options: FetchOptions = {}): Promise<RequestUrlResponse> {
    const mergedOptions = { ...DEFAULT_FETCH_OPTIONS, ...options };
    let lastError: Error | null = null;
    
    // 实现重试机制
    for (let attempt = 0; attempt <= mergedOptions.maxRetries!; attempt++) {
      try {
        // 发起网络请求
        const response = await requestUrl({
          url,
          headers: {
            'timeout': mergedOptions.timeout?.toString()
          },
        });
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // 判断是否为最后一次尝试
        if (attempt < mergedOptions.maxRetries!) {
          // 等待指定时间后重试
          await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay));
        }
      }
    }
    
    // 所有重试都失败，抛出适当的错误
    if (lastError?.message.includes('timeout')) {
      throw new TimeoutError(url, mergedOptions.timeout!);
    } else {
      throw new NetworkError(lastError?.message || 'Unknown network error', url);
    }
  }
}