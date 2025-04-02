/**
 * 设置页面组件
 * 
 * 用于创建插件的设置页面，管理所有设置项
 */

import { App, PluginSettingTab } from 'obsidian';
import { t } from 'src/i18n';

import { ObsidianAutoCardLinkSettings } from 'src/types/settings';
import { SettingsSection } from './settings-section';

/**
 * 插件主类接口
 * 
 * 用于定义与主插件类交互所需的方法
 */
export interface PluginInstance {
  /**
   * 插件设置
   */
  settings?: ObsidianAutoCardLinkSettings;
  
  /**
   * 保存设置方法
   */
  saveSettings(): Promise<void>;
}

/**
 * 设置页面组件
 * 
 * 用于创建插件的设置页面，管理所有设置项
 */
export class SettingsTab extends PluginSettingTab {
  /**
   * 插件实例
   */
  private plugin: PluginInstance;
  
  /**
   * 构造函数
   * 
   * @param app Obsidian应用实例
   * @param plugin 插件实例
   */
  constructor(app: App, plugin: PluginInstance) {
    super(app, plugin as any);
    this.plugin = plugin;
  }
  
  /**
   * 显示设置页面
   */
  display(): void {
    const { containerEl } = this;
    
    // 清空容器
    containerEl.empty();
    
    // 创建基本设置分区
    this.createBasicSettings(containerEl);
    
    // 创建截图设置分区
    this.createScreenshotSettings(containerEl);
    
    // 创建高级设置分区
    this.createAdvancedSettings(containerEl);
  }
  
  /**
   * 创建基本设置分区
   * 
   * @param containerEl 父容器元素
   */
  private createBasicSettings(containerEl: HTMLElement): void {
    const section = new SettingsSection({
      title: t('settings.general.title'),
      containerEl
    });

    console.log(t('settings.general.title'));
    console.log(t('settings.general.autoConvert'));
    
    // 创建并配置"增强默认粘贴"功能开关
    section.createSetting()
      .setName(t('settings.general.autoConvert'))
      .setDesc(t('settings.general.autoConvertDescription'))
      .addToggle((toggle) => {
        if (!this.plugin.settings) return toggle;
        
        return toggle
          .setValue(this.plugin.settings.enhanceDefaultPaste)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.enhanceDefaultPaste = value;
            await this.plugin.saveSettings();
          });
      });
    
    // 创建并配置"右键菜单命令"显示开关
    section.createSetting()
      .setName(t('settings.general.showInMenu'))
      .setDesc(t('settings.general.showInMenuDescription'))
      .addToggle((toggle) => {
        if (!this.plugin.settings) return toggle;
        
        return toggle
          .setValue(this.plugin.settings.showInMenuItem)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.showInMenuItem = value;
            await this.plugin.saveSettings();
          });
      });
  }
  
  /**
   * 创建截图设置分区
   * 
   * @param containerEl 父容器元素
   */
  private createScreenshotSettings(containerEl: HTMLElement): void {
    const section = new SettingsSection({
      title: t('settings.screenshot.title'),
      containerEl
    });
    
    // 创建并配置"截图API密钥"设置
    section.createSetting()
      .setName(t('settings.screenshot.apiKey'))
      .setDesc(createFragment((el) => {
        el.createEl('span', { text: t('settings.screenshot.apiKeyDescPart1') });
        el.createEl('a', { 
          text: t('settings.screenshot.apiKeyDashboard'), 
          href: 'https://www.screenshotmachine.com/dashboard.php' 
        });
        el.createEl('span', { text: t('settings.screenshot.apiKeyDescPart2') });
      }))
      .addText((text) => {
        if (!this.plugin.settings) return text;
        
        return text
          .setValue(this.plugin.settings.screenshotApiKey)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.screenshotApiKey = value;
            await this.plugin.saveSettings();
          });
      });
    
    // 创建并配置"截图额外参数"设置
    section.createSetting()
      .setName(t('settings.screenshot.extraParams'))
      .setDesc(createFragment(el => {
        // 主说明段落
        const descParagraph = el.createEl('p');
        descParagraph.createEl('span', { 
          text: t('settings.screenshot.extraParamsDesc') 
        });
        
        // 文档链接
        descParagraph.createEl('a', {
          text: t('settings.screenshot.apiDocs'),
          href: 'https://www.screenshotmachine.com/website-screenshot-api.php#api_doc'
        });
        descParagraph.createEl('span', { text: ' | ' });
        
        // 参数生成器链接
        descParagraph.createEl('a', {
          text: t('settings.screenshot.paramBuilder'),
          href: 'https://www.screenshotmachine.com/builder.php'
        });
        descParagraph.createEl('span', { text: t('settings.screenshot.periodMark') });

        // 示例说明
        const exampleBlock = el.createEl('div', { cls: 'setting-item-description-example' });
        exampleBlock.createEl('p', { 
          text: t('settings.screenshot.exampleParams') 
        });
        
        // 预格式化的代码示例
        const pre = exampleBlock.createEl('pre', { cls: 'cm-s-obsidian' });
        pre.createEl('code', { 
          text: '&device=desktop&delay=2000&cacheLimit=0' 
        });

        // 使用说明列表
        const instructionList = el.createEl('ul');
        instructionList.createEl('li', { 
          text: t('settings.screenshot.paramTip1') 
        });
        instructionList.createEl('li', { 
          text: t('settings.screenshot.paramTip2') 
        });
        instructionList.createEl('li', { 
          text: t('settings.screenshot.paramTip3') 
        })
      }))
      .addText((text) => {
        if (!this.plugin.settings) return text;
        
        return text
          .setValue(this.plugin.settings.screenshotExtraParam)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.screenshotExtraParam = value;
            await this.plugin.saveSettings();
          });
      });
  }
  
  /**
   * 创建高级设置分区
   * 
   * @param containerEl 父容器元素
   */
  private createAdvancedSettings(containerEl: HTMLElement): void {
    const section = new SettingsSection({
      title: t('settings.advanced.title'),
      containerEl
    });
    
    // 创建并配置"优先使用本地图片"设置
    section.createSetting()
      .setName(t('settings.advanced.preferLocalImages'))
      .setDesc(t('settings.advanced.preferLocalImagesDescription'))
      .addToggle((toggle) => {
        if (!this.plugin.settings) return toggle;
        
        return toggle
          .setValue(this.plugin.settings.preferLocalImages ?? true)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.preferLocalImages = value;
            await this.plugin.saveSettings();
          });
      });
    
    // 创建并配置"下载图片到本地"设置
    section.createSetting()
      .setName(t('settings.advanced.downloadImages'))
      .setDesc(t('settings.advanced.downloadImagesDescription'))
      .addToggle((toggle) => {
        if (!this.plugin.settings) return toggle;
        
        return toggle
          .setValue(this.plugin.settings.downloadImages ?? true)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.downloadImages = value;
            await this.plugin.saveSettings();
          });
      });
    
    // 创建并配置"显示成功通知"设置
    section.createSetting()
      .setName(t('settings.advanced.showSuccessNotice'))
      .setDesc(t('settings.advanced.showSuccessNoticeDescription'))
      .addToggle((toggle) => {
        if (!this.plugin.settings) return toggle;
        
        return toggle
          .setValue(this.plugin.settings.showSuccessNotice ?? true)
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.showSuccessNotice = value;
            await this.plugin.saveSettings();
          });
      });
    
    // 创建并配置"缩进级别"设置
    section.createSetting()
      .setName(t('settings.advanced.indentLevel'))
      .setDesc(t('settings.advanced.indentLevelDescription'))
      .addSlider((slider) => {
        if (!this.plugin.settings) return slider;
        
        return slider
          .setLimits(0, 10, 1)
          .setValue(this.plugin.settings.indentLevel ?? 0)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (!this.plugin.settings) return;
            
            this.plugin.settings.indentLevel = value;
            await this.plugin.saveSettings();
          });
      });
  }
}