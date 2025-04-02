/**
 * 链接元数据相关类型定义
 */

/**
 * 链接元数据接口，用于存储网页链接的元信息
 */
export interface LinkMetadata {
  /**
   * 网页的URL地址
   */
  url: string;
  /**
   * 网页的标题
   */
  title: string;
  /**
   * 网页的描述（可选）
   */
  description?: string;
  /**
   * 域名信息（可选，示例："example.com"）
   */
  host?: string;
  /**
   * 网站名称（可选）
   */
  siteName?: string;
  /**
   * 网站图标的URL地址（可选）
   */
  favicon?: string;
  /**
   * 网页预览图的URL地址（可选）
   */
  image?: string;
  /**
   * 本地保存的图片路径（可选）
   */
  localImage?: string;
  /**
   * 缩进层级，用于控制显示时的缩进级别（从0开始）
   */
  indent: number;
}

/**
 * 图片附件保存回调函数类型
 * @param url 图片URL
 * @param fileName 文件名
 * @returns 保存后的本地路径
 */
export type ImageAttachmentSaverCallback = (url: string, fileName: string) => Promise<string>;