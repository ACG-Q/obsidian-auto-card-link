/**
 * 错误类型定义
 * 
 * 这个文件定义了插件中使用的所有错误类型，用于统一错误处理机制，提供更友好的用户反馈。
 */

/**
 * YAML解析错误
 * 当解析YAML格式的代码块内容失败时抛出
 */
export class YamlParseError extends Error {
  constructor(message: string) {
    super(`YAML解析错误: ${message}`);
    this.name = 'YamlParseError';
  }
}

/**
 * 缺少必要参数错误
 * 当代码块中缺少必要的参数（如url、title）时抛出
 */
export class NoRequiredParamsError extends Error {
  constructor(message: string) {
    super(`缺少必要参数: ${message}`);
    this.name = 'NoRequiredParamsError';
  }
}

/**
 * 网络错误
 * 当获取网页内容失败时抛出
 */
export class NetworkError extends Error {
  /**
   * 创建网络错误实例
   * @param message 错误信息
   * @param url 请求的URL
   */
  constructor(message: string, public readonly url: string) {
    super(`获取内容失败 ${url}: ${message}`);
    this.name = 'NetworkError';
  }
}

/**
 * 解析错误
 * 当解析网页内容失败时抛出
 */
export class ParseError extends Error {
  /**
   * 创建解析错误实例
   * @param message 错误信息
   * @param source 解析的内容来源
   */
  constructor(message: string, public readonly source: string) {
    super(`解析内容失败: ${message}`);
    this.name = 'ParseError';
  }
}

/**
 * 超时错误
 * 当请求超时时抛出
 */
export class TimeoutError extends Error {
  /**
   * 创建超时错误实例
   * @param url 请求的URL
   * @param timeout 超时时间（毫秒）
   */
  constructor(public readonly url: string, public readonly timeout: number) {
    super(`请求超时 ${url} (${timeout}ms)`);
    this.name = 'TimeoutError';
  }
}

/**
 * 缓存错误
 * 当缓存操作失败时抛出
 */
export class CacheError extends Error {
  constructor(message: string) {
    super(`缓存错误: ${message}`);
    this.name = 'CacheError';
  }
}