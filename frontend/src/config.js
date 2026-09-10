// src/config.js
export const BACKEND_URL = 'http://192.168.0.114:8000'; /*Update your server with IPV4 address*/

export const API_URL = `${BACKEND_URL}/analyze`;
export const EVIDENCE_URL = `${BACKEND_URL}/evidence`;
export const STATUS_URL = `${BACKEND_URL}/status`;
export const CLEANUP_URL = `${BACKEND_URL}/cleanup/trimmed`;
export const FEEDBACK_URL = `${BACKEND_URL}/store-feedback`;