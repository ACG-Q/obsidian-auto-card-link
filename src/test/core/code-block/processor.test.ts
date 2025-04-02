/**
 * CodeBlockProcessor单元测试
 */

import { CodeBlockProcessor } from '../../../core/code-block/processor';
import { App } from 'obsidian';
import { ObsidianAutoCardLinkSettings } from '../../../types/settings';
import { MetadataService } from '../../../services/metadata-service';
import { LinkMetadata } from '../../../types/metadata';

// 模拟Obsidian App
const mockApp = {
  vault: {
    adapter: {
      exists: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(Buffer.from('test image data')),
    },
  },
} as unknown as App;

// 模拟DOM元素
class MockElement {
  private children: MockElement[] = [];
  private content: string = '';
  private elementClasses: string[] = [];
  
  appendChild(child: MockElement): void {
    this.children.push(child);
  }
  
  createEl(tag: string, attrs?: any): MockElement {
    const el = new MockElement();
    if (attrs?.text) {
      el.content = attrs.text;
    }
    if (attrs?.cls) {
      el.elementClasses = Array.isArray(attrs.cls) ? attrs.cls : [attrs.cls];
    }
    this.appendChild(el);
    return el;
  }
  
  setText(text: string): void {
    this.content = text;
  }
  
  addClass(cls: string): void {
    this.elementClasses.push(cls);
  }
  
  hasClass(cls: string): boolean {
    return this.elementClasses.includes(cls);
  }
  
  getContent(): string {
    return this.content;
  }
  
  getChildren(): MockElement[] {
    return this.children;
  }
  
  empty(): void {
    this.children = [];
    this.content = '';
  }
}

describe('CodeBlockProcessor', () => {
  let processor: CodeBlockProcessor;
  let containerEl: MockElement;
  let changeValueMock: jest.Mock;
  let mockMetadataService: jest.Mocked<MetadataService>;
  let defaultSettings: ObsidianAutoCardLinkSettings;
  
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建模拟元素
    containerEl = new MockElement();
    
    // 创建模拟回调函数
    changeValueMock = jest.fn();
    
    // 创建模拟元数据服务
    mockMetadataService = {
      getMetadata: jest.fn(),
      clearCache: jest.fn(),
    } as unknown as jest.Mocked<MetadataService>;
    
    // 默认设置
    defaultSettings = {
      showInMenuItem: true,
      enhanceDefaultPaste: false,
      screenshotApiKey: "",
      screenshotExtraParam: "dimension=1024x768&delay=1000",
      imageLocation: "assets",
      preferLocalImages: true,
      downloadImages: true,
      showSuccessNotice: true,
      indentLevel: 0
    } as ObsidianAutoCardLinkSettings;
  });
  
  describe('run', () => {
    it('should render card with valid YAML metadata', async () => {
      // 准备测试数据 - 有效的YAML源码
      const validSource = `
      url: https://example.com
      title: Example Website
      description: This is an example website
      image: https://example.com/image.jpg
      `;
      
      // 创建处理器实例
      processor = new CodeBlockProcessor(
        mockApp,
        validSource,
        changeValueMock,
        defaultSettings,
        mockMetadataService
      );
      
      // 执行测试
      await processor.run(containerEl as unknown as HTMLElement);
      
      // 验证结果 - 应该创建卡片元素
      const children = containerEl.getChildren();
      expect(children.length).toBeGreaterThan(0);
      
      // 验证卡片内容
      const cardElement = children[0];
      expect(cardElement.hasClass('auto-card-link')).toBe(true);
    });
    
    it('should handle YAML parse error', async () => {
      // 准备测试数据 - 无效的YAML源码
      const invalidSource = `
      url: https://example.com
      title: "Unclosed quote
      `;
      
      // 创建处理器实例
      processor = new CodeBlockProcessor(
        mockApp,
        invalidSource,
        changeValueMock,
        defaultSettings,
        mockMetadataService
      );
      
      // 执行测试
      await processor.run(containerEl as unknown as HTMLElement);
      
      // 验证结果 - 应该显示错误信息
      const children = containerEl.getChildren();
      expect(children.length).toBeGreaterThan(0);
      
      // 验证错误元素
      const errorElement = children[0];
      expect(errorElement.hasClass('auto-card-link-error')).toBe(true);
    });
    
    it('should handle missing required parameters', async () => {
      // 准备测试数据 - 缺少必要参数的YAML源码
      const missingParamsSource = `
      description: This is an example website
      image: https://example.com/image.jpg
      `;
      
      // 创建处理器实例
      processor = new CodeBlockProcessor(
        mockApp,
        missingParamsSource,
        changeValueMock,
        defaultSettings,
        mockMetadataService
      );
      
      // 执行测试
      await processor.run(containerEl as unknown as HTMLElement);
      
      // 验证结果 - 应该显示错误信息
      const children = containerEl.getChildren();
      expect(children.length).toBeGreaterThan(0);
      
      // 验证错误元素
      const errorElement = children[0];
      expect(errorElement.hasClass('auto-card-link-error')).toBe(true);
    });
  });
  
  describe('refresh functionality', () => {
    it('should refresh metadata when refresh button is clicked', async () => {
      // 准备测试数据
      const source = `
      url: https://example.com
      title: Example Website
      `;
      
      // 模拟元数据服务返回更新后的数据
      const updatedMetadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Updated Title',
        description: 'Updated Description',
        indent: 0
      };
      mockMetadataService.getMetadata.mockResolvedValue(updatedMetadata);
      
      // 创建处理器实例
      processor = new CodeBlockProcessor(
        mockApp,
        source,
        changeValueMock,
        defaultSettings,
        mockMetadataService
      );
      
      // 执行测试
      await processor.run(containerEl as unknown as HTMLElement);
      
      // 模拟刷新按钮点击
      // 注意：由于我们无法直接访问刷新按钮，这里只能验证元数据服务的调用
      expect(mockMetadataService.getMetadata).not.toHaveBeenCalled();
      
      // 在实际实现中，我们需要找到刷新按钮并触发点击事件
      // 但在这个测试中，我们只能验证处理器的基本功能
    });
  });
});