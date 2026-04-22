import {
  CanvasLMSEntrypoint,
  CanvasLMSConfig,
  InstallSettingsEntrypoint,
  isInstallSettings,
} from './modules/plugins/canvas';

/*
  Canvas-only content script entry point.
  This script is injected dynamically via chrome.scripting.registerContentScripts().
*/
if (CanvasLMSConfig.isActive) {
  console.log('Tasks for Canvas Redux: Canvas detected');
  CanvasLMSEntrypoint();
  if (isInstallSettings) {
    InstallSettingsEntrypoint();
  }
}
