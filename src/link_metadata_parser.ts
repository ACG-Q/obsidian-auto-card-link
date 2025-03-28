import { requestUrl } from "obsidian";
import { LinkMetadata } from "src/interfaces";
import { ObsidianAutoCardLinkSettings } from "./settings";

export type ImageAttachmentSaverCallback = (url: string, fileName: string) => Promise<string>;


export class LinkMetadataParser {
  url: string;
  title: string;
  htmlDoc: Document;
  settings?: ObsidianAutoCardLinkSettings;
  /**
   * 保存图片到附件里面
   */
  saveImageToAttachment: ImageAttachmentSaverCallback;

  constructor(url: string, htmlText: string, saveImageToAttachment: ImageAttachmentSaverCallback, settings?: ObsidianAutoCardLinkSettings) {
    this.url = url;
    this.settings = settings;
    this.saveImageToAttachment = saveImageToAttachment;

    this.title = ""

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlText, "text/html");
    this.htmlDoc = htmlDoc;
  }

  /**
   * 解析链接元数据并生成结构化信息
   * 
   * 该方法通过提取页面标题、描述、域名、图标和图片等信息，组装成链接元数据对象。
   * 会对标题和描述进行格式清理（移除换行符和特殊字符转义处理）。
   * 
   * @returns {Promise<LinkMetadata | undefined>} 返回包含以下属性的元数据对象：
   *   - url: 原始页面URL
   *   - title: 清理后的页面标题（必填）
   *   - description: 清理后的页面描述
   *   - host: 解析URL得到的域名
   *   - favicon: 网站图标URL
   *   - image: 页面主图URL
   *   - indent: 固定为0的预留字段
   *   当缺少必填标题时返回undefined
   */
  async parse(): Promise<LinkMetadata | undefined> {
    // 清理并规范化标题：移除换行、转义反斜杠和双引号
    const title = this.getTitle()
      ?.replace(/\r\n|\n|\r/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .trim();
    if (!title) return;
    this.title = title;

    // 清理并规范化描述：处理方式与标题相同
    const description = this.getDescription()
      ?.replace(/\r\n|\n|\r/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .trim();

    // 解析域名和异步获取资源
    const { hostname } = new URL(this.url);
    const favicon = await this.getFavicon();
    const image = await this.getImage();

    return {
      url: this.url,
      title: title,
      description: description,
      host: hostname,
      favicon: favicon,
      image: image,
      indent: 0,
    };
  }

  /**
   * 获取文档标题，遵循Open Graph协议优先原则
   * 
   * 该方法尝试按以下顺序获取标题：
   * 1. 首先查找包含Open Graph协议og:title的meta标签
   * 2. 若未找到则回退到标准title标签
   * 
   * @returns {string | undefined} 返回找到的文档标题字符串，若两种方式均未找到则返回undefined
   */
  private getTitle(): string | undefined {
    // 优先尝试获取Open Graph协议定义的标题
    const ogTitle = this.htmlDoc
      .querySelector("meta[property='og:title']")
      ?.getAttr("content");
    if (ogTitle) return ogTitle;

    // 回退到标准title标签内容
    const title = this.htmlDoc.querySelector("title")?.textContent;
    if (title) return title;
  }

  /**
   * 获取当前HTML文档的优先描述信息
   * 
   * 遵循开放图谱协议(Open Graph)优先原则：
   * 1. 首先尝试获取og:description元标签的content属性值
   * 2. 如果不存在则尝试获取标准meta description的content属性值
   * 
   * @returns {string | undefined} 返回找到的优先描述文本，若两种元标签均不存在则返回undefined
   * 
   * @note 返回值优先级顺序：
   * - og:description meta标签 > name=description meta标签
   * - 两个元标签都缺失时返回undefined
   */
  private getDescription(): string | undefined {
    // 优先获取开放图谱(Open Graph)的描述信息
    const ogDescription = this.htmlDoc
      .querySelector("meta[property='og:description']")
      ?.getAttr("content");
    if (ogDescription) return ogDescription;

    // 次选获取标准meta description
    const metaDescription = this.htmlDoc
      .querySelector("meta[name='description']")
      ?.getAttr("content");
    if (metaDescription) return metaDescription;
  }

  /**
   * 获取网页的favicon图标地址
   * 
   * 该方法通过解析HTML文档中的link标签（rel="icon"）来获取网站图标地址，
   * 并对获取到的地址进行标准化处理。当不存在有效favicon时返回undefined
   * 
   * @returns {Promise<string | undefined>} 返回处理后的标准favicon地址，
   *          如果不存在有效图标则返回undefined
   */
  private async getFavicon(): Promise<string | undefined> {
    // 从HTML文档中查询rel属性为icon的link标签，并获取其href属性值
    const favicon = this.htmlDoc
      .querySelector("link[rel='icon']")
      ?.getAttr("href");

    // 当存在有效favicon地址时，对原始地址进行标准化处理
    if (favicon) return await this.fixImageUrl(favicon);
  }

  /**
   * 获取网页中Open Graph协议指定的图片URL
   * 
   * 本函数执行以下操作：
   * 1. 从HTML文档中查找包含og:image属性的meta标签
   * 2. 若找到有效图片URL，通过fixImageUrl方法进行URL规范化处理
   * 3. 返回处理后的图片URL或undefined（当未找到有效图片时）
   * 
   * @returns {Promise<string | undefined>} 返回处理后的标准图片URL，
   *          如果未找到og:image标签或内容为空则返回undefined
   */
  private async getImage(): Promise<string | undefined> {
    // 在文档中查询Open Graph图片元标签
    const ogImage = this.htmlDoc
      .querySelector("meta[property='og:image']")
      ?.getAttr("content");

    // 当检测到有效图片URL时进行标准化处理
    if (ogImage) return await this.fixImageUrl(ogImage);

    // 如果没有有效图片, 并且存在screenshotApiKey,那么就使用screenshotmachine.com进行截图
    if (this.settings?.screenshotApiKey) {
      return await this.getScreenshotUrl(this.url);
    }
  }

  /**
   * 修正图片URL地址，处理协议相对地址和相对路径问题
   * @param url - 原始图片地址，可能为undefined或包含协议相对地址(//)或相对路径(/path)
   * @returns 修正后的完整可访问图片地址。若输入为undefined返回空字符串，若无法修正返回原始地址
   * @private
   */
  private async fixImageUrl(url: string | undefined): Promise<string> {
    if (url === undefined) return "";
    const { hostname } = new URL(this.url);
    let image = url;

    /* 处理协议相对地址（以//开头的情况） */
    if (url && url.startsWith("//")) {
      const testUrlHttps = `https:${url}`;
      const testUrlHttp = `http:${url}`;
      if (await checkUrlAccessibility(testUrlHttps)) {
        image = testUrlHttps;
      } else if (await checkUrlAccessibility(testUrlHttp)) {
        image = testUrlHttp;
      }
    }
    /* 处理相对路径地址（以/开头的情况） */
    else if (url && url.startsWith("/") && hostname) {
      const testUrlHttps = `https://${hostname}${url}`;
      const testUrlHttp = `http://${hostname}${url}`;
      const resUrlHttps = await checkUrlAccessibility(testUrlHttps);
      const resUrlHttp = await checkUrlAccessibility(testUrlHttp);

      if (resUrlHttps) {
        image = testUrlHttps;
      } else if (resUrlHttp) {
        image = testUrlHttp;
      }
    }

    /** 
     * 通过Image对象检测图片URL实际可访问性
     * @param url - 需要检测的图片地址
     * @returns Promise解析为true表示图片可加载，false表示加载失败
     */
    async function checkUrlAccessibility(url: string): Promise<boolean> {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    }

    return image;
  }

  /**
   * 获取网页截图
   */
  private async getScreenshotUrl(url: string): Promise<string> {
    let screenshotExtraParam = this.settings?.screenshotExtraParam;
    let apiUrl = `https://api.screenshotmachine.com?key=${this.settings!.screenshotApiKey}&url=${url}`
    if(screenshotExtraParam && screenshotExtraParam.length > 0) apiUrl += this.settings?.screenshotExtraParam;

    console.log(`url: ${apiUrl}\nfile: ${this.title}`)

    let fileName = `${this.title}.png`

    return await this.saveImageToAttachment(apiUrl, fileName);
  }
}
