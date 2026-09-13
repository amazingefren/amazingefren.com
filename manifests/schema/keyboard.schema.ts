export interface KeyboardProfile {
  preset: 'vim';
  status: 'implemented';
  modes: readonly ('normal' | 'insert' | 'visual')[];
  remappable: true;
  disableSingleCharacterShortcuts: true;
  preserveBrowserShortcuts: true;
  ignoreEditableTargetsOutsideEditor: true;
  directory: string;
  testsDirectory: string;
  implementation: string;
  tests: readonly string[];
  bindings: readonly {
    mode: 'normal' | 'insert' | 'visual';
    keys: string;
    action: string;
  }[];
}
