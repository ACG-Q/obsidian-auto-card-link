/**
 * 代码块生成器
 * 
 * 负责生成卡片式链接的代码块
 */

import { Editor, MarkdownView, Notice, requestUrl } from "obsidian";
import { t } from "src/i18n";
import { LinkMetadata, ImageAttachmentSaverCallback } from "src/types/metadata";
import { LANGUAGE_TAG } from "src/config";
import { createDownloadImageToAttachmentFolder } from "src/utils/path";
import { MetadataParser } from "src/core/link-metadata/parser";
import { ObsidianAutoCardLinkSettings } from "src/types";
import { EditorExtensions } from "../editor/extensions";
import { MetadataFetcher } from "../link-metadata/fetcher";

/**
 * 代码块生成器类
 */
export class CodeBlockGenerator {
  private editor: Editor;
  private view: MarkdownView;
  private settings: ObsidianAutoCardLinkSettings;
  private saveImageToAttachment: ImageAttachmentSaverCallback;

  /**
   * 创建代码块生成器实例
   * 
   * @param editor 编辑器实例
   * @param view Markdown视图实例
   * @param settings 插件设置
   */
  constructor(editor: Editor, view: MarkdownView, settings: ObsidianAutoCardLinkSettings) {
    this.editor = editor;
    this.view = view;
    this.settings = settings;
    this.saveImageToAttachment = createDownloadImageToAttachmentFolder(view)!;
  }

  /**
   * 生成链接卡片代码块
   * 
   * @param metadata 链接元数据
   * @returns 生成的代码块文本
   */
  public generate(metadata: LinkMetadata): string {
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

    // 生成代码块
    return [
      "```" + LANGUAGE_TAG,
      yamlLines.join('\n'),
      "```"
    ].join('\n');
  }

  /**
   * 在当前光标位置插入链接卡片代码块
   * 
   * @param metadata 链接元数据
   */
  public insert(metadata: LinkMetadata): void {
    const codeBlock = this.generate(metadata);
    const cursor = this.editor.getCursor();
    
    // 在光标位置插入代码块
    this.editor.replaceRange(codeBlock, cursor);
  }

  /**
   * 替换选中的文本为链接卡片代码块
   * 
   * @param metadata 链接元数据
   */
  public replaceSelection(metadata: LinkMetadata): void {
    const codeBlock = this.generate(metadata);
    
    // 替换选中的文本
    this.editor.replaceSelection(codeBlock);
  }

  /**
   * 将给定URL转换为代码块格式的引用内容
   * 
   * 函数流程：
   * 1. 生成占位文本并立即显示在编辑器中（提供即时反馈）
   * 2. 异步获取链接元数据
   * 3. 根据获取结果进行内容替换或错误回退
   * 
   * @param url - 需要转换的目标网页地址
   * @returns Promise<void> 异步操作，无返回值
   */
  public async convertUrlToCodeBlock(url: string): Promise<void> {
    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      new Notice(t("errors.invalidUrl"));
      return;
    }

    const selectedText = this.editor.getSelection();

    // 生成唯一ID用于后续查找/替换操作
    const pasteId = this.createBlockHash();
    const fetchingText = `[Fetching Data#${pasteId}](${url})`;

    // 立即粘贴占位文本提供即时反馈
    this.editor.replaceSelection(fetchingText);
    
    // 显示加载中通知
    const loadingNotice = new Notice(t("ui.fetchingLinkMetadata"), 0);
    
    try {
      const linkMetadata = await this.fetchLinkMetadata(url);
      
      // 关闭加载通知
      loadingNotice.hide();

      const text = this.editor.getValue();
      const start = text.indexOf(fetchingText);

      if (start < 0) {
        console.log(
          `Unable to find text "${fetchingText}" in current editor, bailing out; link ${url}`
        );
        return;
      }

      const end = start + fetchingText.length;
      const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
      const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);

      // 元数据获取失败时显示通知并恢复原内容
      if (!linkMetadata) {
        new Notice(t("errors.noMetadata", undefined, { url: url }));
        this.editor.replaceRange(selectedText || url, startPos, endPos);
        return;
      }
      
      const codeBlock = this.generate(linkMetadata);
      this.editor.replaceRange(codeBlock, startPos, endPos);
      
      // 显示成功通知
      if (this.settings.showSuccessNotice) {
        new Notice(t("ui.cardLinkCreated"));
      }
    } catch (error: any) {
      // 关闭加载通知
      loadingNotice.hide();
      
      // 显示错误通知
      new Notice(t("errors.networkError", undefined, { message: error.message }));
      
      // 尝试恢复原始文本
      try {
        const text = this.editor.getValue();
        const start = text.indexOf(fetchingText);
        
        if (start >= 0) {
          const end = start + fetchingText.length;
          const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
          const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);
          this.editor.replaceRange(selectedText || url, startPos, endPos);
        }
      } catch (recoveryError) {
        console.error("Error during recovery:", recoveryError);
      }
    }
  }

  /**
   * 获取链接元数据
   * 
   * @param url - 要获取元数据的URL
   * @returns 解析后的元数据对象或undefined
   */
  private async fetchLinkMetadata(url: string): Promise<LinkMetadata | undefined> {
    try {
      // 发送HTTP请求获取页面内容
      const response = await requestUrl({ url });
      
      if (response.status !== 200) {
        console.log(t("errors.fetchPageFailed", undefined, { status: response.status.toString() }));
        return undefined;
      }
      
      // 使用MetadataParser解析HTML内容
      const parser = new MetadataParser();
      let metadata = parser.parse(url, response.text);
      
      // 应用插件设置中的配置
      if (this.settings.indentLevel !== undefined) {
        metadata.indent = this.settings.indentLevel;
      }
      
      // 如果配置了图片下载，处理图片
      if (this.settings.downloadImages && metadata.image && this.saveImageToAttachment) {
        try {
          // 从URL中提取文件名作为保存的文件名
          const imageUrl = metadata.image;
          // 从URL中获取文件名，如果没有则使用随机生成的名称
          const originalFileName = new URL(imageUrl).pathname.split('/').pop() || 
                                 `image-${this.createBlockHash()}`;
          
          // 获取原始文件的扩展名，如果没有则默认使用.png
          const fileExt = originalFileName.includes('.') ? 
                         originalFileName.split('.').pop()! : 
                         'png';
          
          // 组合最终的文件名
          const fileName = originalFileName.includes('.') ? 
                         originalFileName : 
                         `${originalFileName}.${fileExt}`;
          
          // 下载图片并获取本地路径
          const localImagePath = await this.saveImageToAttachment(imageUrl, fileName);
          if (localImagePath) {
            metadata.image = localImagePath;
          }
        } catch (imageError) {
          console.error(t("errors.saveImageFailed"), imageError);
          // 图片下载失败不影响整体元数据的返回
        }
      }
      
      return metadata;
    } catch (error:any) {
      // 处理各种可能的错误
      if (error.name === 'ParseError') {
        console.error(t("errors.parseError", undefined, { message: error.message }));
      } else if (error.name === 'AbortError') {
        console.error(t("errors.abortError", undefined, { message: error.message }));
      } else if (error.name === 'TimeoutError') {
        console.error(t("errors.timeoutError", undefined, { message: error.message }));
      } else {
        console.error(t("errors.fetchMetadataFailed"), error);
      }
      return undefined;
    }
  }

  /**
   * 生成由4位随机小写字母和数字组成的区块哈希字符串
   * 
   * 该方法通过组合随机选取的小写字母（a-z）和数字（0-9）字符构建哈希值，
   * 生成的哈希值总长度为4个字符，适用于需要短随机标识符的场景
   * 
   * @returns {string} 4位由小写字母和数字组成的随机哈希字符串，
   *                   字符范围：abcdefghijklmnopqrstuvwxyz0123456789
   */
  private createBlockHash(): string {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;

    // 生成4位随机字符序列
    for (let i = 0; i < 4; i++) {
      // 从预定义字符集中随机选取一个字符
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * 生成链接卡片代码块（静态方法，保持向后兼容性）
   * 
   * @param metadata 链接元数据
   * @returns 生成的代码块文本
   */
  public static genCodeBlock(metadata: LinkMetadata): string {
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

    // 生成代码块
    return [
      "```" + LANGUAGE_TAG,
      yamlLines.join('\n'),
      "```"
    ].join('\n');
  }

  /**
   * 获取链接元数据（静态方法，保持向后兼容性）
   * 
   * @param url 网页URL
   * @param saveFunc 图片保存回调函数
   * @param settings 插件设置
   * @returns 链接元数据或undefined
   */
  public static async fetchLinkMetadata(url: string, saveFunc: ImageAttachmentSaverCallback, settings: ObsidianAutoCardLinkSettings): Promise<LinkMetadata | undefined> {
    try {
      // 使用新的元数据解析器获取元数据
      const fetcher = new MetadataFetcher();
      const parser = new MetadataParser();
      
      // 获取网页内容
      const response = await fetcher.fetchContent(url);
      
      // 解析元数据
      const metadata = parser.parse(url, response.text);
      
      // 处理图片（如果有）
      if (metadata.image && settings.preferLocalImages) {
        try {
          // 生成更健壮的文件名，使用URL的一部分和时间戳
          const urlHash = url.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
          const fileName = `image_${urlHash}_${Date.now()}.png`;
          
          // 保存图片到附件
          const savedPath = await saveFunc(metadata.image, fileName);
          
          // 更新元数据中的图片路径
          if (savedPath) {
            metadata.localImage = savedPath;
            metadata.image = savedPath;
          }
        } catch (error) {
          console.error(t("errors.saveImageAttachmentFailed"), error);
          // 保存失败时不影响整体流程，保留原始图片URL
        }
      }
      
      return metadata;
    } catch (error) {
      console.error(t("errors.fetchLinkMetadataFailed"), error);
      return undefined;
    }
  }
}