import { urlRegex, linkRegex, imageRegex } from "src/regex";

/**
 * URL 类型检查工具类
 */
export class CheckIf {
  /**
   * 检查字符串是否为有效URL
   * @param text - 待检查的字符串
   * @returns 是否匹配URL格式
   */
  public static isUrl(text: string): boolean {
    const regex = new RegExp(urlRegex);
    return regex.test(text);
  }

  /**
   * 检查字符串是否为图片URL
   * @param text - 待检查的字符串
   * @returns 是否匹配图片格式
   */
  public static isImage(text: string): boolean {
    const regex = new RegExp(imageRegex);
    return regex.test(text);
  }

  /**
   * 检查字符串是否为Markdown链接格式
   * @param text - 待检查的字符串
   * @returns 是否匹配Markdown链接语法
   */
  public static isLinkedUrl(text: string): boolean {
    const regex = new RegExp(linkRegex);
    return regex.test(text);
  }
}
