/**
 * 默认设置文件
 * 
 * 此文件包含插件的默认设置
 */

import { ObsidianAutoCardLinkSettings } from "src/types/settings";
import { DEFAULT_SCREENSHOT_PARAMS } from "./constants";

/**
 * 插件默认设置
 */
export const DEFAULT_SETTINGS: ObsidianAutoCardLinkSettings = {
  showInMenuItem: true,
  enhanceDefaultPaste: false,
  screenshotApiKey: "",
  screenshotExtraParam: DEFAULT_SCREENSHOT_PARAMS,
  preferLocalImages: true,
  downloadImages: true,
  showSuccessNotice: true,
  indentLevel: 0,
};