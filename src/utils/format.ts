/** 전역(합산) 금액용 — 일반적인 K/M/B/T 축약 표기 */
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

// 지점(순번)이 늘어날수록 그 지점 안에서 다루는 돈의 "단위"를 다르게 보여줍니다.
// 실제 계산은 전부 원(raw) 단위로 동일하게 처리되고, 이건 순수 표시용입니다 —
// "다음 가게로 갈수록 자릿수가 커서 체급이 다르게 느껴진다"는 연출 목적.
const BRANCH_CURRENCY_TIERS: { unit: string; divisor: number }[] = [
  { unit: '원', divisor: 1 },
  { unit: '만원', divisor: 1e4 },
  { unit: '백만원', divisor: 1e6 },
  { unit: '억원', divisor: 1e8 },
  { unit: '조원', divisor: 1e12 },
  { unit: '경원', divisor: 1e16 },
];

/** ordinal: 1호점=1, 2호점=2 ... 순번이 클수록 더 큰 통화 단위를 씁니다. */
export function formatBranchMoney(n: number, ordinal: number): string {
  const idx = Math.min(Math.max(ordinal - 1, 0), BRANCH_CURRENCY_TIERS.length - 1);
  const { unit, divisor } = BRANCH_CURRENCY_TIERS[idx];
  const value = n / divisor;
  const decimals = value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(decimals)}${unit}`;
}
