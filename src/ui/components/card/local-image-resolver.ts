/**
 * 本地图片路径解析器
 * 
 * 负责解析和转换Obsidian内部图片链接为可访问的资源路径
 */

import { App, TFile, getLinkpath } from "obsidian";

/**
 * 本地图片路径解析器类
 */
export class LocalImagePathResolver {
  private app: App;

  /**
   * 创建本地图片路径解析器实例
   * 
   * @param app Obsidian应用实例
   */
  constructor(app: App) {
    this.app = app;
  }

  /**
   * 获取本地图片资源路径
   * 
   * @param link 图片链接（格式：[[filename]]）
   * @returns 完整的本地资源路径或原始链接
   */
  public getLocalImagePath(link: string): string {
    console.debug('[getLocalImagePath] 输入链接:', link); // 调试入口参数
    
    const originalLink = link;
    const match = link.match(/^\[\[(.*?)\]\]$/);
    
    if (!match) {
      console.warn(`[getLocalImagePath] 无效链接格式，预期[[filename]]格式，实际收到：${link}`);
      return originalLink;
    }
    
    const [_, processedLink] = match as [string, string];
    console.debug('[getLocalImagePath] 解析后链接:', processedLink);

    var destFile = this.app.metadataCache.getFirstLinkpathDest(
      getLinkpath(processedLink),
      ""
    );
    
    if (!destFile?.path) {
      // 尝试刷新元数据缓存
      const file = this.app.vault.getAbstractFileByPath(processedLink);
      if (file instanceof TFile) {
        this.app.metadataCache.trigger("changed", file);
        // 重新尝试获取
        destFile = this.app.metadataCache.getFirstLinkpathDest(
          getLinkpath(processedLink),
          ""
        );
      }
      return originalLink;
    }

    const resourcePath = this.app.vault.adapter.getResourcePath(destFile.path);
    console.debug('[getLocalImagePath] 生成资源路径:', { 
      input: link,
      resolvedPath: destFile.path,
      resourcePath 
    });

    return resourcePath || originalLink;
  }
}