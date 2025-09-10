// api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5008';

async function request(method, path, body = null, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const hasBody = body !== null && body !== undefined;

  const res = await fetch(url, {
    method,
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  try {
    data = contentType.includes('application/json') ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data && (data.message || data.error) ? (data.message || data.error) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const apiGet  = (path, options = {}) => request('GET',  path, null, options);
export const apiPost = (path, body, options = {}) => request('POST', path, body, options);
export { API_URL };
