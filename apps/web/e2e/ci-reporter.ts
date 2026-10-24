import path from "node:path";
import type {
  Reporter,
  TestCase,
  TestError,
  TestResult,
} from "@playwright/test/reporter";

/** Shows failed test names in public CI annotations without exposing page data. */
export default class CiReporter implements Reporter {
  onError(error: TestError): void {
    const summary = escapeAnnotation(
      error.message?.split("\n", 1)[0] ?? "Browser setup failed",
    );
    process.stdout.write(`::error title=Browser setup failed::${summary}\n`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "failed" && result.status !== "timedOut") return;

    const file = path.relative(process.cwd(), test.location.file);
    const failure =
      result.error?.message?.split("\n", 1)[0] ?? "Unknown failure";
    const source = result.error?.stack
      ?.split("\n")
      .find((line) => line.includes("identity-flow.spec.ts:"))
      ?.trim();
    const title = escapeAnnotation(
      [test.titlePath().join(" › "), failure, source]
        .filter(Boolean)
        .join(" | "),
    );
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
