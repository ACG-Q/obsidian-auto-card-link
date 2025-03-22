import { App, parseYaml, Notice, ButtonComponent, getLinkPath } from "obsidian";

import { YamlParseError, NoRequiredParamsError } from "src/errors";
import { LinkMetadata } from "src/interfaces";
import { CheckIf } from "./checkif";

/**
 * 卡片链接代码块处理器
 */
export class CodeBlockProcessor {
  app: App;

  /**
   * 创建处理器实例
   * @param app - Obsidian应用实例 
   */
  constructor(app: App) {
    this.app = app;
  }

  /**
   * 执行链接卡片生成流程
   * @param source - YAML格式的链接元数据字符串，包含生成卡片所需的基础信息
   * @param el - 目标DOM容器元素，用于挂载生成的卡片元素或错误提示
   * @returns Promise<void> 异步操作，无直接返回值
   */
  async run(source: string, el: HTMLElement) {
    try {
      // 解析YAML元数据并生成链接卡片元素
      const data = this.parseLinkMetadataFromYaml(source);
      el.appendChild(this.genLinkEl(data));
    } catch (error) {
      // 错误处理流程：根据错误类型展示不同的用户提示
      if (error instanceof NoRequiredParamsError) {
        el.appendChild(this.genErrorEl(error.message));
      } else if (error instanceof YamlParseError) {
        el.appendChild(this.genErrorEl(error.message));
      } else if (error instanceof TypeError) {
        // 处理内部链接未加引号导致的类型错误
        el.appendChild(
          this.genErrorEl("internal links must be surrounded by" + " quotes.")
        );
        console.log(error);
      } else {
        // 捕获未预期的未知错误
        console.log("Code Block: cardlink unknown error", error);
      }
    }
  }

  /**
   * 从YAML解析链接元数据
   * @param source - 原始YAML格式字符串
   * @returns 结构化的链接元数据
   * @throws YamlParseError | NoRequiredParamsError
   */
  private parseLinkMetadataFromYaml(source: string): LinkMetadata {
    let yaml: Partial<LinkMetadata>;

    let indent = -1;
    source = source
      .split(/\r?\n|\r|\n/g)
      .map((line) =>
        line.replace(/^\t+/g, (tabs) => {
          const n = tabs.length;
          if (indent < 0) {
            indent = n;
          }
          return " ".repeat(n);
        })
      )
      .join("\n");

    try {
      yaml = parseYaml(source) as Partial<LinkMetadata>;
    } catch (error) {
      console.log(error);
      throw new YamlParseError(
        "failed to parse yaml. Check debug console for more detail."
      );
    }

    if (!yaml || !yaml.url || !yaml.title) {
      throw new NoRequiredParamsError(
        "required params[url, title] are not found."
      );
    }

    return {
      url: yaml.url,
      title: yaml.title,
      description: yaml.description,
      host: yaml.host,
      favicon: yaml.favicon,
      image: yaml.image,
      indent,
    };
  }

  /**
   * 生成并返回包含错误信息的HTML元素
   * @param errorMsg - 需要显示的错误信息字符串
   * @returns 包含格式化错误信息的div元素，具有错误容器样式类
   */
  private genErrorEl(errorMsg: string): HTMLElement {
    // 创建错误容器元素并添加样式类
    const containerEl = document.createElement("div");
    containerEl.addClass("auto-card-link-error-container");

    // 创建并配置错误信息展示元素
    const spanEl = document.createElement("span");
    spanEl.textContent = `cardlink error: ${errorMsg}`;
    containerEl.appendChild(spanEl);

    return containerEl;
  }

  /**
   * 生成链接卡片DOM元素
   * 
   * @private
   * @param data - 链接元数据对象，包含以下属性：
   *   indent: 缩进层级
   *   url: 链接地址
   *   title: 链接标题
   *   description: 链接描述（可选）
   *   favicon: 网站图标路径/URL（可选）
   *   host: 网站主机名（可选）
   *   image: 缩略图路径/URL（可选）
   * @returns 组装完成的链接卡片容器元素
   */
  private genLinkEl(data: LinkMetadata): HTMLElement {
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
      if (!CheckIf.isUrl(data.favicon))
        data.favicon = this.getLocalImagePath(data.favicon);
  
      const faviconEl = document.createElement("img");
      faviconEl.addClass("auto-card-link-favicon");
      faviconEl.setAttr("src", data.favicon);
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
      if (!CheckIf.isUrl(data.image))
        data.image = this.getLocalImagePath(data.image);
  
      const thumbnailEl = document.createElement("img");
      thumbnailEl.addClass("auto-card-link-thumbnail");
      thumbnailEl.setAttr("src", data.image);
      thumbnailEl.setAttr("draggable", "false");
      cardEl.appendChild(thumbnailEl);
    }
  
    // 创建并配置复制URL的按钮组件
    new ButtonComponent(containerEl)
      .setClass("auto-card-link-copy-url")
      .setClass("clickable-icon")
      .setIcon("copy")
      .setTooltip(`Copy URL\n${data.url}`)
      .onClick(() => {
        navigator.clipboard.writeText(data.url);
        new Notice("URL copied to your clipboard");
      });
  
    return containerEl;
  }

  /**
   * 获取本地图片资源路径
   * @param link - 图片链接（格式：[[filename]]）
   * @returns 完整的本地资源路径或原始链接
   */
  private getLocalImagePath(link: string): string {
    link = link.slice(2, -2); // remove [[]]
    const imageRelativePath = this.app.metadataCache.getFirstLinkpathDest(
      getLinkPath(link),
      ""
    )?.path;

    if (!imageRelativePath) return link;

    return this.app.vault.adapter.getResourcePath(imageRelativePath);
  }
}
