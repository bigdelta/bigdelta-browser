const KEEPALIVE_MAX_BYTES = 64 * 1024;

export const fitsKeepalive = (body: string) => new Blob([body]).size <= KEEPALIVE_MAX_BYTES;
