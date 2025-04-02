/**
 * 卡片链接刷新按钮组件
 * 
 * 负责处理卡片链接元数据的刷新功能
 */

import { ButtonComponent, Notice } from "obsidian";
import { LinkMetadata } from "src/types/metadata";
import { MetadataService } from "src/services/metadata-service";
import { CodeBlockGenerator } from "src/core/code-block";
import { MetadataFetcher } from "src/core/link-metadata/fetcher";
import { MetadataParser } from "src/core/link-metadata/parser";
import { LANGUAGE_TAG } from "src/config";
import { ObsidianAutoCardLinkSettings } from "src/types";
import { t } from "src/i18n";

/**
 * 刷新按钮配置接口
 */
export interface RefreshButtonOptions {
  /** 容器元素 */
  containerEl: HTMLElement;
  /** 链接元数据 */
  metadata: LinkMetadata;
  /** 元数据服务 */
  metadataService?: MetadataService;
  /** 内容更新回调函数 */
  onContentUpdate?: (content: string) => void;
  /** 元数据更新回调函数 */
  onMetadataUpdate?: (metadata: LinkMetadata) => void;
}

/**
 * 卡片链接刷新按钮类
 */
export class RefreshButton {
  private options: RefreshButtonOptions;
  private buttonComponent: ButtonComponent;

  /**
   * 创建刷新按钮实例
   * 
   * @param options 刷新按钮配置选项
   */
  constructor(options: RefreshButtonOptions) {
    this.options = options;
    this.buttonComponent = this.createButton();
  }

  /**
   * 创建刷新按钮组件
   * 
   * @returns 按钮组件实例
   */
  private createButton(): ButtonComponent {
    return new ButtonComponent(this.options.containerEl)
      .setClass("auto-card-link-refresh")
      .setClass("clickable-icon")
      .setIcon("refresh-cw")
      .setTooltip(t("ui.refreshMetadata"))
      .onClick(async () => this.handleRefresh());
  }

  /**
   * 处理刷新按钮点击事件
   */
  private async handleRefresh(): Promise<void> {
    try {
      // 显示加载中通知
      const loadingNotice = new Notice(t("ui.refreshingLinkMetadata"), 0);
      
      let newMetadata: LinkMetadata | undefined;
      
      // 优先使用元数据服务获取元数据
      if (this.options.metadataService) {
        newMetadata = await this.options.metadataService.fetchMetadata(this.options.metadata.url);
      } else {
        // 兼容旧版本，使用CodeBlockGenerator静态方法获取元数据
        newMetadata = await this.fetchMetadataLegacy(this.options.metadata.url);
      }
      
      // 关闭加载通知
      loadingNotice.hide();
      
      if (!newMetadata) {
        new Notice(t("errors.noMetadata", undefined, { url: this.options.metadata.url }));
        return;
      }
      
      // 保留原有的缩进级别
      newMetadata.indent = this.options.metadata.indent;
      
      // 调用内容更新回调
      if (this.options.onContentUpdate) {
        const codeBlock = this.generateCodeBlock(newMetadata);
        this.options.onContentUpdate(codeBlock);
      }
      
      // 调用元数据更新回调
      if (this.options.onMetadataUpdate) {
        this.options.onMetadataUpdate(newMetadata);
      }
      
      new Notice(t("ui.cardLinkMetadataRefreshed"));
    } catch (error:any) {
      console.error("刷新元数据失败:", error);
      new Notice(`刷新失败: ${error.message}`);
    }
  }
  
  /**
   * 兼容旧版本的元数据获取方法
   * 
   * @param url 链接URL
   * @returns 链接元数据或undefined
   */
  private async fetchMetadataLegacy(url: string): Promise<LinkMetadata | undefined> {
    try {
      // 创建一个简单的图片保存回调函数
      const dummySaveImageCallback = async (imageUrl: string, fileName: string): Promise<string> => {
        console.log("Legacy mode: would save image", imageUrl, fileName);
        return imageUrl; // 在兼容模式下，直接返回原始URL
      };
      
      // 创建默认设置对象
      const defaultSettings: ObsidianAutoCardLinkSettings = {
        showInMenuItem: true,
        enhanceDefaultPaste: false,
        screenshotApiKey: "",
        screenshotExtraParam: "&dimension=1280×720",
        preferLocalImages: true,
        downloadImages: false,
        showSuccessNotice: true,
        indentLevel: 0
      };
      
      try {
        // 使用新的元数据获取器和解析器
        const fetcher = new MetadataFetcher();
        const parser = new MetadataParser();
        
        // 获取网页内容
        const response = await fetcher.fetchContent(url);
        
        // 解析元数据
        const metadata = parser.parse(url, response.text);
        
        return metadata;
      } catch (fetchError) {
        console.log("New metadata fetch method failed, falling back to legacy method:", fetchError);
        // 如果新方法失败，回退到旧方法
        // 添加preferLocalImages属性以匹配静态方法的参数要求
        defaultSettings.preferLocalImages = false;
        return await CodeBlockGenerator.fetchLinkMetadata(url, dummySaveImageCallback, defaultSettings);
      }
    } catch (error) {
      console.error("Legacy metadata fetch failed:", error);
      return undefined;
    }
  }
  
  /**
   * 生成代码块内容
   * 
   * @param metadata 链接元数据
   * @returns 格式化的代码块字符串
   */
  private generateCodeBlock(metadata: LinkMetadata): string {
    // 构建YAML格式的元数据
    const yamlLines = [
      `url: "${metadata.url}"`,
      `title: "${metadata.title}"`
    ];

    // 添加可选字段
    if (metadata.description) {
      yamlLines.push(`description: "${metadata.description}"`);
    }

    if (metadata.image) {
      yamlLines.push(`image: "${metadata.image}"`);
    }

    if (metadata.favicon) {
      yamlLines.push(`favicon: "${metadata.favicon}"`);
    }

    if (metadata.host) {
      yamlLines.push(`host: "${metadata.host}"`);
    }
    
    // 添加缩进级别
    if (metadata.indent !== undefined && metadata.indent > 0) {
      yamlLines.push(`indent: ${metadata.indent}`);
    }

    // 使用导入的LANGUAGE_TAG常量
    
    // 生成代码块
    return [
      "```" + LANGUAGE_TAG,
      yamlLines.join('\n'),
      "```"
    ].join('\n');
  }
}