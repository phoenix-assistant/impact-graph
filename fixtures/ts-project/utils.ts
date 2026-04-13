// fixtures/ts-project/utils.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return add(a, 0) + add(b, 0); // deliberately calls add
}

export function square(n: number): number {
  return multiply(n, n);
}

export function formatResult(n: number): string {
  return `Result: ${square(n)}`;
}

// Orphan - never called
export function unusedHelper(x: number): number {
  return x * 2;
}
