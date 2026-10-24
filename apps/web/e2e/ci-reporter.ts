import path from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/** Shows failed test names in public CI annotations without exposing page data. */
export default class CiReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "failed" && result.status !== "timedOut") return;

    const file = path.relative(process.cwd(), test.location.file);
    const title = escapeAnnotation(test.titlePath().join(" › "));
    process.stdout.write(
      `::error file=${file},line=${test.location.line},title=Browser test failed::${title}\n`,
    );
  }
}

function escapeAnnotation(value: string): string {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}
