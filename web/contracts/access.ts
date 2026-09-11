export interface LaunchAccess {
  ownerPrefixes: readonly string[];
  signInPath: '/auth/me';
  frameworkActions: 'denied';
  tests: readonly string[];
}
