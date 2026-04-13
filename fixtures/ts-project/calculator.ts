import { formatResult, add } from './utils';

export class Calculator {
  private history: string[] = [];

  compute(n: number): string {
    const result = formatResult(n);
    this.history.push(result);
    return result;
  }

  getHistory(): string[] {
    return this.history;
  }

  sum(a: number, b: number): number {
    return add(a, b);
  }
}

export function runCalculator(n: number): void {
  const calc = new Calculator();
  console.log(calc.compute(n));
}
