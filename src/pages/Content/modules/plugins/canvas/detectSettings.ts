import runSettings from '../../components/dynamic-settings';
import { getOptions } from '../../hooks/useOptions';

export const isInstallSettings = !!document.getElementById('tfc-settings');

export async function InstallSettingsEntryPoint(): Promise<void> {
  const root = document.getElementById('tfc-settings') as ParentNode;
  const settingsRoot = document.createElement('div');
  root.replaceChildren(settingsRoot);
  runSettings(settingsRoot, await getOptions());
}
