import axios from 'axios';

// The token lives here and nowhere else: this module reads it, writes it and attaches it.
const TOKEN_KEY = 'grievance_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers what to do when the server says the session is no longer valid.
let onSessionExpired = () => {};
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 on a request that carried a token means the token expired or was revoked.
    // A 401 from the login form itself is just a wrong password and is left to the form.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      setToken(null);
      onSessionExpired();
    }
    return Promise.reject(error);
  }
);

/** The backend's error message, or a fallback when the server could not be reached. */
export function errorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response) return `Request failed (${error.response.status})`;
  return 'Could not reach the server. It may be starting up; please try again in a moment.';
}

export default client;
