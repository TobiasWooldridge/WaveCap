import { test, expect } from "@playwright/test";

type LongTaskEntry = {
  startTime: number;
  duration: number;
};

type PerformanceSummary = {
  longTasks: LongTaskEntry[];
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  navigation?: PerformanceNavigationTiming | null;
};

test("benchmarks transcript view runtime metrics", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const longTasks: LongTaskEntry[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    observer.observe({ type: "longtask", buffered: true });
    (window as typeof window & { __wavecapLongTasks?: LongTaskEntry[] })
      .__wavecapLongTasks = longTasks;
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("WaveCap", { exact: true })).toBeVisible();

  await page.waitForTimeout(15000);

  const summary = await page.evaluate(() => {
    const memory =
      (performance as Performance & { memory?: PerformanceSummary["memory"] })
        .memory ?? null;
    const navigation = performance.getEntriesByType("navigation")[0] ?? null;
    return {
      longTasks:
        (window as typeof window & { __wavecapLongTasks?: LongTaskEntry[] })
          .__wavecapLongTasks ?? [],
      memory,
      navigation,
    } satisfies PerformanceSummary;
  });

  const totalLongTaskMs = summary.longTasks.reduce(
    (total, task) => total + task.duration,
    0,
  );

  await testInfo.attach("runtime-metrics", {
    body: JSON.stringify(
      {
        longTasks: {
          count: summary.longTasks.length,
          totalMs: Math.round(totalLongTaskMs),
        },
        memory: summary.memory,
        navigation: summary.navigation
          ? {
              domInteractive: summary.navigation.domInteractive,
              domContentLoadedEventEnd:
                summary.navigation.domContentLoadedEventEnd,
              loadEventEnd: summary.navigation.loadEventEnd,
            }
          : null,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  console.log(
    "WaveCap perf metrics:",
    JSON.stringify(
      {
        longTasks: {
          count: summary.longTasks.length,
          totalMs: Math.round(totalLongTaskMs),
        },
        memory: summary.memory,
        navigation: summary.navigation
          ? {
              domInteractive: summary.navigation.domInteractive,
              domContentLoadedEventEnd:
                summary.navigation.domContentLoadedEventEnd,
              loadEventEnd: summary.navigation.loadEventEnd,
            }
          : null,
      },
      null,
      2,
    ),
  );
});
