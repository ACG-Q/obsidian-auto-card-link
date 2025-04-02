/**
 * 设置相关类型定义
 */

/**
 * 插件设置接口
 */
export interface ObsidianAutoCardLinkSettings {
  /**
   * 是否在菜单项中显示
   */
  showInMenuItem: boolean;
  
  /**
   * 是否增强默认粘贴功能
   */
  enhanceDefaultPaste: boolean;
  
  /**
   * 来自screenshotmachine.com的密钥
   */
  screenshotApiKey: string;
  
  /**
   * 截图API的额外参数
   */
  screenshotExtraParam: string;
  
  /**
   * 是否优先使用本地图片
   */
  preferLocalImages?: boolean;
  
  /**
   * 是否下载图片到本地
   */
  downloadImages?: boolean;
  
  /**
   * 显示成功通知
   */
  showSuccessNotice?: boolean;
  
  /**
   * 缩进级别
   */
  indentLevel?: number;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: ObsidianAutoCardLinkSettings = {
  showInMenuItem: true,
  enhanceDefaultPaste: false,
  screenshotApiKey: "",
  screenshotExtraParam: "&dimension=1280×720",
  preferLocalImages: true,
  downloadImages: true,
  showSuccessNotice: true,
  indentLevel: 0,
};