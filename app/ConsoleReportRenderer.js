/** Console renderer compatibility facade. Keeps the original full/scoped report behavior. */
import { printFullReport, printScopedReport } from '../cli/report/index.js';
import { printBasicReport } from '../cli/report/basic.js';

export class ConsoleReportRenderer {
  render(result, elapsedMs = 0, scope = 'complete') {
    if (scope === 'basic') return printBasicReport(result, elapsedMs);
    if (scope && scope !== 'complete') return printScopedReport(result, elapsedMs, scope);
    return printFullReport(result, elapsedMs);
  }
}
