import { initClient, initClientNavigation } from 'rwsdk/client';

const { handleResponse, onHydrated } = initClientNavigation({
  shouldIntercept: ({ fromUrl, toUrl }) => !isWorkspacePath(fromUrl.pathname) && !isWorkspacePath(toUrl.pathname)
});
void initClient({ handleResponse, onHydrated });

function isWorkspacePath(pathname: string): boolean {
  return pathname === '/guest' || pathname.startsWith('/guest/') || pathname === '/workspace' || pathname.startsWith('/workspace/');
}
