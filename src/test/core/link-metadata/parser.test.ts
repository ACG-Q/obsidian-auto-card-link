/**
 * MetadataParser单元测试
 */

import { MetadataParser } from '../../../core/link-metadata/parser';
import { ParseError } from '../../../types/errors';

describe('MetadataParser', () => {
  let parser: MetadataParser;
  
  beforeEach(() => {
    // 创建测试实例
    parser = new MetadataParser();
  });
  
  describe('parse', () => {
    it('should parse Open Graph metadata correctly', async () => {
      // 准备测试数据
      const testUrl = 'https://example.com';
      const htmlContent = `<html>
              <head>
                <meta property="og:title" content="Test Title" />
                <meta property="og:description" content="Test Description" />
                <meta property="og:image" content="https://example.com/image.jpg" />
                <meta property="og:url" content="https://example.com" />
                <meta property="og:site_name" content="Example Site" />
              </head>
              <body>Test Content</body>
            </html>`;
      
      // 执行测试
      const result = await parser.parse(testUrl, htmlContent);
      
      // 验证结果
      expect(result).toEqual({
        "title": "Test Title",
        "description": "Test Description",
        "image": "https://example.com/image.jpg",
        "siteName": "Example Site",
        "url": "https://example.com",
        "favicon": "https://example.com/favicon.ico"
      });
    });
    
    it('should parse standard HTML metadata when Open Graph is not available', async () => {
      // 准备测试数据
      const testUrl = 'https://example.com';
      const htmlContent = `<html>
              <head>
                <title>Standard Title</title>
                <meta name="description" content="Standard Description" />
                <link rel="icon" href="/custom-favicon.png" />
              </head>
              <body>Test Content</body>
            </html>`;
      
      // 执行测试
      const result = await parser.parse(testUrl, htmlContent);
      
      // 验证结果
      expect(result).toEqual({
        title: 'Standard Title',
        description: 'Standard Description',
        url: 'https://example.com',
        favicon: 'https://example.com/custom-favicon.png'
      });
    });
    
    it('should handle relative URLs correctly', async () => {
      // 准备测试数据 - 包含相对URL的HTML
      const html = `
        <html>
          <head>
            <meta property="og:image" content="/images/test.jpg" />
            <link rel="icon" href="/favicon.ico" />
          </head>
          <body>Test Content</body>
        </html>
      `;
      
      // 执行测试
      const result = await parser.parse('https://example.com/page', html);
      
      // 验证结果
      expect(result.image).toBe('https://example.com/images/test.jpg');
      expect(result.favicon).toBe('https://example.com/favicon.ico');
    });
    
    it('should extract fallback title from h1 when no title tag exists', async () => {
      // 准备测试数据 - 没有标题标签但有h1
      const html = `
        <html>
          <head></head>
          <body>
            <h1>Fallback Title from H1</h1>
            <p>Some content</p>
          </body>
        </html>
      `;
      
      // 执行测试
      const result = await parser.parse('https://example.com', html);
      
      // 验证结果
      expect(result.title).toBe('Fallback Title from H1');
    });
    
    it('should throw ParseError when HTML is invalid', async () => {
      // 准备测试数据 - 无效HTML
      const invalidHtml = '<not valid html';
      
      // 执行测试并验证结果
      await expect(parser.parse('https://example.com', invalidHtml))
        .rejects
        .toThrow(ParseError);
    });
    
    it('should return minimal metadata when nothing can be extracted', async () => {
      // 准备测试数据 - 最小HTML
      const minimalHtml = '<html><head></head><body></body></html>';
      
      // 执行测试
      const result = await parser.parse('https://example.com', minimalHtml);
      
      // 验证结果 - 至少应该有URL
      expect(result).toEqual({
        url: 'https://example.com',
        title: 'https://example.com',
        favicon: 'https://example.com/favicon.ico'
      });
    });
  });
});