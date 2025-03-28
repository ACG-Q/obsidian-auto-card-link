import { FileSystemAdapter, Vault, TFile, Notice, requestUrl, MarkdownView } from "obsidian";
import * as path from "path";

// 类型声明增强
declare module "obsidian" {
    interface Vault {
        config: {
            /**
             * 附件文件夹路径
             */
            attachmentFolderPath?: string;
        };
    }
}

/**
 * 解析Obsidian官方附件路径配置规则
 * @param vault Obsidian库实例
 * @param sourceFile 当前Markdown文件（用于处理相对路径）
 * @returns 标准化后的相对路径
 * 
 * @info
 * - attachmentFolderPath ./ 相对当前文件所在文件夹路径         -- 当前文件所在文件夹
 * - attachmentFolderPath [attachments] 相对于笔记本根目录路径 -- 指定附件文件夹
 * - attachmentFolderPath ./[attachments] -- 当前文件所在文件夹下指定的子文件夹
 * - attachmentFolderPath /  根目录 -- 仓库根目录
 */
const getAttachmentFolderPath = (vault: Vault,sourceFile?: TFile): string => {
    const rawPath = vault.config.attachmentFolderPath;

    // 处理根目录情况
    if (!rawPath || rawPath === '/') return '';

    // 处理相对当前文件的路径（以./开头）
    if (rawPath.startsWith('./')) {
        return sourceFile 
            ? path.join(path.dirname(sourceFile.path), rawPath.slice(2))
            : rawPath;
    }
    // 处理绝对路径（以/开头）
    if (rawPath.startsWith('/')) return rawPath.slice(1);

     // 默认情况（相对于库根目录）
    return rawPath;
};

/**
 * 获取完整的物理附件路径
 * @param vault Obsidian库实例
 * @param sourceFile 当前处理的Markdown文件
 * 
 * @example
 * 
 * ```ts
 * const activeFile = app.workspace.getActiveFile();
 * const attachmentPath = getFullAttachmentFolderPath(app.vault, activeFile);
 * ```
 */
export const getFullAttachmentFolderPath = (vault: Vault, sourceFile?: TFile): string => {
    const basePath = getVaultBasePath(vault);
    const relativePath = getAttachmentFolderPath(vault, sourceFile);

    return relativePath ? path.join(basePath, relativePath) : basePath;
};


/**
 * 获取文件保险库的基础路径（仅支持文件系统适配器）
 * 
 * @param vault - 需要获取基础路径的文件保险库对象，必须包含适配器(adapter)属性
 * @returns 返回适配器对应的基础路径字符串
 * @throws {Error} 当适配器不是文件系统适配器时（如在移动端环境），抛出不支持的错误
 */
const getVaultBasePath = (vault: Vault): string => {
    const adapter = vault.adapter;
    
    // 检测是否为文件系统适配器实例，桌面环境才存在物理路径
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }

    // 移动端环境使用其他适配器，无法获取物理路径时抛出异常
    throw new Error("Cannot get base path: Mobile environment not supported");
};


/**
 * 下载网络图片到附件文件夹并返回相对路径
 * @param imageUrl 需要下载的图片URL地址
 * @param targetFilename 目标文件名（需包含扩展名）
 * @param vault Obsidian库实例
 * @param sourceFile 当前Markdown文件（用于路径解析）
 * @param overwrite 是否覆盖已存在文件，默认false
 * @returns 返回图片在库中的相对路径（基于仓库根目录）
 * @throws 当下载失败或文件存在冲突时抛出错误
 */
export const downloadImageToAttachmentFolder = async (
    imageUrl: string,
    targetFilename: string,
    vault: Vault,
    sourceFile: TFile,
    overwrite: boolean = true
): Promise<string> => {
    try {
        // 获取目标附件目录路径
        const attachmentDir = getAttachmentFolderPath(vault, sourceFile);
        
        // 确保目录结构存在
        // 不支持完整路径
        await vault.adapter.mkdir(attachmentDir);

        // 构造完整存储路径
        const destPath = path.join(attachmentDir, targetFilename);

        const normalizedDestPath = path.normalize(destPath);

        // 冲突检测逻辑
        if (await vault.adapter.exists(normalizedDestPath)) {
            if (!overwrite) {
                throw new Error(`目标文件 ${targetFilename} 已存在`);
            }
            await vault.adapter.remove(normalizedDestPath);
        }

        // 执行下载操作
        const response = await requestUrl({ url: imageUrl });
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`下载失败: HTTP ${response.status}`);
        }

        // 写入本地文件系统
        await vault.adapter.writeBinary(normalizedDestPath, response.arrayBuffer);

        // 改为 /
        const _normalizedDestPath = normalizedDestPath.replace(/\\/g, '/')

        // 返回Obsidian引用路径
        return `[[${_normalizedDestPath}]]`
    } catch (error:any) {
        new Notice(`图片下载失败: ${error.message}`);
        throw error;
    }
};


export const createDownloadImageToAttachmentFolder = (view: MarkdownView) => {
    const vault = view.app.vault;
    const file = view.file;

    return (url: string, fileName: string) => downloadImageToAttachmentFolder(url, fileName, vault, file)
}