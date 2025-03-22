import { Plugin, MarkdownView, Editor, Menu, MenuItem } from "obsidian";

import {
  ObsidianAutoCardLinkSettings,
  ObsidianAutoCardLinkSettingTab,
  DEFAULT_SETTINGS,
} from "src/settings";
import { EditorExtensions } from "src/editor_enhancements";
import { CheckIf } from "src/checkif";
import { CodeBlockGenerator } from "src/code_block_generator";
import { CodeBlockProcessor } from "src/code_block_processor";
import { linkRegex } from "src/regex";

export default class ObsidianAutoCardLink extends Plugin {
  settings?: ObsidianAutoCardLinkSettings;

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor("cardlink", async (source, el) => {
      const processor = new CodeBlockProcessor(this.app);
      await processor.run(source, el);
    });

    this.addCommand({
      id: "auto-card-link-paste-and-enhance",
      name: "Paste URL and enhance to card link",
      editorCallback: async (editor: Editor) => {
        await this.manualPasteAndEnhanceURL(editor);
      },
      hotkeys: [],
    });

    this.addCommand({
      id: "auto-card-link-enhance-selected-url",
      name: "Enhance selected URL to card link",
      editorCheckCallback: (checking: boolean, editor: Editor) => {
        // if offline, not showing command
        if (!navigator.onLine) return false;

        if (checking) return true;

        this.enhanceSelectedURL(editor);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "e",
        },
      ],
    });

    this.registerEvent(this.app.workspace.on("editor-paste", this.onPaste));

    this.registerEvent(this.app.workspace.on("editor-menu", this.onEditorMenu));

    this.addSettingTab(new ObsidianAutoCardLinkSettingTab(this.app, this));
  }

  /**
   * 增强选中的URL为卡片链接
   * @param editor - 编辑器实例
   */
  private enhanceSelectedURL(editor: Editor): void {
    const selectedText = (
      EditorExtensions.getSelectedText(editor) || ""
    ).trim();

    const codeBlockGenerator = new CodeBlockGenerator(editor);

    // 遍历选中的文本行处理URL
    for (const line of selectedText.split(/[\n ]/)) {
      if (CheckIf.isUrl(line)) {
        codeBlockGenerator.convertUrlToCodeBlock(line);
      } else if (CheckIf.isLinkedUrl(line)) {
        const url = this.getUrlFromLink(line);
        codeBlockGenerator.convertUrlToCodeBlock(url);
      }
    }
  }

  /**
   * 手动粘贴并增强剪贴板中的URL为卡片链接
   * @param editor - 编辑器实例
   */
  private async manualPasteAndEnhanceURL(editor: Editor): Promise<void> {
    // 检查剪贴板内容是否为空
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText == null || clipboardText == "") {
      return;
    }

    // 离线时直接粘贴原始内容
    if (!navigator.onLine) {
      editor.replaceSelection(clipboardText);
      return;
    }

    console.log(clipboardText);
    console.log(CheckIf.isUrl(clipboardText));

    // 非URL内容直接粘贴
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      editor.replaceSelection(clipboardText);
      return;
    }

    const codeBlockGenerator = new CodeBlockGenerator(editor);
    await codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
    return;
  }

  /**
   * 处理编辑器粘贴事件
   * @param evt - 剪贴板事件对象
   * @param editor - 编辑器实例
   */
  private onPaste = async (
    evt: ClipboardEvent,
    editor: Editor
  ): Promise<void> => {
    // 如果未启用增强粘贴功能则直接返回
    if (!this.settings?.enhanceDefaultPaste) return;

    // 离线状态下不处理
    if (!navigator.onLine) return;

    if (evt.clipboardData == null) return;

    // 如果剪贴板包含文件，则交由默认处理器处理
    if (evt.clipboardData.files.length > 0) return;

    const clipboardText = evt.clipboardData.getData("text/plain");
    if (clipboardText == null || clipboardText == "") return;

    // 非URL或图片链接由默认处理器处理
    // 图片URL缺乏有效元数据，避免网络请求浪费
    if (!CheckIf.isUrl(clipboardText) || CheckIf.isImage(clipboardText)) {
      return;
    }

    // 我已经决定处理粘贴，停止默认处理
    evt.stopPropagation();
    evt.preventDefault();

    const codeBlockGenerator = new CodeBlockGenerator(editor);
    await codeBlockGenerator.convertUrlToCodeBlock(clipboardText);
    return;
  };

  /**
   * 处理编辑器菜单项的创建与事件绑定
   * @param menu - 编辑器菜单实例，用于添加自定义菜单项
   * @returns void 本函数无返回值
   */
  private onEditorMenu = (menu: Menu) => {
    // 根据设置决定是否显示整个菜单模块
    if (!this.settings?.showInMenuItem) return;

    // 添加"粘贴URL并转换为卡片链接"菜单项
    menu.addItem((item: MenuItem) => {
      item
        .setTitle("Paste URL and enhance to card link")
        .setIcon("paste")
        .onClick(async () => {
          const editor = this.getEditor();
          if (!editor) return;
          this.manualPasteAndEnhanceURL(editor);
        });
    });

    // 离线状态下跳过网络相关功能菜单的创建
    if (!navigator.onLine) return;

    // 添加"将选中URL转换为卡片链接"菜单项
    menu.addItem((item: MenuItem) => {
      item
        .setTitle("Enhance selected URL to card link")
        .setIcon("link")
        .onClick(() => {
          const editor = this.getEditor();
          if (!editor) return;
          this.enhanceSelectedURL(editor);
        });
    });

    return;
  };

  private getEditor(): Editor | undefined {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;
    return view.editor;
  }

  private getUrlFromLink(link: string): string {
    const urlRegex = new RegExp(linkRegex);
    const regExpExecArray = urlRegex.exec(link);
    if (regExpExecArray === null || regExpExecArray.length < 2) {
      return "";
    }
    return regExpExecArray[2];
  }

  onunload() {
    console.log("unloading auto-card-link");
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
