import { proxyRequest } from '../../_utils.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  return proxyRequest(request, 'chat/completions');
}
