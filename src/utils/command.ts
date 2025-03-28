import { App, Editor, MarkdownView, TFile } from "obsidian";

/**
 * 获取当前活动Markdown视图的编辑器实例
 * 
 * @param app - Obsidian应用实例，用于访问工作空间接口
 * @returns 如果存在活动中的Markdown视图，返回对应的编辑器实例；否则返回undefined
 */
const getEditor = (app: App): Editor | undefined => {
    // 获取当前处于激活状态的Markdown视图
    const view = getActiveView(app)
    
    if (!view) return;
    
    return view.editor;
};

/**
 * 获取当前处于激活状态的Markdown文件
 * @param app - Obsidian应用程序实例，提供工作区访问能力
 * @returns 当前激活的TFile对象，若无可激活文件则返回undefined
 */
const getActiveFile = (app: App): TFile | undefined => {
    // 获取当前处于激活状态的Markdown视图
    const file = app.workspace.getActiveFile();

    // 当不存在激活文件时提前返回undefined
    if (!file) return;
    
    return file;
}



const getActiveView = (app:App): MarkdownView | null => {
    return app.workspace.getActiveViewOfType(MarkdownView);
}


export { getEditor, getActiveFile, getActiveView };