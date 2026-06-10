import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hazardEdges, distanceToNearestEdge, onAnyEdge, pointInTriangle } from '../src/systems/TriangleHazard.js';

const P = (x, y) => ({ x, y });

test('hazardEdges: 3 points → triangle (3 edges), 2 → line (1 edge), ≤1 → none', () => {
  const tri = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  assert.equal(tri.length, 3);
  assert.equal(hazardEdges([P(0, 0), P(100, 0)]).length, 1);
  assert.equal(hazardEdges([P(0, 0)]).length, 0);
  assert.equal(hazardEdges([]).length, 0);
});

test('distanceToNearestEdge measures perpendicular distance to the closest edge', () => {
  const edges = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  assert.ok(Math.abs(distanceToNearestEdge(50, -10, edges) - 10) < 1e-6);
  assert.ok(distanceToNearestEdge(20, 20, edges) > 5);
});

test('onAnyEdge true within width, false outside (and false when no edges)', () => {
  const edges = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  assert.equal(onAnyEdge(50, -3, edges, 6), true);
  assert.equal(onAnyEdge(50, -30, edges, 6), false);
  assert.equal(onAnyEdge(50, 50, [], 6), false);
});

test('pointInTriangle detects inside vs outside', () => {
  const a = P(0, 0), b = P(100, 0), c = P(0, 100);
  assert.equal(pointInTriangle(10, 10, a, b, c), true);
  assert.equal(pointInTriangle(80, 80, a, b, c), false);
});

test('distToSegment clamps to endpoints (not the infinite line)', () => {
  const edges = [[P(0, 0), P(100, 0)]];
  assert.ok(Math.abs(distanceToNearestEdge(130, 0, edges) - 30) < 1e-6);
});
