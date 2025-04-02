/**
 * 卡片链接渲染器
 * 
 * 负责将链接元数据渲染为可视化卡片组件
 */

import { ButtonComponent, Notice } from "obsidian";
import { t } from "src/i18n";
import { LinkMetadata } from "src/types/metadata";
import { LocalImagePathResolver } from "./local-image-resolver";
import { isValidUrl } from "src/utils/regex";

/**
 * 卡片链接渲染器类
 */
export class CardLinkRenderer {
  private localImageResolver: LocalImagePathResolver;
  
  /**
   * 创建卡片链接渲染器实例
   * 
   * @param localImageResolver 本地图片路径解析器
   */
  constructor(localImageResolver: LocalImagePathResolver) {
    this.localImageResolver = localImageResolver;
  }

  /**
   * 生成链接卡片DOM元素
   * 
   * @param data 链接元数据对象
   * @returns 组装完成的链接卡片容器元素
   */
  public render(data: LinkMetadata): HTMLElement {
    // 创建基础容器元素并设置缩进层级
    const containerEl = document.createElement("div");
    containerEl.addClass("auto-card-link-container");
    containerEl.setAttr("data-auto-card-link-depth", data.indent);
  
    // 构建卡片主体结构（链接 > 主内容区）
    const cardEl = document.createElement("a");
    cardEl.addClass("auto-card-link-card");
    cardEl.setAttr("href", data.url);
    containerEl.appendChild(cardEl);
  
    // 主内容区域包含标题、描述和网站信息
    const mainEl = document.createElement("div");
    mainEl.addClass("auto-card-link-main");
    cardEl.appendChild(mainEl);
  
    // 标题元素
    const titleEl = document.createElement("div");
    titleEl.addClass("auto-card-link-title");
    titleEl.textContent = data.title;
    mainEl.appendChild(titleEl);
  
    // 条件创建描述元素
    if (data.description) {
      const descriptionEl = document.createElement("div");
      descriptionEl.addClass("auto-card-link-description");
      descriptionEl.textContent = data.description;
      mainEl.appendChild(descriptionEl);
    }
  
    // 网站信息区域（图标+主机名）
    const hostEl = document.createElement("div");
    hostEl.addClass("auto-card-link-host");
    mainEl.appendChild(hostEl);
  
    // 处理网站图标（支持本地路径转换）
    if (data.favicon) {
      const faviconPath = !isValidUrl(data.favicon) 
        ? this.localImageResolver.getLocalImagePath(data.favicon)
        : data.favicon;
  
      const faviconEl = document.createElement("img");
      faviconEl.addClass("auto-card-link-favicon");
      faviconEl.setAttr("src", faviconPath);
      hostEl.appendChild(faviconEl);
    }
  
    // 条件显示主机名
    if (data.host) {
      const hostNameEl = document.createElement("span");
      hostNameEl.textContent = data.host;
      hostEl.appendChild(hostNameEl);
    }
  
    // 处理缩略图（支持本地路径转换）
    if (data.image) {
      const imagePath = !isValidUrl(data.image)
        ? this.localImageResolver.getLocalImagePath(data.image)
        : data.image;
  
      const thumbnailEl = document.createElement("img");
      thumbnailEl.addClass("auto-card-link-thumbnail");
      thumbnailEl.setAttr("src", imagePath);
      thumbnailEl.setAttr("draggable", "false");
      cardEl.appendChild(thumbnailEl);
    }

    // 按钮容器
    const buttonContainerEl = containerEl.createDiv({
      cls: "auto-card-link-buttons",
    });
  
    // 创建并配置复制URL的按钮组件
    new ButtonComponent(buttonContainerEl)
      .setClass("auto-card-link-copy-url")
      .setClass("clickable-icon")
      .setIcon("copy")
      .setTooltip(t("ui.copyUrl") + `\n${data.url}`)
      .onClick(() => {
        navigator.clipboard.writeText(data.url);
        new Notice(t("ui.urlCopied"));
      });

    // 不再在渲染器中添加刷新按钮
    // 刷新按钮将由RefreshButton组件单独处理
  
    return containerEl;
  }

  /**
   * 生成并返回包含错误信息的HTML元素
   * 
   * @param errorMsg 需要显示的错误信息字符串
   * @returns 包含格式化错误信息的div元素，具有错误容器样式类
   */
  public renderError(errorMsg: string): HTMLElement {
    // 创建错误容器元素并添加样式类
    const containerEl = document.createElement("div");
    containerEl.addClass("auto-card-link-error-container");

    // 创建并配置错误信息展示元素
    const spanEl = document.createElement("span");
    spanEl.textContent = `cardlink error: ${errorMsg}`;
    containerEl.appendChild(spanEl);

    return containerEl;
  }
}