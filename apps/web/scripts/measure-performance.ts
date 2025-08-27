#!/usr/bin/env tsx
/**
 * Performance Baseline Measurement Script
 * Measures API latencies (P50/P95/P99) for the download endpoint
 */
import { performance } from 'perf_hooks';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ITERATIONS = process.env.QUICK ? 10 : 100; // Number of requests for statistical significance
const WARMUP_ITERATIONS = process.env.QUICK ? 2 : 10; // Warmup requests to avoid cold start penalties

interface PerformanceResult {
  duration: number;
  status: number;
  size: number;
  type: 'full' | 'chapter';
  slug: string;
}

// Test scenarios
const TEST_SCENARIOS = [
  { slug: 'hamlet', type: 'full', description: 'Full audiobook (small)' },
  { slug: 'hamlet', type: 'chapter', chapter: '1', description: 'Chapter 1 (small)' },
  { slug: 'the-iliad', type: 'full', description: 'Full audiobook (medium)' },
  { slug: 'the-iliad', type: 'chapter', chapter: '5', description: 'Chapter 5 (medium)' },
  { slug: 'moby-dick', type: 'full', description: 'Full audiobook (large)' },
];

/**
 * Make a request to the download API and measure performance
 */
async function measureRequest(
  slug: string,
  type: 'full' | 'chapter',
  chapter?: string,
): Promise<PerformanceResult> {
  const params = new URLSearchParams({
    slug,
    type,
    ...(chapter && { chapter }),
  });

  const url = `${API_BASE_URL}/api/download?${params}`;

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Performance-Test/1.0',
      },
    });

    const duration = performance.now() - startTime;
    const body = await response.text();

    return {
      duration,
      status: response.status,
      size: body.length,
      type,
      slug,
    };
  } catch (error) {
    return {
      duration: performance.now() - startTime,
      status: 0,
      size: 0,
      type,
      slug,
    };
  }
}

/**
 * Calculate percentiles from an array of numbers
 */
function calculatePercentiles(values: number[]): {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    min: sorted[0],
    max: sorted[len - 1],
    mean: values.reduce((sum, v) => sum + v, 0) / len,
  };
}

/**
 * Run performance tests for a scenario
 */
async function runScenario(scenario: (typeof TEST_SCENARIOS)[0]) {
  console.log(`\n📊 Testing: ${scenario.description}`);
  console.log('━'.repeat(50));

  // Warmup
  console.log('🔥 Warming up...');
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await measureRequest(
      scenario.slug,
      scenario.type as 'full' | 'chapter',
      (scenario as any).chapter,
    );
  }

  // Actual measurements
  console.log(`🏃 Running ${ITERATIONS} iterations...`);
  const results: PerformanceResult[] = [];
  const progressInterval = Math.floor(ITERATIONS / 10);

  for (let i = 0; i < ITERATIONS; i++) {
    if (i % progressInterval === 0 && i > 0) {
      process.stdout.write(`  ${Math.round((i / ITERATIONS) * 100)}% `);
    }

    const result = await measureRequest(
      scenario.slug,
      scenario.type as 'full' | 'chapter',
      (scenario as any).chapter,
    );

    results.push(result);

    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log(' ✓');

  // Calculate metrics
  const successfulResults = results.filter((r) => r.status === 200);
  const durations = successfulResults.map((r) => r.duration);

  if (durations.length === 0) {
    console.log('❌ No successful requests');
    return null;
  }

  const metrics = calculatePercentiles(durations);
  const successRate = (successfulResults.length / results.length) * 100;

  return {
    scenario: scenario.description,
    successRate,
    requests: results.length,
    successful: successfulResults.length,
    metrics,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Performance Baseline Measurement');
  console.log('═'.repeat(50));
  console.log(`📍 Target: ${API_BASE_URL}`);
  console.log(`🔄 Iterations: ${ITERATIONS} per scenario`);
  console.log(`⏱️  Started at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    const result = await runScenario(scenario);
    if (result) {
      results.push(result);
    }
  }

  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n');
  console.log('📈 PERFORMANCE BASELINE SUMMARY');
  console.log('═'.repeat(50));

  console.log('\n📊 Latency Metrics (milliseconds):');
  console.log('─'.repeat(50));
  console.log(
    'Scenario'.padEnd(30) +
      'P50'.padStart(8) +
      'P95'.padStart(8) +
      'P99'.padStart(8) +
      'Success'.padStart(10),
  );
  console.log('─'.repeat(50));

  for (const result of results) {
    console.log(
      result.scenario.padEnd(30) +
        Math.round(result.metrics.p50).toString().padStart(8) +
        Math.round(result.metrics.p95).toString().padStart(8) +
        Math.round(result.metrics.p99).toString().padStart(8) +
        `${result.successRate.toFixed(1)}%`.padStart(10),
    );
  }

  console.log('─'.repeat(50));

  // Overall metrics
  const allDurations = results.flatMap((r) => Array(r.successful).fill(r.metrics.mean));

  if (allDurations.length > 0) {
    const overallMetrics = calculatePercentiles(allDurations);

    console.log('\n🎯 Overall Performance:');
    console.log(`  • P50 (Median): ${Math.round(overallMetrics.p50)}ms`);
    console.log(`  • P95: ${Math.round(overallMetrics.p95)}ms`);
    console.log(`  • P99: ${Math.round(overallMetrics.p99)}ms`);
    console.log(`  • Min: ${Math.round(overallMetrics.min)}ms`);
    console.log(`  • Max: ${Math.round(overallMetrics.max)}ms`);
    console.log(`  • Mean: ${Math.round(overallMetrics.mean)}ms`);
  }

  console.log(`\n⏱️  Total test duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`✅ Baseline measurement complete!`);

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `./performance-baseline-${timestamp}.json`;

  const report = {
    timestamp: new Date().toISOString(),
    environment: API_BASE_URL,
    iterations: ITERATIONS,
    duration: totalDuration,
    scenarios: results,
    overall: allDurations.length > 0 ? calculatePercentiles(allDurations) : null,
  };

  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n💾 Results saved to: ${outputPath}`);
}

// Run the script
main().catch(console.error);
