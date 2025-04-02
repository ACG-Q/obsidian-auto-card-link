/**
 * 服务管理器
 * 
 * 整合元数据服务、截图服务和存储服务，提供统一的接口给主程序使用
 */

import { Vault } from "obsidian";
import { MetadataService, MetadataServiceOptions } from "./metadata-service";
import { ScreenshotService, ScreenshotServiceOptions } from "./screenshot-service";
import { StorageService, StorageServiceOptions } from "./storage-service";
import { ImageAttachmentSaverCallback } from "src/types/metadata";
import { ObsidianAutoCardLinkSettings } from "src/types";

/**
 * 服务管理器配置接口
 */
export interface ServiceManagerOptions {
  /**
   * 元数据服务配置
   */
  metadataOptions?: MetadataServiceOptions;
  
  /**
   * 截图服务配置
   */
  screenshotOptions?: ScreenshotServiceOptions;
  
  /**
   * 存储服务配置
   */
  storageOptions?: StorageServiceOptions;
}

/**
 * 服务管理器类
 * 
 * 整合各种服务，提供统一的接口给主程序使用
 */
export class ServiceManager {
  private metadataService: MetadataService;
  private screenshotService: ScreenshotService;
  private storageService: StorageService;
  private settings: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建服务管理器实例
   * 
   * @param vault Obsidian的Vault实例
   * @param saveImageToAttachment 图片保存回调函数
   * @param settings 插件设置
   * @param options 服务管理器配置
   */
  constructor(
    vault: Vault,
    settings: ObsidianAutoCardLinkSettings,
    options: ServiceManagerOptions = {},
    saveImageToAttachment?: ImageAttachmentSaverCallback,
  ) {
    this.settings = settings;
    
    // 初始化各服务
    this.metadataService = new MetadataService(
      saveImageToAttachment,
      settings,
      options.metadataOptions
    );
    
    this.screenshotService = new ScreenshotService(
      settings,
      options.screenshotOptions
    );
    
    this.storageService = new StorageService(
      vault,
      settings,
      options.storageOptions
    );
  }
  
  /**
   * 获取元数据服务实例
   * 
   * @returns 元数据服务实例
   */
  public getMetadataService(): MetadataService {
    return this.metadataService;
  }
  
  /**
   * 获取截图服务实例
   * 
   * @returns 截图服务实例
   */
  public getScreenshotService(): ScreenshotService {
    return this.screenshotService;
  }
  
  /**
   * 获取存储服务实例
   * 
   * @returns 存储服务实例
   */
  public getStorageService(): StorageService {
    return this.storageService;
  }
  
  /**
   * 更新插件设置
   * 
   * @param settings 新的插件设置
   */
  public updateSettings(settings: ObsidianAutoCardLinkSettings): void {
    this.settings = settings;
    
    // 更新各服务的设置
    this.metadataService.updateSettings(settings);
    this.screenshotService.updateSettings(settings);
    this.storageService.updateSettings(settings);
  }
}