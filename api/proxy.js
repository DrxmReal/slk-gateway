import { proxyRequest } from './_utils.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  let path = url.searchParams.get('path');
  if (!path) {
    path = url.pathname
      .replace(/^\/api\/proxy\/?/, '')
      .replace(/^\/api\/v1\/?/, '')
      .replace(/^\/v1\/?/, '');
  }
  return proxyRequest(request, path || '');
}
