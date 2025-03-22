import { Editor, EditorPosition } from "obsidian";

import { linkLineRegex, lineRegex } from "src/regex";

/**
 * 表示文本边界的位置信息
 */
interface WordBoundaries {
  start: { line: number; ch: number };
  end: { line: number; ch: number };
}

export class EditorExtensions {
  /**
   * 获取编辑器当前选中的文本内容，当没有选中内容时自动选中光标所在单词
   * @param editor - 编辑器实例，用于操作选区内容和获取选区信息
   * @returns 当前选中的文本内容字符串
   */
  public static getSelectedText(editor: Editor): string {
    // 当没有选中内容时，获取当前单词的边界并设置选区
    if (!editor.somethingSelected()) {
      const wordBoundaries = this.getWordBoundaries(editor);
      editor.setSelection(wordBoundaries.start, wordBoundaries.end);
    }
    return editor.getSelection();
  }

  /**
   * 检查光标是否在正则匹配范围内
   * @param cursor - 光标当前位置
   * @param match - 正则匹配结果
   * @returns 是否在匹配范围内
   */
  private static isCursorWithinBoundaries(
    cursor: EditorPosition,
    match: RegExpMatchArray
  ): boolean {
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + match[0].length;
    return startIndex <= cursor.ch && cursor.ch <= endIndex;
  }

  /**
   * 获取当前光标所在位置的单词边界（支持识别Markdown链接和普通URL）
   * 
   * @param editor - 编辑器实例，用于获取光标位置和行内容
   * @returns 包含单词起始和结束位置的边界对象。当未找到有效边界时返回光标当前位置
   */
  private static getWordBoundaries(editor: Editor): WordBoundaries {
    const cursor = editor.getCursor();

    // 如果当前行包含Markdown链接格式（如[...](...)）
    const lineText = editor.getLine(cursor.line);
    // 优先检测Markdown链接语法
    const linksInLine = lineText.matchAll(linkLineRegex);

    // 遍历所有匹配的Markdown链接，检测光标是否在链接范围内
    for (const match of linksInLine) {
      if (this.isCursorWithinBoundaries(cursor, match)) {
        const startCh = match.index ?? 0;
        return {
          start: { line: cursor.line, ch: startCh },
          end: { line: cursor.line, ch: startCh + match[0].length },
        };
      }
    }

    // 如果没有匹配到Markdown链接，检测普通URL模式
    const urlsInLine = lineText.matchAll(lineRegex);

    // 遍历所有普通URL匹配项，检测光标是否在URL范围内
    for (const match of urlsInLine) {
      if (this.isCursorWithinBoundaries(cursor, match)) {
        const startCh = match.index ?? 0;
        return {
          start: { line: cursor.line, ch: startCh },
          end: { line: cursor.line, ch: startCh + match[0].length },
        };
      }
    }

    // 未找到任何有效边界时返回光标当前位置
    return {
      start: cursor,
      end: cursor,
    };
  }

  /**
   * 根据字符索引计算在文本编辑器中的行列位置
   * @param content - 原始文本内容字符串
   * @param index - 目标位置的字符索引（从0开始）
   * @returns 编辑器行列位置对象，包含 line（行号）和 ch（列号）属性
   */
  public static getEditorPositionFromIndex(
    content: string,
    index: number
  ): EditorPosition {
    // 获取索引位置前的子字符串用于换行符统计
    const substr = content.substr(0, index);

    // 通过遍历换行符计算行号
    let l = 0;
    let offset = -1; // 最后一个换行符的偏移量
    let r = -1;      // 当前换行符位置
    for (; (r = substr.indexOf("\n", r + 1)) !== -1; l++, offset = r);

    // 计算列号起始基准点（最后一个换行符的下一个位置）
    offset += 1;

    // 计算当前行内的字符偏移量
    const ch = content.substr(offset, index - offset).length;

    return { line: l, ch: ch };
  }
}
