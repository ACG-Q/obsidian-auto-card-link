/**
 * 存储服务
 * 
 * 负责管理插件数据的持久化，提供通用的数据存储接口
 */

import { TFile, TFolder, Vault } from "obsidian";
import { ObsidianAutoCardLinkSettings } from "src/types";

/**
 * 存储服务配置接口
 */
export interface StorageServiceOptions {
  /**
   * 存储基础路径
   */
  basePath?: string;
  
  /**
   * 是否自动创建不存在的目录
   */
  createMissingFolders?: boolean;
  
  /**
   * 文件扩展名（默认为json）
   */
  fileExtension?: string;
}

/**
 * 默认存储服务配置
 */
const DEFAULT_STORAGE_OPTIONS: Required<StorageServiceOptions> = {
  basePath: "",
  createMissingFolders: true,
  fileExtension: "json"
};

/**
 * 存储错误类
 */
export class StorageError extends Error {
  /**
   * 创建存储错误实例
   * 
   * @param message 错误信息
   * @param path 相关路径
   */
  constructor(message: string, public readonly path?: string) {
    super(`存储错误${path ? ` (${path})` : ""}: ${message}`);
    this.name = 'StorageError';
  }
}

/**
 * 存储服务类
 * 
 * 提供数据的保存、加载、删除和列表功能
 */
export class StorageService {
  private vault: Vault;
  private options: Required<StorageServiceOptions>;
  private settings?: ObsidianAutoCardLinkSettings;
  
  /**
   * 创建存储服务实例
   * 
   * @param vault Obsidian的Vault实例
   * @param settings 插件设置
   * @param options 服务配置
   */
  constructor(
    vault: Vault,
    settings?: ObsidianAutoCardLinkSettings,
    options: StorageServiceOptions = {}
  ) {
    this.vault = vault;
    this.settings = settings;
    this.options = { ...DEFAULT_STORAGE_OPTIONS, ...options };
  }
  
  /**
   * 保存数据到指定路径
   * 
   * @param path 存储路径（相对于basePath）
   * @param data 要保存的数据
   * @throws {StorageError} 当保存失败时抛出
   */
  public async saveData<T>(path: string, data: T): Promise<void> {
    try {
      const fullPath = this.getFullPath(path);
      const folderPath = this.getFolderPath(fullPath);
      
      // 确保目录存在
      if (this.options.createMissingFolders) {
        await this.ensureFolderExists(folderPath);
      }
      
      // 序列化数据
      const serializedData = JSON.stringify(data, null, 2);
      
      // 检查文件是否存在
      const fileExists = await this.fileExists(fullPath);
      
      if (fileExists) {
        // 更新现有文件
        const file = this.vault.getAbstractFileByPath(fullPath) as TFile;
        await this.vault.modify(file, serializedData);
      } else {
        // 创建新文件
        await this.vault.create(fullPath, serializedData);
      }
    } catch (error:any) {
      console.error("Failed to save data:", error);
      throw new StorageError(
        error.message || "Failed to save data",
        path
      );
    }
  }
  
  /**
   * 从指定路径加载数据
   * 
   * @param path 存储路径（相对于basePath）
   * @returns 加载的数据
   * @throws {StorageError} 当加载失败或文件不存在时抛出
   */
  public async loadData<T>(path: string): Promise<T> {
    try {
      const fullPath = this.getFullPath(path);
      
      // 检查文件是否存在
      if (!await this.fileExists(fullPath)) {
        throw new StorageError("File does not exist", path);
      }
      
      // 读取文件内容
      const file = this.vault.getAbstractFileByPath(fullPath) as TFile;
      const content = await this.vault.read(file);
      
      // 解析JSON数据
      return JSON.parse(content) as T;
    } catch (error:any) {
      console.error("Failed to load data:", error);
      
      // 如果是解析错误，提供更具体的错误信息
      if (error instanceof SyntaxError) {
        throw new StorageError(
          `Invalid JSON format: ${error.message}`,
          path
        );
      }
      
      // 重新抛出StorageError或包装其他错误
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(
        error.message || "Failed to load data",
        path
      );
    }
  }
  
  /**
   * 删除指定路径的数据
   * 
   * @param path 存储路径（相对于basePath）
   * @throws {StorageError} 当删除失败或文件不存在时抛出
   */
  public async deleteData(path: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(path);
      
      // 检查文件是否存在
      if (!await this.fileExists(fullPath)) {
        throw new StorageError("File does not exist", path);
      }
      
      // 删除文件
      const file = this.vault.getAbstractFileByPath(fullPath) as TFile;
      await this.vault.delete(file);
    } catch (error:any) {
      console.error("Failed to delete data:", error);
      
      // 重新抛出StorageError或包装其他错误
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(
        error.message || "Failed to delete data",
        path
      );
    }
  }
  
  /**
   * 列出指定目录下的所有数据文件
   * 
   * @param dirPath 目录路径（相对于basePath）
   * @returns 文件路径列表（相对于basePath）
   * @throws {StorageError} 当列表操作失败时抛出
   */
  public async listData(dirPath: string = ""): Promise<string[]> {
    try {
      const fullPath = this.getFullPath(dirPath);
      
      // 检查目录是否存在
      if (!await this.folderExists(fullPath)) {
        // 如果目录不存在，返回空数组
        return [];
      }
      
      // 获取目录
      const folder = this.vault.getAbstractFileByPath(fullPath) as TFolder;
      
      // 过滤出所有文件并返回相对路径
      const files = folder.children
        .filter(file => file instanceof TFile)
        .filter(file => {
          const fileName = file.name;
          return fileName.endsWith(`.${this.options.fileExtension}`);
        })
        .map(file => {
          // 计算相对于basePath的路径
          let relativePath = file.path;
          if (this.options.basePath && relativePath.startsWith(this.options.basePath)) {
            relativePath = relativePath.slice(this.options.basePath.length);
            // 移除开头的斜杠（如果有）
            if (relativePath.startsWith("/")) {
              relativePath = relativePath.slice(1);
            }
          }
          return relativePath;
        });
      
      return files;
    } catch (error:any) {
      console.error("Failed to list data:", error);
      throw new StorageError(
        error.message || "Failed to list data",
        dirPath
      );
    }
  }
  
  /**
   * 检查数据是否存在
   * 
   * @param path 存储路径（相对于basePath）
   * @returns 数据是否存在
   */
  public async exists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    return this.fileExists(fullPath);
  }
  
  /**
   * 更新服务配置
   * 
   * @param options 新的服务配置
   */
  public updateOptions(options: Partial<StorageServiceOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * 更新插件设置
   * 
   * @param settings 新的插件设置
   */
  public updateSettings(settings: ObsidianAutoCardLinkSettings): void {
    this.settings = settings;
  }
  
  /**
   * 获取完整路径
   * 
   * @param path 相对路径
   * @returns 完整路径
   */
  private getFullPath(path: string): string {
    // 确保路径有正确的扩展名
    let fullPath = path;
    if (!fullPath.endsWith(`.${this.options.fileExtension}`)) {
      fullPath = `${fullPath}.${this.options.fileExtension}`;
    }
    
    // 添加基础路径
    if (this.options.basePath) {
      fullPath = `${this.options.basePath}/${fullPath}`;
    }
    
    return fullPath;
  }
  
  /**
   * 获取文件所在的文件夹路径
   * 
   * @param filePath 文件路径
   * @returns 文件夹路径
   */
  private getFolderPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return "";
    }
    return filePath.slice(0, lastSlashIndex);
  }
  
  /**
   * 确保文件夹存在
   * 
   * @param folderPath 文件夹路径
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath || folderPath === "/") {
      return;
    }
    
    // 检查文件夹是否存在
    if (await this.folderExists(folderPath)) {
      return;
    }
    
    // 创建文件夹（包括所有父文件夹）
    try {
      await this.vault.createFolder(folderPath);
    } catch (error:any) {
      // 如果错误是因为文件夹已存在，忽略错误
      if (error.message && error.message.includes("already exists")) {
        return;
      }
      throw error;
    }
  }
  
  /**
   * 检查文件是否存在
   * 
   * @param path 文件路径
   * @returns 文件是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    const file = this.vault.getAbstractFileByPath(path);
    return file instanceof TFile;
  }
  
  /**
   * 检查文件夹是否存在
   * 
   * @param path 文件夹路径
   * @returns 文件夹是否存在
   */
  private async folderExists(path: string): Promise<boolean> {
    if (!path) {
      // 空路径表示根目录，总是存在的
      return true;
    }
    const folder = this.vault.getAbstractFileByPath(path);
    return folder instanceof TFolder;
  }
}