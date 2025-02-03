export const DENOM = 'urock';
export const DEFAULT_GAS = 200000;
export const DEFAULT_AMOUNT = 500000;

export function toUtf8String(byteArray: Uint8Array): string {
  return new TextDecoder().decode(byteArray);
}
