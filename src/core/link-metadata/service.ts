/**
 * 链接元数据服务
 * 
 * 整合获取器、解析器和缓存组件，提供统一的元数据获取接口
 */

import { LinkMetadata, ImageAttachmentSaverCallback } from "src/types/metadata";
import { MetadataFetcher, FetchOptions } from "./fetcher";
import { MetadataParser } from "./parser";
import { MetadataCache, CacheOptions } from "./cache";
import { ObsidianAutoCardLinkSettings } from "src/types";

/**
 * 链接元数据服务配置接口
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
 * 链接元数据服务类
 */
export class LinkMetadataService {
  private fetcher: MetadataFetcher;
  private parser: MetadataParser;
  private cache: MetadataCache;
  private options: MetadataServiceOptions;
  private saveImageToAttachment: ImageAttachmentSaverCallback;
  private settings?: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建链接元数据服务实例
   * 
   * @param saveImageToAttachment 图片保存回调函数
   * @param settings 插件设置
   * @param options 服务配置
   */
  constructor(
    saveImageToAttachment: ImageAttachmentSaverCallback,
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
        // 保存图片到附件
        const fileName = `${Date.now()}.png`;
        const savedPath = await this.saveImageToAttachment(metadata.image, fileName);
        metadata.image = savedPath;
      } catch (error) {
        console.error("Failed to save image:", error);
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
}

/**
 * 创建链接元数据服务实例的工厂函数
 * 
 * @param saveImageToAttachment 图片保存回调函数
 * @param settings 插件设置
 * @param options 服务配置
 * @returns 链接元数据服务实例
 */
export function createLinkMetadataService(
  saveImageToAttachment: ImageAttachmentSaverCallback,
  settings?: ObsidianAutoCardLinkSettings,
  options: MetadataServiceOptions = {}
): LinkMetadataService {
  return new LinkMetadataService(saveImageToAttachment, settings, options);
}