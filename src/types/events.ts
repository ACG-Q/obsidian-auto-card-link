/**
 * 事件相关类型定义
 */

/**
 * 元数据加载事件类型
 */
export enum MetadataLoadEventType {
  /**
   * 开始加载
   */
  START = 'start',
  
  /**
   * 加载成功
   */
  SUCCESS = 'success',
  
  /**
   * 加载失败
   */
  ERROR = 'error',
  
  /**
   * 加载取消
   */
  CANCEL = 'cancel'
}

/**
 * 元数据加载事件接口
 */
export interface MetadataLoadEvent {
  /**
   * 事件类型
   */
  type: MetadataLoadEventType;
  
  /**
   * URL地址
   */
  url: string;
  
  /**
   * 元数据（成功时有值）
   */
  metadata?: any;
  
  /**
   * 错误信息（失败时有值）
   */
  error?: Error;
}