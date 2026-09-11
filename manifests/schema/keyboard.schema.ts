export interface KeyboardProfile {
  preset: 'vim';
  status: 'declared' | 'implemented';
  scope: 'required';
  modes: readonly ('normal' | 'insert' | 'visual')[];
  remappable: true;
  disableSingleCharacterShortcuts: true;
  preserveBrowserShortcuts: true;
  ignoreEditableTargetsOutsideEditor: true;
  directory: string;
  testsDirectory: string;
  implementation: string | null;
  tests: readonly string[];
  bindings: readonly {
    mode: 'normal' | 'insert' | 'visual';
    keys: string;
    action: string;
  }[];
}
