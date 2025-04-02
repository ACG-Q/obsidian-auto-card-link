/**
 * 卡片链接代码块处理器
 * 
 * 负责处理和渲染卡片链接代码块
 */

import { App, parseYaml } from "obsidian";
import { LinkMetadata } from "src/types/metadata";
import { ObsidianAutoCardLinkSettings } from "src/types/settings";
import { YamlParseError, NoRequiredParamsError } from "src/types/errors";
import { MetadataService } from "src/services/metadata-service";
import { CardLinkRenderer, LocalImagePathResolver, RefreshButton, RefreshButtonOptions } from "src/ui/components/card";
import { CodeBlockGenerator } from "./generator";
import { t } from "src/i18n";

/**
 * 卡片链接代码块处理器类
 */
export class CodeBlockProcessor {
  private app: App;
  private source: string;
  private changeValue: (content: string) => void;
  private settings: ObsidianAutoCardLinkSettings;
  private metadataService?: MetadataService;
  private localImageResolver: LocalImagePathResolver;
  private cardRenderer: CardLinkRenderer;

  /**
   * 创建处理器实例
   * 
   * @param app Obsidian应用实例
   * @param source 代码块源码
   * @param changeValue 内容更新回调函数
   * @param settings 插件设置
   * @param metadataService 元数据服务（可选）
   */
  constructor(
    app: App, 
    source: string, 
    changeValue: (content: string) => void, 
    settings: ObsidianAutoCardLinkSettings,
    metadataService?: MetadataService
  ) {
    this.app = app;
    this.source = source;
    this.changeValue = changeValue;
    this.settings = settings;
    this.metadataService = metadataService;
    
    // 初始化UI组件
    this.localImageResolver = new LocalImagePathResolver(app);
    this.cardRenderer = new CardLinkRenderer(this.localImageResolver);
  }

  /**
   * 执行链接卡片生成流程
   * 
   * @param el 目标DOM容器元素，用于挂载生成的卡片元素或错误提示
   * @returns Promise<void> 异步操作，无直接返回值
   */
  async run(el: HTMLElement): Promise<void> {
    try {
      // 解析YAML元数据
      const metadata = this.parseLinkMetadataFromYaml(this.source);
      
      // 创建卡片元素
      const cardElement = this.renderCard(metadata, el);
      el.appendChild(cardElement);
    } catch (error) {
      // 错误处理流程：根据错误类型展示不同的用户提示
      if (error instanceof NoRequiredParamsError) {
        el.appendChild(this.cardRenderer.renderError(error.message));
      } else if (error instanceof YamlParseError) {
        el.appendChild(this.cardRenderer.renderError(error.message));
      } else if (error instanceof TypeError) {
        // 处理内部链接未加引号导致的类型错误
        el.appendChild(
          this.cardRenderer.renderError(t("errors.internalLinkQuotes"))
        );
        console.log(error);
      } else {
        // 捕获未预期的未知错误
        console.log("Code Block: cardlink unknown error", error);
        el.appendChild(this.cardRenderer.renderError(t("errors.unknownError")));
      }
    }
  }

  /**
   * 渲染卡片并添加刷新功能
   * 
   * @param metadata 链接元数据
   * @param containerEl 容器元素
   * @returns 渲染后的卡片元素
   */
  private renderCard(metadata: LinkMetadata, containerEl: HTMLElement): HTMLElement {
    // 使用卡片渲染器渲染基础卡片
    const cardElement = this.cardRenderer.render(metadata);
    
    // 获取按钮容器
    const buttonContainerEl = cardElement.querySelector(".auto-card-link-buttons") as HTMLElement;
    if (!buttonContainerEl) {
      console.error(t("errors.buttonContainerNotFound"));
      return cardElement;
    }
    
    // 创建刷新按钮配置
    const refreshButtonOptions: RefreshButtonOptions = {
      containerEl: buttonContainerEl,
      metadata: metadata,
      metadataService: this.metadataService,
      onContentUpdate: (content: string) => {
        // 更新代码块内容
        this.changeValue(content);
      },
      onMetadataUpdate: (newMetadata: LinkMetadata) => {
        // 清空容器并重新渲染
        containerEl.empty();
        containerEl.appendChild(this.renderCard(newMetadata, containerEl));
      }
    };
    
    // 创建刷新按钮实例
    new RefreshButton(refreshButtonOptions);
    
    return cardElement;
  }

  /**
   * 从YAML解析链接元数据
   * 
   * @param source 原始YAML格式字符串
   * @returns 结构化的链接元数据
   * @throws YamlParseError | NoRequiredParamsError
   */
  private parseLinkMetadataFromYaml(source: string): LinkMetadata {
    let yaml: Partial<LinkMetadata>;

    let indent = -1;
    source = source
      .split(/\r?\n|\r|\n/g)
      .map((line) =>
        line.replace(/^\t+/g, (tabs) => {
          const n = tabs.length;
          if (indent < 0) {
            indent = n;
          }
          return " ".repeat(n);
        })
      )
      .join("\n");

    try {
      yaml = parseYaml(source) as Partial<LinkMetadata>;
    } catch (error) {
      console.log(error);
      throw new YamlParseError(
        t("errors.yamlParseError")
      );
    }

    if (!yaml || !yaml.url || !yaml.title) {
      throw new NoRequiredParamsError(
        t("errors.missingRequiredParams")
      );
    }

    return {
      url: yaml.url,
      title: yaml.title,
      description: yaml.description,
      host: yaml.host,
      favicon: yaml.favicon,
      image: yaml.image,
      indent,
    };
  }

  /**
   * 刷新链接元数据
   * 
   * @param url 链接URL
   * @returns 刷新后的元数据或undefined
   */
  private async refreshMetadata(url: string): Promise<LinkMetadata | undefined> {
    try {
      // 优先使用元数据服务获取元数据
      if (this.metadataService) {
        return await this.metadataService.fetchMetadata(url);
      }
      
      // 创建一个简单的图片保存回调函数
      const dummySaveImageCallback = async (imageUrl: string, fileName: string): Promise<string> => {
        console.log(t("debug.legacyModeSaveImage"), imageUrl, fileName);
        return imageUrl; // 在兼容模式下，直接返回原始URL
      };
      
      // 兼容旧版本，使用静态方法获取元数据
      return await CodeBlockGenerator.fetchLinkMetadata(url, dummySaveImageCallback, this.settings);
    } catch (error) {
      console.error(t("errors.refreshMetadataFailed"), error);
      return undefined;
    }
  }

  /**
   * 生成代码块内容
   * 
   * @param linkMetadata 链接元数据
   * @returns 格式化的代码块字符串
   */
  private genCodeBlock(linkMetadata: LinkMetadata): string {
    return CodeBlockGenerator.genCodeBlock(linkMetadata);
  }
}