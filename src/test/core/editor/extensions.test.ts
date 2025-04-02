/**
 * EditorExtensions单元测试
 */

import { EditorExtensions, WordBoundaries } from '../../../core/editor/extensions';
import { Editor, EditorPosition } from 'obsidian';

// 模拟Obsidian编辑器
class MockEditor implements Partial<Editor> {
  private text: string;
  private selection: { from: EditorPosition; to: EditorPosition } | null = null;
  private cursor: EditorPosition = { line: 0, ch: 0 };
  private lines: string[] = [];

  constructor(text: string = '') {
    this.text = text;
    this.lines = text.split('\n');
  }

  getCursor(): EditorPosition {
    return this.cursor;
  }

  setCursor(pos: EditorPosition): void {
    this.cursor = pos;
  }

  getLine(n: number): string {
    return this.lines[n] || '';
  }

  somethingSelected(): boolean {
    return this.selection !== null;
  }

  getSelection(): string {
    if (!this.selection) return '';
    
    const { from, to } = this.selection;
    if (from.line === to.line) {
      return this.lines[from.line].substring(from.ch, to.ch);
    }
    
    // 多行选择
    let result = this.lines[from.line].substring(from.ch) + '\n';
    for (let i = from.line + 1; i < to.line; i++) {
      result += this.lines[i] + '\n';
    }
    result += this.lines[to.line].substring(0, to.ch);
    return result;
  }

  setSelection(from: EditorPosition, to: EditorPosition): void {
    this.selection = { from, to };
  }
}

describe('EditorExtensions', () => {
  describe('getSelectedText', () => {
    it('should return selected text when something is selected', () => {
      // 创建模拟编辑器
      const editor = new MockEditor('This is a test text') as unknown as Editor;
      
      // 设置选择范围
      editor.setSelection({ line: 0, ch: 5 }, { line: 0, ch: 9 });
      
      // 执行测试
      const result = EditorExtensions.getSelectedText(editor);
      
      // 验证结果
      expect(result).toBe('is a');
    });
    
    it('should select word at cursor when nothing is selected', () => {
      // 创建模拟编辑器
      const editor = new MockEditor('This is a test text') as unknown as Editor;
      
      // 设置光标位置在单词中间
      (editor as any).setCursor({ line: 0, ch: 6 });
      
      // 模拟getWordBoundaries方法
      const mockBoundaries: WordBoundaries = {
        start: { line: 0, ch: 5 },
        end: { line: 0, ch: 7 }
      };
      
      // 替换getWordBoundaries方法
      const originalMethod = EditorExtensions.getWordBoundaries;
      EditorExtensions.getWordBoundaries = jest.fn().mockReturnValue(mockBoundaries);
      
      // 监视setSelection方法
      jest.spyOn(editor, 'setSelection');
      
      // 执行测试
      EditorExtensions.getSelectedText(editor);
      
      // 验证结果
      expect(EditorExtensions.getWordBoundaries).toHaveBeenCalledWith(editor);
      expect(editor.setSelection).toHaveBeenCalledWith(
mockBoundaries.start,
mockBoundaries.end
);
      
      // 恢复原始方法
      EditorExtensions.getWordBoundaries = originalMethod;
    });
  });
  
  describe('getWordBoundaries', () => {
    it('should detect Markdown link boundaries', () => {
      // 创建包含Markdown链接的模拟编辑器
      const editor = new MockEditor('Check this [link](https://example.com) out') as unknown as Editor;
      
      // 设置光标位置在链接中间
      (editor as any).setCursor({ line: 0, ch: 15 });
      
      // 执行测试
      const result = EditorExtensions.getWordBoundaries(editor);
      
      // 验证结果 - 应该选中整个Markdown链接
      expect(result).toEqual({
        start: { line: 0, ch: 11 },
        end: { line: 0, ch: 38 }
      });
    });
    
    it('should detect URL boundaries', () => {
      // 创建包含URL的模拟编辑器
      const editor = new MockEditor('Check this https://example.com out') as unknown as Editor;
      
      // 设置光标位置在URL中间
      (editor as any).setCursor({ line: 0, ch: 20 });
      
      // 执行测试
      const result = EditorExtensions.getWordBoundaries(editor);
      
      // 验证结果 - 应该选中整个URL
      expect(result).toEqual({
        start: { line: 0, ch: 11 },
        end: { line: 0, ch: 30 }
      });
    });
    
    it('should return cursor position when no link or URL is found', () => {
      // 创建不包含链接的模拟编辑器
      const editor = new MockEditor('Just plain text') as unknown as Editor;
      
      // 设置光标位置
      const cursorPos = { line: 0, ch: 5 };
      (editor as any).setCursor(cursorPos);
      
      // 执行测试
      const result = EditorExtensions.getWordBoundaries(editor);
      
      // 验证结果 - 应该返回光标位置
      expect(result).toEqual({
        start: cursorPos,
        end: cursorPos
      });
    });
  });
  
  describe('getEditorPositionFromIndex', () => {
    it('should convert character index to editor position', () => {
      // 准备测试数据
      const content = 'First line\nSecond line\nThird line';
      
      // 测试第一行中间位置
      expect(EditorExtensions.getEditorPositionFromIndex(content, 5)).toEqual({
        line: 0,
        ch: 5
      });
      
      // 测试第二行开始位置
      expect(EditorExtensions.getEditorPositionFromIndex(content, 11)).toEqual({
        line: 1,
        ch: 0
      });
      
      // 测试第三行中间位置
      expect(EditorExtensions.getEditorPositionFromIndex(content, 25)).toEqual({
        line: 2,
        ch: 2
      });
    });
    
    it('should handle empty content', () => {
      expect(EditorExtensions.getEditorPositionFromIndex('', 0)).toEqual({
        line: 0,
        ch: 0
      });
    });
    
    it('should handle out of bounds index', () => {
      const content = 'Short text';
      
      // 索引超出内容长度
      expect(EditorExtensions.getEditorPositionFromIndex(content, 100)).toEqual({
        line: 0,
        ch: 10 // 内容长度
      });
    });
  });
});