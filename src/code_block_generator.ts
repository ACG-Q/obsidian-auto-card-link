import { Editor, MarkdownView, Notice, requestUrl } from "obsidian";
import { LinkMetadata } from "src/interfaces";
import { EditorExtensions } from "src/editor_enhancements";
import { LinkMetadataParser, ImageAttachmentSaverCallback } from "src/link_metadata_parser";
import { LANGUAGE_TAG } from "./config";
import { ObsidianAutoCardLinkSettings } from "./settings";
import { createDownloadImageToAttachmentFolder } from "./utils/path";

export class CodeBlockGenerator {
  view: MarkdownView;
  settings: ObsidianAutoCardLinkSettings;
  editor?: Editor;
  saveImageToAttachment: ImageAttachmentSaverCallback;

  constructor(editor: Editor, view: MarkdownView,settings: ObsidianAutoCardLinkSettings) {
    this.view = view;
    this.editor = editor;
    this.settings = settings;
    this.saveImageToAttachment = createDownloadImageToAttachmentFolder(view)
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
  async convertUrlToCodeBlock(url: string): Promise<void> {
    if(!this.editor) return;
    const selectedText = this.editor.getSelection();

    // 生成唯一ID用于后续查找/替换操作
    const pasteId = this.createBlockHash();
    const fetchingText = `[Fetching Data#${pasteId}](${url})`;

    // 立即粘贴占位文本提供即时反馈
    this.editor.replaceSelection(fetchingText);

    const linkMetadata = await this.fetchLinkMetadata(url);

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
      new Notice("Couldn't fetch link metadata");
      this.editor.replaceRange(selectedText || url, startPos, endPos);
      return;
    }
    this.editor.replaceRange(this.genCodeBlock(linkMetadata), startPos, endPos);
  }


  /**
   * 生成卡片式代码块文本
   * @param linkMetadata - 包含链接元数据的对象
   * @returns 格式化后的代码块字符串
   */
  static genCodeBlock(linkMetadata: LinkMetadata): string {
    const codeBlockTexts = [`\n\`\`\`${LANGUAGE_TAG}`];
    codeBlockTexts.push(`url: ${linkMetadata.url}`);
    codeBlockTexts.push(`title: "${linkMetadata.title}"`);
    if (linkMetadata.description)
      codeBlockTexts.push(`description: "${linkMetadata.description}"`);
    if (linkMetadata.host) codeBlockTexts.push(`host: ${linkMetadata.host}`);
    if (linkMetadata.favicon)
      codeBlockTexts.push(`favicon: ${linkMetadata.favicon}`);
    if (linkMetadata.image) codeBlockTexts.push(`image: "${linkMetadata.image}"`);
    codeBlockTexts.push("```\n");
    return codeBlockTexts.join("\n");
  }

  /**
   * 生成卡片式代码块文本
   * @param linkMetadata - 包含链接元数据的对象
   * @returns 格式化后的代码块字符串
   */
  genCodeBlock(linkMetadata: LinkMetadata): string {
    return CodeBlockGenerator.genCodeBlock(linkMetadata)
  }

  static async fetchLinkMetadata(url: string, saveFunc: ImageAttachmentSaverCallback, settings: ObsidianAutoCardLinkSettings): Promise<LinkMetadata | undefined> {
    const res = await (async () => {
      try {
        return requestUrl({ url });
      } catch (e) {
        console.log(e);
        return;
      }
    })();
    if (!res || res.status != 200) {
      console.log(`bad response. response status code was ${res?.status}`);
      return;
    }

    const parser = new LinkMetadataParser(url, res.text, saveFunc, settings);
    return parser.parse();
  }

  /**
   * 获取链接元数据
   * @param url - 要获取元数据的URL
   * @returns 解析后的元数据对象或undefined
   */
  private async fetchLinkMetadata(url: string): Promise<LinkMetadata | undefined> {
    return await CodeBlockGenerator.fetchLinkMetadata(url, this.saveImageToAttachment, this.settings);
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
}
