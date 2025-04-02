/**
 * 截图服务
 * 
 * 负责获取网站截图并保存为本地图片，支持不同的截图提供商
 */

import { requestUrl } from "obsidian";
import { ObsidianAutoCardLinkSettings } from "src/types";
import { NetworkError, TimeoutError } from "src/types/errors";

/**
 * 截图服务配置接口
 */
export interface ScreenshotServiceOptions {
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
 * 默认截图服务配置
 */
const DEFAULT_SCREENSHOT_OPTIONS: Required<ScreenshotServiceOptions> = {
  timeout: 15000, // 15秒
  maxRetries: 2,
  retryDelay: 1000, // 1秒
};

/**
 * 截图提供商接口
 * 允许实现不同的截图服务提供商
 */
export interface ScreenshotProvider {
  /**
   * 获取截图URL
   * 
   * @param url 需要截图的网页URL
   * @param options 截图选项
   * @returns 截图的URL或二进制数据
   */
  getScreenshot(url: string, options?: any): Promise<string | ArrayBuffer>;
  
  /**
   * 检查提供商是否可用
   * 
   * @returns 提供商是否可用
   */
  isAvailable(): boolean;
}

/**
 * ScreenshotMachine提供商
 * 使用screenshotmachine.com的API获取网站截图
 */
export class ScreenshotMachineProvider implements ScreenshotProvider {
  private settings: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建ScreenshotMachine提供商实例
   * 
   * @param settings 插件设置
   */
  constructor(settings: ObsidianAutoCardLinkSettings) {
    this.settings = settings;
  }
  
  /**
   * 检查提供商是否可用
   * 
   * @returns 提供商是否可用（API密钥是否已设置）
   */
  public isAvailable(): boolean {
    return !!this.settings.screenshotApiKey && this.settings.screenshotApiKey.length > 0;
  }
  
  /**
   * 获取网站截图
   * 
   * @param url 需要截图的网页URL
   * @returns 截图的URL
   * @throws {Error} 当API密钥未设置时抛出
   */
  public async getScreenshot(url: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("Screenshot API key is not set");
    }
    
    // 构建API URL
    let apiUrl = `https://api.screenshotmachine.com?key=${this.settings.screenshotApiKey}&url=${encodeURIComponent(url)}`;
    
    // 添加额外参数
    if (this.settings.screenshotExtraParam && this.settings.screenshotExtraParam.length > 0) {
      apiUrl += this.settings.screenshotExtraParam;
    }
    
    return apiUrl;
  }
}

/**
 * 截图服务错误
 */
export class ScreenshotError extends Error {
  /**
   * 创建截图错误实例
   * 
   * @param message 错误信息
   * @param url 请求的URL
   */
  constructor(message: string, public readonly url: string) {
    super(`截图失败 ${url}: ${message}`);
    this.name = 'ScreenshotError';
  }
}

/**
 * 截图服务类
 */
export class ScreenshotService {
  private options: Required<ScreenshotServiceOptions>;
  private providers: ScreenshotProvider[] = [];
  private settings?: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建截图服务实例
   * 
   * @param settings 插件设置
   * @param options 服务配置
   */
  constructor(settings?: ObsidianAutoCardLinkSettings, options: ScreenshotServiceOptions = {}) {
    this.options = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options };
    this.settings = settings;
    
    // 注册默认提供商
    if (settings) {
      this.registerProvider(new ScreenshotMachineProvider(settings));
    }
  }
  
  /**
   * 注册截图提供商
   * 
   * @param provider 截图提供商
   */
  public registerProvider(provider: ScreenshotProvider): void {
    this.providers.push(provider);
  }
  
  /**
   * 获取网站截图
   * 
   * @param url 网页URL
   * @returns 截图URL或二进制数据
   * @throws {ScreenshotError} 当截图失败时抛出
   */
  public async getScreenshot(url: string): Promise<string | ArrayBuffer> {
    // 查找可用的提供商
    const availableProviders = this.providers.filter(provider => provider.isAvailable());
    
    if (availableProviders.length === 0) {
      throw new ScreenshotError("No available screenshot provider", url);
    }
    
    // 使用第一个可用的提供商
    const provider = availableProviders[0];
    let lastError: Error | null = null;
    
    // 实现重试机制
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await provider.getScreenshot(url);
      } catch (error) {
        lastError = error as Error;
        
        // 判断是否为最后一次尝试
        if (attempt < this.options.maxRetries) {
          // 等待指定时间后重试
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
        }
      }
    }
    
    // 所有重试都失败，抛出适当的错误
    throw new ScreenshotError(lastError?.message || "Unknown error", url);
  }
  
  /**
   * 下载图片并返回二进制数据
   * 
   * @param url 图片URL
   * @returns 图片的二进制数据
   * @throws {NetworkError} 当网络请求失败时抛出
   * @throws {TimeoutError} 当请求超时时抛出
   */
  private async downloadImage(url: string): Promise<ArrayBuffer> {
    try {
      // 使用Obsidian的requestUrl API下载图片
      const response = await requestUrl({
        url,
        method: 'GET',
        headers: {
          'User-Agent': 'Obsidian-Auto-Card-Link/1.0'
        }
      });
      
      // 检查响应状态
      if (response.status < 200 || response.status >= 300) {
        throw new NetworkError(
          `Failed to download image: HTTP ${response.status}`,
          url
        );
      }
      
      // 返回二进制数据
      return response.arrayBuffer;
    } catch (error:any) {
      // 处理超时错误
      if (error.message && error.message.includes('timeout')) {
        throw new TimeoutError(url, this.options.timeout);
      }
      
      // 处理网络错误
      if (error instanceof NetworkError || error instanceof TimeoutError) {
        throw error;
      }
      
      // 处理其他错误
      throw new NetworkError(`Failed to download image: ${error.message}`, url);
    }
  }
  
  /**
   * 获取截图并保存为本地文件
   * 
   * @param url 网页URL
   * @param fileName 文件名
   * @param saveCallback 保存回调函数，接收URL或二进制数据和文件名，返回保存的文件路径
   * @returns 保存的文件路径
   * @throws {ScreenshotError} 当截图失败时抛出
   */
  public async getAndSaveScreenshot(
    url: string,
    fileName: string,
    saveCallback: (data: string | ArrayBuffer, fileName: string) => Promise<string>
  ): Promise<string> {
    try {
      const screenshot = await this.getScreenshot(url);
      
      // 如果截图是URL字符串
      if (typeof screenshot === 'string') {
        try {
          // 尝试下载图片并获取二进制数据
          const imageData = await this.downloadImage(screenshot);
          return await saveCallback(imageData, fileName);
        } catch (downloadError) {
          console.warn("Failed to download image, falling back to URL:", downloadError);
          // 如果下载失败，回退到使用URL
          return await saveCallback(screenshot, fileName);
        }
      }
      
      // 如果截图已经是二进制数据，直接保存
      return await saveCallback(screenshot, fileName);
    } catch (error: any) {
      console.error("Failed to get and save screenshot:", error);
      
      // 包装错误为ScreenshotError
      if (!(error instanceof ScreenshotError)) {
        throw new ScreenshotError(
          error.message || "Unknown error occurred while getting screenshot",
          url
        );
      }
      
      throw error;
    }
  }
  
  /**
   * 更新服务配置
   * 
   * @param options 新的服务配置
   */
  public updateOptions(options: Partial<ScreenshotServiceOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 更新插件设置
   * 
   * @param settings 新的插件设置
   */
  public updateSettings(settings: ObsidianAutoCardLinkSettings): void {
    this.settings = settings;
    
    // 更新或添加ScreenshotMachine提供商
    const existingProvider = this.providers.find(p => p instanceof ScreenshotMachineProvider);
    if (existingProvider) {
      this.providers = this.providers.filter(p => !(p instanceof ScreenshotMachineProvider));
    }
    
    this.registerProvider(new ScreenshotMachineProvider(settings));
  }
}