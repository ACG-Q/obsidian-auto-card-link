import { App, PluginSettingTab, Setting } from "obsidian";

import ObsidianAutoCardLink from "src/main";

export interface ObsidianAutoCardLinkSettings {
  showInMenuItem: boolean;
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
   * 生成的图片的放置位置
   */
  imageLocation: string;
}

export const DEFAULT_SETTINGS: ObsidianAutoCardLinkSettings = {
  showInMenuItem: true,
  enhanceDefaultPaste: false,
  screenshotApiKey: "",
  screenshotExtraParam: "&dimension=1280×720",
  imageLocation: "attachments",
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

    // 添加标题 截图配置
    containerEl.createEl("h3", { text: "Screenshot Configuration" });

    // 创建并配置"截图"API的密钥
    new Setting(containerEl)
      .setName("Screenshot API Key")
      .setDesc(createFragment((el)=>{
        el.createEl("span", { text: "Get your own API key from " });
        el.createEl("a", { text: "ScreenshotMachine Dashboard", href: "https://www.screenshotmachine.com/dashboard.php" });
        el.createEl("span", { text: " and paste it here." });
      }))
      .addText((val) => {
        if (!this.plugin.settings) return;
        return val
          .setValue(this.plugin.settings.screenshotApiKey)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            this.plugin.settings.screenshotApiKey = value;
            await this.plugin.saveSettings();
          });
      })

    // 创建并配置"截图"API的额外参数
    new Setting(containerEl)
      .setName("Screenshot Extra Param")
      .setDesc(createFragment(el => {
        // 主说明段落
        const descParagraph = el.createEl('p');
        descParagraph.createEl('span', { 
          text: 'Add extra parameters to customize screenshot output. ' 
        });
        
        // 文档链接
        descParagraph.createEl('a', {
          text: 'API Documentation',
          href: 'https://www.screenshotmachine.com/website-screenshot-api.php#api_doc'
        });
        descParagraph.createEl('span', { text: ' | ' });
        
        // 参数生成器链接
        descParagraph.createEl('a', {
          text: 'Parameter Builder',
          href: 'https://www.screenshotmachine.com/builder.php'
        });
        descParagraph.createEl('span', { text: '.' });

        // 示例说明
        const exampleBlock = el.createEl('div', { cls: 'setting-item-description-example' });
        exampleBlock.createEl('p', { 
          text: 'Example parameters (append to default options):' 
        });
        
        // 预格式化的代码示例
        const pre = exampleBlock.createEl('pre', { cls: 'cm-s-obsidian' });
        pre.createEl('code', { 
          text: '&device=desktop&delay=2000&cacheLimit=0' 
        });

        // 使用说明列表
        const instructionList = el.createEl('ul');
        instructionList.createEl('li', { 
          text: 'Start parameters with & symbol' 
        });
        instructionList.createEl('li', { 
          text: 'Multiple parameters should be concatenated (e.g., &device=tablet&delay=5000)' 
        });
        instructionList.createEl('li', { 
          text: 'Do not include API key parameter' 
        });
      }))
      .addText((val) => {
        if (!this.plugin.settings) return;
        return val
          .setValue(this.plugin.settings.screenshotExtraParam)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            this.plugin.settings.screenshotExtraParam = value;
            await this.plugin.saveSettings();
          })
      })
  }
}
