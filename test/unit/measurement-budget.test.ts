import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MeasurementCacheBudget } from '../../src/webview/measurement-budget';

test('measurement cache refuses an excessive single allocation before rendering', () => {
  const budget = new MeasurementCacheBudget();
  assert.throws(() => budget.reserve({ text_size: 4, pixel_ratio: 3 }), /too large/);
  budget.reserve(undefined);
});

test('measurement cache deduplicates effective pairs but bounds cumulative distinct allocations', () => {
  const budget = new MeasurementCacheBudget();
  budget.reserve(undefined); // 600 * 2 * 1 squared = 1.44 million pixels.
  budget.reserve({ text_size: 3, pixel_ratio: 2 }); // 12.96 million, 14.4 million total.
  for (let edit = 0; edit < 100; ++edit) {
    budget.reserve({ text_size: 3, pixel_ratio: 2 });
    budget.reserve({ pixel_ratio: null }, 2); // Same effective pair as the default.
  }
  assert.throws(() => budget.reserve({ text_size: 2, pixel_ratio: 2 }), /cache is full/);
  budget.reserve({ pixel_ratio: 1, text_size: 1 }); // A refused pair does not consume budget.
  budget.reserve(undefined); // Normal edits still work after an error.
  new MeasurementCacheBudget().reserve({ text_size: 2, pixel_ratio: 2 }); // New webview, new cache.
});

test('automatic density is resolved and bounded before internal screening canvases are allocated', () => {
  const budget = new MeasurementCacheBudget();
  assert.throws(() => budget.reserve({ pixel_ratio: null }, 100), /pixel ratio/);
  budget.reserve({}, 100); // The A4 default is explicit 2, not the device ratio.
  budget.reserve({ pixel_ratio: 1 }, 100);
});
