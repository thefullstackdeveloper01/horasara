export class CachedChartCalculator {
  constructor({ calculator, cache, keyFactory = input => JSON.stringify(input) }) {
    this.calculator = calculator; this.cache = cache; this.keyFactory = keyFactory;
  }
  async calculate(input, options = {}) {
    const key = this.keyFactory(input);
    const cached = await this.cache.get(key);
    if (cached !== undefined) return cached;
    const result = await this.calculator.calculate(input, options);
    await this.cache.set(key, result);
    return result;
  }
}
