// Run with: node tests/calc.test.js
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Calc = require('../src/calc.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'covid-19.json'), 'utf8'));
const get = (code) => Calc.cleanRecords(data.countries.find((c) => c.code === code).data).records;
const CN = get('CN'), IT = get('IT'), KR = get('KR'), US = get('US'), ZA = get('ZA');
const full = Calc.dateRange('2020-02-01', '2020-03-31');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, a + ' is not ' + b);

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('PASS  ' + name);
}

test('data file has the five required countries', () => {
  assert.deepStrictEqual(data.countries.map((c) => c.country), ['China', 'Italy', 'South Korea', 'United States', 'South Africa']);
});

test('date maths counts the leap day (20 Feb to 1 Mar 2020 is 10 days)', () => {
  assert.strictEqual(Calc.daysBetween('2020-02-20', '2020-03-01'), 10);
  assert.strictEqual(Calc.dateRange('2020-02-01', '2020-03-31').length, 60);
});

test('invalid dates are rejected', () => {
  assert.ok(isNaN(Calc.toTime('2020-02-31')));
  assert.ok(isNaN(Calc.toTime('hello')));
});

test('cleanRecords sorts, removes duplicates and skips bad rows', () => {
  const out = Calc.cleanRecords([
    { date: '2020-03-02', confirmed: 5, deaths: 0, recovered: 0 },
    { date: '2020-03-01', confirmed: 3, deaths: 0, recovered: 0 },
    { date: '2020-03-01', confirmed: 4, deaths: 0, recovered: 0 },
    { date: 'bad', confirmed: 1, deaths: 0, recovered: 0 },
    { date: '2020-03-03', confirmed: -2, deaths: 0, recovered: 0 },
    { date: '2020-03-04', confirmed: 9, deaths: 1 }
  ]);
  assert.deepStrictEqual(out.records.map((r) => r.date), ['2020-03-01', '2020-03-02', '2020-03-04']);
  assert.strictEqual(out.records[0].confirmed, 4);
  assert.strictEqual(out.records[2].recovered, null);
  assert.strictEqual(out.skipped.length, 2);
});

test('active cases = confirmed - deaths - recovered (latest report per country)', () => {
  assert.strictEqual(Calc.activeCases(CN[CN.length - 1]), 81554 - 3312 - 76128); // 2,114
  assert.strictEqual(Calc.activeCases(IT[IT.length - 1]), 105792 - 12428 - 15729); // 77,635
  assert.strictEqual(Calc.activeCases(KR[KR.length - 1]), 9786 - 162 - 5408); // 4,216
  assert.strictEqual(Calc.activeCases(US[US.length - 1]), 188172 - 3873 - 7024); // 177,275
  assert.strictEqual(Calc.activeCases(ZA[ZA.length - 1]), 1353 - 5 - 31); // 1,317
  assert.strictEqual(Calc.activeCases({ confirmed: 5, deaths: null, recovered: 0 }), null);
});

test('South Africa shows its first case on 5 March 2020', () => {
  assert.strictEqual(ZA[0].date, '2020-03-05');
  assert.strictEqual(ZA[0].confirmed, 1);
});

test('days without a report align to null on the timeline', () => {
  const line = Calc.alignToTimeline(ZA, full, 'confirmed');
  assert.strictEqual(line[full.indexOf('2020-03-04')], null);
  assert.strictEqual(line[full.indexOf('2020-03-05')], 1);
  assert.strictEqual(line.filter((v) => v !== null).length, ZA.length);
});

test('China daily new cases, 10 to 20 Feb = (75569 - 42638) / 10 = 3293.1', () => {
  const est = Calc.dailyNew(CN, full, 'confirmed');
  const e = est[full.indexOf('2020-02-15')];
  near(e.value, 3293.1);
  assert.strictEqual(e.from, '2020-02-10');
  assert.strictEqual(e.to, '2020-02-20');
  assert.strictEqual(e.span, 10);
  assert.strictEqual(e.total, 32931);
});

test('first report of each country has no bar', () => {
  [CN, IT, KR, US, ZA].forEach((recs) => {
    const est = Calc.dailyNew(recs, full, 'confirmed');
    assert.strictEqual(est[full.indexOf(recs[0].date)], null);
  });
});

test('no bars before the first report', () => {
  const est = Calc.dailyNew(IT, full, 'confirmed');
  for (let i = 0; i < full.indexOf('2020-02-21'); i++) assert.strictEqual(est[i], null);
});

test('daily values add back up to the cumulative change (every country, every metric)', () => {
  [CN, IT, KR, US, ZA].forEach((recs) => {
    ['confirmed', 'deaths', 'recovered'].forEach((key) => {
      const est = Calc.dailyNew(recs, full, key);
      const sum = est.reduce((acc, e) => acc + (e ? e.value : 0), 0);
      const expected = recs[recs.length - 1][key] - recs[0][key];
      near(sum, expected, 1e-6);
    });
  });
});

test('China peak daily growth is in February, 10 to 20 Feb', () => {
  const peak = Calc.peakEstimate(Calc.dailyNew(CN, full, 'confirmed'));
  assert.strictEqual(peak.from, '2020-02-10');
  assert.strictEqual(peak.to, '2020-02-20');
  const march = Calc.dailyNew(CN, full, 'confirmed').filter((e, i) => e && full[i] >= '2020-03-01');
  assert.ok(march.every((e) => e.value < peak.value / 5));
});

test('Italy grows faster in each ten-day block of March', () => {
  const est = Calc.dailyNew(IT, full, 'confirmed');
  const a = est[full.indexOf('2020-03-05')].value; // 1 to 10 Mar
  const b = est[full.indexOf('2020-03-15')].value; // 10 to 20 Mar
  const c = est[full.indexOf('2020-03-25')].value; // 20 to 31 Mar
  near(a, (10149 - 1128) / 9);
  near(b, (47021 - 10149) / 10);
  near(c, (105792 - 47021) / 11);
  assert.ok(a < b && b < c);
});

test('South Africa daily new cases, 20 to 27 Mar = (1000 - 202) / 7', () => {
  const e = Calc.dailyNew(ZA, full, 'confirmed')[full.indexOf('2020-03-25')];
  near(e.value, 798 / 7);
});

test('gap range reports the days between reports', () => {
  assert.deepStrictEqual(Calc.gapRange(CN), { min: 9, max: 11 });
  assert.deepStrictEqual(Calc.gapRange(ZA), { min: 4, max: 10 });
  assert.strictEqual(Calc.gapRange([CN[0]]), null);
});

test('percent of confirmed handles zero and missing values', () => {
  near(Calc.percentOfConfirmed(IT[IT.length - 1], 'deaths'), (12428 / 105792) * 100);
  assert.strictEqual(Calc.percentOfConfirmed({ confirmed: 0, deaths: 0, recovered: 0 }, 'deaths'), null);
  assert.strictEqual(Calc.percentOfConfirmed({ confirmed: 9, deaths: null, recovered: 0 }, 'deaths'), null);
});

console.log('\n' + passed + ' tests passed');
