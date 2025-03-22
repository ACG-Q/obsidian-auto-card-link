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
   * 网站图标的URL地址（可选）
   */
  favicon?: string;
  /**
   * 网页预览图的URL地址（可选）
   */
  image?: string;
  /**
   * 缩进层级，用于控制显示时的缩进级别（从0开始）
   */
  indent: number;
}