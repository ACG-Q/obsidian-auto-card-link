/**
 * 正则表达式工具模块
 * 集中管理应用中使用的所有正则表达式，提高代码可维护性
 */

// 验证完整URL格式的正则表达式
export const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/i;

// 在文本中匹配所有URL的正则表达式（全局匹配）
export const lineRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

// 验证Markdown链接格式的正则表达式（[文本](url)）
export const linkRegex = /^\[([^[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)$/i;

// 在文本中匹配所有Markdown链接的正则表达式（全局匹配）
export const linkLineRegex = /\[([^[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)/gi;

// 匹配图片文件扩展名的正则表达式
export const imageRegex = /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i;

/**
 * URL相关正则表达式工具函数
 */

/**
 * 检查文本是否为有效的URL
 * @param text 要检查的文本
 * @returns 是否为有效URL
 */
export function isValidUrl(text: string): boolean {
  return urlRegex.test(text);
}

/**
 * 检查文本是否为有效的Markdown链接
 * @param text 要检查的文本
 * @returns 是否为有效Markdown链接
 */
export function isValidMarkdownLink(text: string): boolean {
  return linkRegex.test(text);
}

/**
 * 从文本中提取所有URL
 * @param text 要分析的文本
 * @returns URL数组
 */
export function extractUrls(text: string): string[] {
  return text.match(lineRegex) || [];
}

/**
 * 从文本中提取所有Markdown链接
 * @param text 要分析的文本
 * @returns Markdown链接数组
 */
export function extractMarkdownLinks(text: string): string[] {
  return text.match(linkLineRegex) || [];
}

/**
 * 检查URL是否指向图片
 * @param url 要检查的URL
 * @returns 是否为图片URL
 */
export function isImageUrl(url: string): boolean {
  return imageRegex.test(url);
}