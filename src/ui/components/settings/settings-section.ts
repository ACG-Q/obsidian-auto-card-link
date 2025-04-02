/**
 * 设置分区组件
 * 
 * 用于在设置页面中创建一个带有标题的分组，方便组织相关设置项
 */

import { Setting } from 'obsidian';

/**
 * 设置分区组件接口
 */
export interface SettingsSectionOptions {
  /**
   * 分区标题
   */
  title: string;
  
  /**
   * 分区描述（可选）
   */
  description?: string | DocumentFragment;
  
  /**
   * 父容器元素
   */
  containerEl: HTMLElement;
}

/**
 * 设置分区组件
 * 
 * 用于在设置页面中创建一个带有标题的分组，方便组织相关设置项
 */
export class SettingsSection {
  /**
   * 分区标题
   */
  private title: string;
  
  /**
   * 分区描述
   */
  private description?: string | DocumentFragment;
  
  /**
   * 父容器元素
   */
  private containerEl: HTMLElement;
  
  /**
   * 分区容器元素
   */
  private sectionEl: HTMLElement;
  
  /**
   * 构造函数
   * 
   * @param options 设置分区选项
   */
  constructor(options: SettingsSectionOptions) {
    this.title = options.title;
    this.description = options.description;
    this.containerEl = options.containerEl;
    
    // 创建分区容器
    this.sectionEl = this.containerEl.createDiv('settings-section');
    
    // 创建标题
    this.sectionEl.createEl('h3', { text: this.title, cls: 'settings-section-title' });
    
    // 如果有描述，则创建描述元素
    if (this.description) {
      const descEl = this.sectionEl.createDiv('settings-section-description');
      if (typeof this.description === 'string') {
        descEl.setText(this.description);
      } else {
        descEl.appendChild(this.description);
      }
    }
  }
  
  /**
   * 创建一个设置项
   * 
   * @returns Setting 实例
   */
  createSetting(): Setting {
    return new Setting(this.sectionEl);
  }
  
  /**
   * 获取分区容器元素
   * 
   * @returns 分区容器元素
   */
  getContainerEl(): HTMLElement {
    return this.sectionEl;
  }
}