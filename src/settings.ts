import { App, PluginSettingTab, Setting } from "obsidian";

import ObsidianAutoCardLink from "src/main";

export interface ObsidianAutoCardLinkSettings {
  showInMenuItem: boolean;
  enhanceDefaultPaste: boolean;
}

export const DEFAULT_SETTINGS: ObsidianAutoCardLinkSettings = {
  showInMenuItem: true,
  enhanceDefaultPaste: false,
};

export class ObsidianAutoCardLinkSettingTab extends PluginSettingTab {
  plugin: ObsidianAutoCardLink;

  /**
   * 构造函数，用于创建 AutoCardLinkSettingTab 实例
   * @param app - Obsidian 应用实例，用于访问应用级功能和方法
   * @param plugin - AutoCardLink 插件主实例，用于访问插件配置和方法
   */
  constructor(app: App, plugin: ObsidianAutoCardLink) {
    super(app, plugin);
    // 初始化插件实例引用，用于后续配置界面与插件主体的交互
    this.plugin = plugin;
  }

  /**
   * 渲染插件设置界面
   * 
   * 本函数负责创建并显示插件的配置界面，包含两个主要设置项：
   * 1. 增强默认粘贴功能开关
   * 2. 右键菜单命令显示开关
   * 通过toggle组件实现设置值的实时保存
   */
  display(): void {
    const { containerEl } = this;
  
    containerEl.empty();
  
    // 创建并配置"增强默认粘贴"功能开关
    new Setting(containerEl)
      .setName("Enhance Default Paste")
      .setDesc("Fetch the link metadata when pasting a url in the editor with the default paste command")
      .addToggle((val) => {
        if (!this.plugin.settings) return;
        return val
          .setValue(this.plugin.settings.enhanceDefaultPaste)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            this.plugin.settings.enhanceDefaultPaste = value;
            await this.plugin.saveSettings();
          });
      });
  
    // 创建并配置"右键菜单命令"显示开关
    new Setting(containerEl)
      .setName("Add commands in menu item")
      .setDesc("Whether to add commands in right click menu items")
      .addToggle((val) => {
        if (!this.plugin.settings) return;
        return val
          .setValue(this.plugin.settings.showInMenuItem)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            this.plugin.settings.showInMenuItem = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
