/**
 * 元数据服务
 * 
 * 负责获取和管理链接元数据，整合了原有的link-metadata功能
 */

import { LinkMetadata, ImageAttachmentSaverCallback } from "src/types/metadata";
import { MetadataFetcher, FetchOptions } from "../core/link-metadata/fetcher";
import { MetadataParser } from "../core/link-metadata/parser";
import { MetadataCache, CacheOptions } from "../core/link-metadata/cache";
import { ObsidianAutoCardLinkSettings } from "src/types";

/**
 * 元数据服务配置接口
 */
export interface MetadataServiceOptions {
  /**
   * 获取器配置
   */
  fetchOptions?: FetchOptions;
  
  /**
   * 缓存配置
   */
  cacheOptions?: CacheOptions;
  
  /**
   * 是否启用缓存
   */
  enableCache?: boolean;
}

/**
 * 默认服务配置
 */
const DEFAULT_SERVICE_OPTIONS: MetadataServiceOptions = {
  enableCache: true,
};

/**
 * 元数据服务类
 * 
 * 整合获取器、解析器和缓存组件，提供统一的元数据获取和管理接口
 */
export class MetadataService {
  private fetcher: MetadataFetcher;
  private parser: MetadataParser;
  private cache: MetadataCache;
  private options: MetadataServiceOptions;
  private saveImageToAttachment?: ImageAttachmentSaverCallback;
  private settings?: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建元数据服务实例
   * 
   * @param saveImageToAttachment 图片保存回调函数
   * @param settings 插件设置
   * @param options 服务配置
   */
  constructor(
    saveImageToAttachment?: ImageAttachmentSaverCallback,
    settings?: ObsidianAutoCardLinkSettings,
    options: MetadataServiceOptions = {}
  ) {
    this.options = { ...DEFAULT_SERVICE_OPTIONS, ...options };
    this.settings = settings;
    this.saveImageToAttachment = saveImageToAttachment;
    
    // 初始化组件
    this.fetcher = new MetadataFetcher();
    this.parser = new MetadataParser();
    this.cache = new MetadataCache(options.cacheOptions);
  }
  
  /**
   * 获取链接元数据
   * 
   * @param url 网页URL
   * @returns 链接元数据
   */
  public async getMetadata(url: string): Promise<LinkMetadata> {
    // 尝试从缓存获取
    if (this.options.enableCache) {
      const cachedMetadata = this.cache.get(url);
      if (cachedMetadata) {
        return cachedMetadata;
      }
    }
    
    // 获取网页内容
    const response = await this.fetcher.fetchContent(url, this.options.fetchOptions);
    
    // 解析元数据
    const metadata = this.parser.parse(url, response.text);
    
    // 处理图片（如果有）
    if (metadata.image) {
      try {
        // 生成更健壮的文件名，使用URL的一部分和时间戳
        const urlHash = url.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
        const fileName = `image_${urlHash}_${Date.now()}.png`;
        
        // 保存图片到附件
        const savedPath = await this.saveImageToAttachment?.(metadata.image, fileName);
        
        // 更新元数据中的图片路径
        if (savedPath) {
          metadata.localImage = savedPath;
          // 保持与原始实现的兼容性，同时更新image字段
          if (this.settings?.preferLocalImages) {
            metadata.image = savedPath;
          }
        }
      } catch (error) {
        console.error("Failed to save image attachment:", error);
        // 保存失败时不影响整体流程，保留原始图片URL
      }
    }
    
    // 缓存元数据
    if (this.options.enableCache) {
      this.cache.set(url, metadata);
    }
    
    return metadata;
  }
  
  /**
   * 清除指定URL的缓存
   * 
   * @param url 网页URL
   */
  public clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计信息
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return this.cache.getStats();
  }
  
  /**
   * 更新服务配置
   * 
   * @param options 新的服务配置
   */
  public updateOptions(options: Partial<MetadataServiceOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 更新插件设置
   * 
   * @param settings 新的插件设置
   */
  public updateSettings(settings: ObsidianAutoCardLinkSettings): void {
    this.settings = settings;
  }
  
  /**
   * 获取链接元数据（别名方法，保持向后兼容性）
   * 
   * @param url 网页URL
   * @returns 链接元数据
   */
  public async fetchMetadata(url: string): Promise<LinkMetadata | undefined> {
    try {
      return await this.getMetadata(url);
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      return undefined;
    }
  }
}