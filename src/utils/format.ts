/** 모든 금액 표시에 공통으로 쓰는 K/M/B/T 축약 표기 */
export function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  const units = ['', 'K', 'M', 'B', 'T'];
  let unitIndex = 0;
  let value = n;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)}${units[unitIndex]}`;
}
