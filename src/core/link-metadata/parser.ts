/**
 * 链接元数据解析器
 * 
 * 负责从HTML内容中提取元数据，支持多种解析策略
 */

import { LinkMetadata } from "src/types/metadata";
import { ParseError } from "src/types/errors";

/**
 * 元数据解析策略接口
 */
export interface MetadataParseStrategy {
    /**
     * 解析HTML内容提取元数据
     * 
     * @param url 原始URL
     * @param htmlContent HTML内容
     * @returns 解析出的元数据
     */
    parse(url: string, htmlContent: string): Partial<LinkMetadata>;
}

/**
 * Open Graph协议解析策略
 */
export class OpenGraphStrategy implements MetadataParseStrategy {
    parse(url: string, htmlContent: string): Partial<LinkMetadata> {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(htmlContent, "text/html");

        // 提取Open Graph标签信息
        const title = htmlDoc.querySelector("meta[property='og:title']")?.getAttribute("content");
        const description = htmlDoc.querySelector("meta[property='og:description']")?.getAttribute("content");
        const image = htmlDoc.querySelector("meta[property='og:image']")?.getAttribute("content");
        const siteName = htmlDoc.querySelector("meta[property='og:site_name']")?.getAttribute("content");

        return {
            title: title ?? undefined,
            description: description ?? undefined,
            image: image ?? undefined,
            siteName: siteName ?? undefined
        };
    }
}

/**
 * 标准HTML标签解析策略
 */
export class StandardHTMLStrategy implements MetadataParseStrategy {
    parse(url: string, htmlContent: string): Partial<LinkMetadata> {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(htmlContent, "text/html");

        // 提取标准HTML标签信息
        let title = htmlDoc.querySelector("title")?.textContent;
        
        // 如果没有title标签，尝试从h1标签提取标题作为后备
        if (!title) {
            title = htmlDoc.querySelector("h1")?.textContent?.trim() || undefined;
        }
        
        const description = htmlDoc.querySelector("meta[name='description']")?.getAttribute("content");

        // 提取favicon
        const favicon = this.getFavicon(htmlDoc, url);

        return {
            title: title ?? undefined,
            description: description ?? undefined,
            favicon: favicon
        };
    }

    /**
     * 获取网站图标URL
     */
    private getFavicon(htmlDoc: Document, baseUrl: string): string | undefined {
        // 尝试查找标准favicon链接
        const faviconLink = htmlDoc.querySelector("link[rel='icon'], link[rel='shortcut icon']");
        if (faviconLink) {
            const faviconUrl = faviconLink.getAttribute("href");
            if (faviconUrl) {
                // 处理相对路径
                if (faviconUrl.startsWith('/')) {
                    const { origin } = new URL(baseUrl);
                    return `${origin}${faviconUrl}`;
                }
                return faviconUrl;
            }
        }

        // 回退到默认favicon位置
        const { origin } = new URL(baseUrl);
        return `${origin}/favicon.ico`;
    }
}

/**
 * Twitter Cards解析策略
 */
export class TwitterCardStrategy implements MetadataParseStrategy {
    parse(url: string, htmlContent: string): Partial<LinkMetadata> {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(htmlContent, "text/html");

        // 提取Twitter Cards标签信息
        const title = htmlDoc.querySelector("meta[name='twitter:title']")?.getAttribute("content");
        const description = htmlDoc.querySelector("meta[name='twitter:description']")?.getAttribute("content");
        const image = htmlDoc.querySelector("meta[name='twitter:image']")?.getAttribute("content");

        return {
            title: title ?? undefined,
            description: description ?? undefined,
            image: image ?? undefined,
        };
    }
}

/**
 * 元数据解析器类
 */
export class MetadataParser {
    private strategies: MetadataParseStrategy[] = [];

    /**
     * 创建元数据解析器实例
     */
    constructor() {
        // 注册默认解析策略，按优先级排序
        this.registerStrategy(new OpenGraphStrategy());
        this.registerStrategy(new TwitterCardStrategy());
        this.registerStrategy(new StandardHTMLStrategy());
    }

    /**
     * 注册解析策略
     * 
     * @param strategy 解析策略实例
     */
    public registerStrategy(strategy: MetadataParseStrategy): void {
        this.strategies.push(strategy);
    }

    /**
     * 
     * @returns 所有注册的解析策略
     */
    getStrategies(): MetadataParseStrategy[] {
        return this.strategies; 
    }

    /**
     * 解析HTML内容提取元数据
     * 
     * @param url 原始URL
     * @param htmlContent HTML内容
     * @returns 解析出的元数据
     * @throws {ParseError} 当解析失败时抛出
     */
    public parse(url: string, htmlContent: string): LinkMetadata {
        try {
            // 解析URL获取域名
            const { hostname } = new URL(url);

            // 合并所有策略的解析结果
            const metadata: Partial<LinkMetadata> = {
                url: url,
                host: hostname,
                indent: 0
            };

            // 应用所有解析策略
            for (const strategy of this.strategies) {
                const result = strategy.parse(url, htmlContent);
                Object.assign(metadata, result);
            }

            // 清理和规范化元数据
            this.cleanMetadata(metadata);

            // 验证必要字段，如果没有标题，使用URL作为后备
            if (!metadata.title) {
                metadata.title = url;
            }

            return metadata as LinkMetadata;
        } catch (error) {
            if (error instanceof ParseError) {
                throw error;
            }
            throw new ParseError((error as Error).message, htmlContent);
        }
    }

    /**
     * 清理和规范化元数据
     * 
     * @param metadata 待清理的元数据
     */
    private cleanMetadata(metadata: Partial<LinkMetadata>): void {
        // 清理标题
        if (metadata.title) {
            metadata.title = metadata.title
                .replace(/\r\n|\n|\r/g, "") // 移除换行符
                .replace(/\\/g, "\\\\") // 转义反斜杠
                .replace(/"/g, '\\"') // 转义双引号
                .trim();
        }

        // 清理描述
        if (metadata.description) {
            metadata.description = metadata.description
                .replace(/\r\n|\n|\r/g, "") // 移除换行符
                .replace(/\\/g, "\\\\") // 转义反斜杠
                .replace(/"/g, '\\"') // 转义双引号
                .trim();
        }
    }
}