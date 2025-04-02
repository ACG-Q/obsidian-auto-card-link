import { Plugin, MarkdownView, Editor, Menu, MenuItem, Notice } from "obsidian";
// 导入设置选项卡组件
import { SettingsTab } from "src/ui/components/settings";
import { ObsidianAutoCardLinkSettings } from "src/types/settings";
import { DEFAULT_SETTINGS } from "src/config/default-settings";
import { LANGUAGE_TAG } from "src/config/constants";
import { getEditor } from "src/utils/command";
import { CodeBlockGenerator } from "src/core/code-block/generator";
import { CodeBlockProcessor } from "src/core/code-block/processor";
import { ServiceManager } from "src/services/service-manager";
import { createDownloadImageToAttachmentFolder } from "src/utils/path";
import { t, DEFAULT_LOCALE, Locale, getObsidianLanguage, setLocale } from "src/i18n";
import { isImageUrl, isValidMarkdownLink, isValidUrl, linkRegex } from "src/utils/regex";

/**
 * 主插件类
 */
export default class ObsidianAutoCardLink extends Plugin {
  private settings: ObsidianAutoCardLinkSettings = DEFAULT_SETTINGS;
  private serviceManager!: ServiceManager;
  private locale: Locale = DEFAULT_LOCALE;

  async onload() {
    // 加载设置
    await this.loadSettings();

    console.log("Current locale:", this.locale);
    console.log("Obsidian language:", getObsidianLanguage());

    // 设置当前语言
    this.setLocale(getObsidianLanguage());
    
    // 初始化服务管理器
    const saveImageToAttachment = createDownloadImageToAttachmentFolder(this.app.workspace.getActiveViewOfType(MarkdownView));
    this.serviceManager = new ServiceManager(
      this.app.vault,
      this.settings,
      {},
      saveImageToAttachment
    );

    // 注册代码块处理器
    this.registerMarkdownCodeBlockProcessor(LANGUAGE_TAG, async (source, el, ctx) => {
      try {
        const sectionInfo = ctx.getSectionInfo(el);
        if (!sectionInfo) return;

        // 获取当前 Markdown 编辑器
        const editor = getEditor(this.app);
        if (!editor) return;

        // 计算代码块的文本范围
        const doc = editor.getDoc();
        const lastLine = doc.lastLine();
        const fromLine = Math.max(sectionInfo.lineStart - 1, 0);
        const toLine = Math.min(sectionInfo.lineEnd + 1, lastLine);

        const from = { line: fromLine, ch: 0 };
        const to = { line: toLine, ch: 0 };
        const changeValue = (content: string) => {
          editor.replaceRange(content, from, to);
          if (this.settings.showSuccessNotice) {
            new Notice(t("ui.cardLinkRefreshed", this.locale));
          }
        }

        // 使用服务管理器获取元数据服务
        const metadataService = this.serviceManager.getMetadataService();
        
        // 创建代码块处理器并运行
        const processor = new CodeBlockProcessor(
          this.app, 
          source, 
          changeValue, 
          this.settings,
          metadataService
        );
        await processor.run(el);
      } catch (err: any) {
        new Notice(`🚨 ${t("errors.processorError", this.locale)}: ${err.message}`);
        console.error("CodeBlockProcessor Error:", err);
      }
    });

    // 注册命令：粘贴URL并增强为卡片链接
    this.addCommand({
      id: "auto-card-link-paste-and-enhance",
      name: t("commands.pasteAndEnhance", this.locale),
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.manualPasteAndEnhanceURL(editor, view);
      },
      hotkeys: [],
    });

    // 注册命令：增强选中的URL为卡片链接
    this.addCommand({
      id: "auto-card-link-enhance-selected-url",
      name: t("commands.enhanceSelectedUrl", this.locale),
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
        // 离线状态不显示命令
        if (!navigator.onLine) return false;

        if (checking) return true;

        this.enhanceSelectedURL(editor, view);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "e",
        },
      ],
    });

    // 注册事件：编辑器粘贴
    this.registerEvent(this.app.workspace.on("editor-paste", this.onPaste));

    // 注册事件：编辑器菜单
    this.registerEvent(this.app.workspace.on("editor-menu", this.onEditorMenu));

    // 添加设置选项卡
    this.addSettingTab(new SettingsTab(this.app, this as any));
  }

  /**
   * 增强选中的URL为卡片链接
   * @param editor - 编辑器实例
   * @param view - Markdown视图实例
   */
  private enhanceSelectedURL(editor: Editor, view: MarkdownView): void {
    // 获取选中的文本
    const selectedText = editor.getSelection().trim();
    
    // 创建代码块生成器
    const codeBlockGenerator = new CodeBlockGenerator(editor, view, this.settings);

    // 遍历选中的文本行处理URL
    for (const line of selectedText.split(/[\n ]/)) {
      if (isValidUrl(line)) {
        codeBlockGenerator.convertUrlToCodeBlock(line);
      } else if (isValidMarkdownLink(line)) {
        const url = this.getUrlFromLink(line);
        if (url) {
          codeBlockGenerator.convertUrlToCodeBlock(url);
        }
      }
    }
  }

  /**
   * 手动粘贴并增强剪贴板中的URL为卡片链接
   * @param editor - 编辑器实例
   * @param view - Markdown视图实例
   */
  private async manualPasteAndEnhanceURL(editor: Editor, view: MarkdownView): Promise<void> {
    // 检查剪贴板内容是否为空
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) {
      return;
    }

    // 离线时直接粘贴原始内容
    if (!navigator.onLine) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // 非URL内容或图片URL直接粘贴
    if (!isValidUrl(clipboardText) || isImageUrl(clipboardText)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    // 创建代码块生成器并转换URL为卡片链接
    const codeBlockGenerator = new CodeBlockGenerator(editor, view, this.settings);
    await codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
  }

  /**
   * 处理编辑器粘贴事件
   * @param evt - 剪贴板事件对象
   * @param editor - 编辑器实例
   * @param markdownView - Markdown视图实例
   */
  private onPaste = async (
    evt: ClipboardEvent,
    editor: Editor,
    markdownView: MarkdownView
  ): Promise<void> => {
    // 如果未启用增强粘贴功能则直接返回
    if (!this.settings?.enhanceDefaultPaste) return;

    // 离线状态下不处理
    if (!navigator.onLine) return;

    if (!evt.clipboardData) return;

    // 如果剪贴板包含文件，则交由默认处理器处理
    if (evt.clipboardData.files.length > 0) return;

    const clipboardText = evt.clipboardData.getData("text/plain");
    if (!clipboardText) return;

    // 非URL或图片链接由默认处理器处理
    if (!isValidUrl(clipboardText) || isImageUrl(clipboardText)) {
      return;
    }

    // 停止默认处理
    evt.stopPropagation();
    evt.preventDefault();

    // 创建代码块生成器并转换URL为卡片链接
    const codeBlockGenerator = new CodeBlockGenerator(editor, markdownView, this.settings);
    await codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
  };

  /**
   * 处理编辑器菜单项的创建与事件绑定
   * @param menu - 编辑器菜单实例
   * @param editor - 编辑器实例
   * @param view - Markdown视图实例
   */
  private onEditorMenu = (menu: Menu, editor: Editor, view: MarkdownView) => {
    // 根据设置决定是否显示整个菜单模块
    if (!this.settings?.showInMenuItem) return;

    // 添加"粘贴URL并转换为卡片链接"菜单项
    menu.addItem((item: MenuItem) => {
      item
        .setTitle(t("commands.pasteAndEnhance", this.locale))
        .setIcon("paste")
        .onClick(async () => {
          this.manualPasteAndEnhanceURL(editor, view);
        });
    });

    // 离线状态下跳过网络相关功能菜单的创建
    if (!navigator.onLine) return;

    // 添加"将选中URL转换为卡片链接"菜单项
    menu.addItem((item: MenuItem) => {
      item
        .setTitle(t("commands.enhanceSelectedUrl", this.locale))
        .setIcon("link")
        .onClick(() => {
          this.enhanceSelectedURL(editor, view);
        });
    });
  };

  /**
   * 从Markdown链接中提取URL
   * @param link - Markdown链接文本
   * @returns 提取的URL，如果无法提取则返回空字符串
   */
  private getUrlFromLink(link: string): string {
    const urlRegex = new RegExp(linkRegex);
    const regExpExecArray = urlRegex.exec(link);
    if (!regExpExecArray || regExpExecArray.length < 2) {
      return "";
    }
    return regExpExecArray[2];
  }

  /**
   * 插件卸载时的清理工作
   */
  onunload() {
    console.log("Unloading Auto Card Link plugin");
  }

  /**
   * 加载插件设置
   */
  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * 保存插件设置
   */
  async saveSettings() {
    await this.saveData(this.settings);
    // 更新服务管理器的设置
    this.serviceManager?.updateSettings(this.settings);
  }

  /**
   * 设置当前语言
   * @param locale - 语言代码
   */
  setLocale(locale: Locale) {
    this.locale = locale;
    // 调用i18n模块的setLocale函数，确保所有组件都使用相同的语言设置
    setLocale(locale);
  }
}

