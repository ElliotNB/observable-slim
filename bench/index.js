#!/usr/bin/env node
/* eslint-disable no-console */

'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Use source file directly so bench doesn't require a build.
const ObservableSlim = require('../observable-slim.js');

if (typeof global.gc !== 'function') {
	console.warn('Warning: --expose-gc not set. Garbage collection may skew results.');
}

/**
 * Simple timing helper.
 */
function now() {
	return typeof performance !== 'undefined' && performance && performance.now
		? performance.now()
		: Date.now();
}

function timeIt(fn) {
	const start = now();
	const result = fn();
	const end = now();
	return { ms: end - start, result };
}

function stats(samples) {
	const n = samples.length;
	const sum = samples.reduce((a, b) => a + b, 0);
	const mean = sum / n;
	const min = Math.min(...samples);
	const max = Math.max(...samples);
	const variance = samples.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / n;
	const std = Math.sqrt(variance);
	return { mean, min, max, std, n };
}

function fmtInt(n) {
	return n.toLocaleString('en-US');
}

function fmtFixed(n, digits = 2) {
	return n.toFixed(digits);
}

/**
 * Number of write operations per case.
 * Capped so the benchmark finishes in a reasonable time.
 */
function computeNumWrites(nodeCount) {
	const factor = 4; // writes per node
	const maxWrites = 50_000;
	return Math.min(nodeCount * factor, maxWrites);
}

/**
 * Optional GC between runs if Node is started with --expose-gc.
 */
function maybeGC() {
	if (typeof global.gc === 'function') {
		try {
			global.gc();
		} catch (_) {
			// ignore
		}
	}
}

// ---------------------------------------------------------------------------
// Graph builders
// ---------------------------------------------------------------------------

function buildWide(leaves) {
	const root = {};
	let nodeCount = 1; // root
	for (let i = 0; i < leaves; i++) {
		root['n' + i] = { value: i };
		nodeCount++;
	}
	return { root, nodeCount };
}

function buildDeep(depth) {
	const root = {};
	let current = root;
	let nodeCount = 1; // root
	for (let i = 0; i < depth; i++) {
		current.next = { value: i };
		current = current.next;
		nodeCount++;
	}
	return { root, nodeCount };
}

function buildTree(totalNodes, branchingFactor = 4) {
	const root = { value: 0, children: [] };
	let created = 1;
	const queue = [root];

	while (created < totalNodes && queue.length) {
		const parent = queue.shift();
		parent.children = parent.children || [];
		for (let i = 0; i < branchingFactor && created < totalNodes; i++) {
			const child = { value: created, children: [] };
			parent.children.push(child);
			queue.push(child);
			created++;
		}
	}

	return { root, nodeCount: created };
}

// ---------------------------------------------------------------------------
// Write strategies
// ---------------------------------------------------------------------------

function setupWritesWide(proxy) {
	const keys = Object.keys(proxy);
	const leaves = keys.filter((k) => {
		const v = proxy[k];
		return v && typeof v === 'object';
	});
	return {
		performWrites(numWrites) {
			const len = leaves.length || 1;
			for (let i = 0; i < numWrites; i++) {
				const key = leaves[i % len];
				const node = proxy[key];
				node.value = (node.value || 0) + 1;
			}
		}
	};
}

function setupWritesDeep(proxy) {
	const nodes = [];
	let curr = proxy;
	// root has no value; start from proxy.next
	while (curr && curr.next) {
		nodes.push(curr.next);
		curr = curr.next;
	}
	return {
		performWrites(numWrites) {
			const len = nodes.length || 1;
			for (let i = 0; i < numWrites; i++) {
				const node = nodes[i % len];
				node.value = (node.value || 0) + 1;
			}
		}
	};
}

function setupWritesTree(proxy) {
	const nodes = [];
	const queue = [proxy];
	while (queue.length) {
		const node = queue.shift();
		nodes.push(node);
		if (Array.isArray(node.children)) {
			for (const child of node.children) {
				queue.push(child);
			}
		}
	}
	return {
		performWrites(numWrites) {
			const len = nodes.length || 1;
			for (let i = 0; i < numWrites; i++) {
				const node = nodes[i % len];
				node.value = (node.value || 0) + 1;
			}
		}
	};
}

// ---------------------------------------------------------------------------
// Benchmark core
// ---------------------------------------------------------------------------

const SIZE_PARAMS = [100, 500, 2000]; 
const RUNS_PER_CASE = 10;

const SHAPES = [
	{
		id: 'wide',
		label: 'Wide object with many leaf children (breadth-heavy)',
		sizeLabel: 'leaf objects',
		build: (n) => buildWide(n),
		setupWrites: setupWritesWide
	},
	{
		id: 'deep',
		label: 'Deep linked list (depth-heavy)',
		sizeLabel: 'depth',
		build: (n) => buildDeep(n),
		setupWrites: setupWritesDeep
	},
	{
		id: 'tree',
		label: 'Balanced k-ary tree (breadth + depth)',
		sizeLabel: 'target node count (approx)',
		build: (n) => buildTree(n, 4),
		setupWrites: setupWritesTree
	}
];

function runCase(shape, sizeParam) {
	const createSamples = [];
	const writeSamples = [];
	let nodeCount = 0;
	let numWrites = 0;

	// --- WARM UP PHASE ---
	// We run one untimed pass to ensure V8 optimizes the code paths 
	// and JIT compilation doesn't skew the small-N results.
	{
		const { root } = shape.build(sizeParam);
		// Create (untimed)
		const p = ObservableSlim.create(root, false);
		// Write (untimed, small batch)
		const w = shape.setupWrites(p);
		w.performWrites(100); 
		// Cleanup
		ObservableSlim.remove(p);
		maybeGC();
	}
	// ---------------------

	for (let run = 0; run < RUNS_PER_CASE; run++) {
		maybeGC();

		const { root, nodeCount: nodes } = shape.build(sizeParam);
		nodeCount = nodes;

		const { ms: createMs, result: proxy } = timeIt(() =>
			ObservableSlim.create(root, false /* domDelay */, undefined /* observer */)
		);
		createSamples.push(createMs);

		const writer = shape.setupWrites(proxy);
		numWrites = computeNumWrites(nodes);

		const { ms: writeMs } = timeIt(() => {
			writer.performWrites(numWrites);
			if (typeof ObservableSlim.flushCleanup === 'function') {
				ObservableSlim.flushCleanup();
			}
		});
		writeSamples.push(writeMs);

		ObservableSlim.remove(proxy);
		maybeGC();
	}

	const createStats = stats(createSamples);
	const writeStats = stats(writeSamples);

	return {
		shapeId: shape.id,
		shapeLabel: shape.label,
		sizeLabel: shape.sizeLabel,
		sizeParam,
		nodeCount,
		createStats,
		writeStats,
		numWrites
	};
}

function aggregateByShape(allCases) {
	const byShape = new Map();
	for (const c of allCases) {
		if (!byShape.has(c.shapeId)) byShape.set(c.shapeId, []);
		byShape.get(c.shapeId).push(c);
	}
	for (const [, arr] of byShape.entries()) {
		arr.sort((a, b) => a.nodeCount - b.nodeCount);
	}
	return byShape;
}

function buildMarkdown(allCases) {
	const byShape = aggregateByShape(allCases);

	const lines = [];
	const nowIso = new Date().toISOString();

	lines.push('# Observable Slim Benchmarks');
	lines.push('');
	lines.push(`Generated by \`bench/index.js\` on **${nowIso}**.`);
	lines.push('');
	lines.push('Environment:');
	lines.push(`- Node: \`${process.version}\``);
	lines.push(`- Platform: \`${process.platform} ${process.arch}\``);
	lines.push(`- Runs per case: \`${RUNS_PER_CASE}\` (with warm-up pass)`);
	lines.push('');
	lines.push('## Scaling and Time Complexity Analysis');
	lines.push('');

	for (const [shapeId, cases] of byShape.entries()) {
		const shapeLabel = cases[0].shapeLabel;

		const first = cases[0];
		const last = cases[cases.length - 1];

		const sizeRatio = last.nodeCount / first.nodeCount;
		
		// Creation Scaling
		const createTimeRatio = last.createStats.mean / first.createStats.mean;
		const createScalingRatio = createTimeRatio / sizeRatio; // 1.0 = Linear

		// Write Scaling (Time per operation)
		// If writes are O(1), time per op stays same, ratio is ~1.0
		// If writes are O(D), time per op grows with size, ratio is ~sizeRatio
		const firstUsPerWrite = (first.writeStats.mean / first.numWrites) * 1000;
		const lastUsPerWrite = (last.writeStats.mean / last.numWrites) * 1000;
		const writeCostRatio = lastUsPerWrite / (firstUsPerWrite || 1); 

		lines.push(`### ${shapeLabel}`);
		
		// Interpretation for Creation
		let createVerdict = "✅ Scales Linearly";
		if (createScalingRatio < 0.8) createVerdict = "🚀 Scales Sub-linearly (Excellent)";
		else if (createScalingRatio > 1.5) createVerdict = "⚠️ Scales Poorly";

		lines.push(`**1. Creation (Graph Setup)**`);
		lines.push(`- Input grew **${fmtFixed(sizeRatio, 1)}x** (${fmtInt(first.nodeCount)} → ${fmtInt(last.nodeCount)} nodes).`);
		lines.push(`- Time grew **${fmtFixed(createTimeRatio, 1)}x**.`);
		lines.push(`- Verdict: **${createVerdict}** (Factor: ${fmtFixed(createScalingRatio, 2)}).`);
		lines.push('');
		
		// Interpretation for Mutation
		lines.push(`**2. Mutation (Property Updates)**`);
		if (writeCostRatio < 2) {
			lines.push(`- Verdict: **⚡ O(1) Constant Time**.`);
			lines.push(`- Write cost is independent of graph size (remains ~${fmtFixed(lastUsPerWrite, 1)} µs).`);
		} else {
			lines.push(`- Verdict: **📉 O(Depth) Linear Time**.`);
			lines.push(`- Write cost grows with depth (lazy path generation).`);
			lines.push(`- Shallow: ${fmtFixed(firstUsPerWrite, 1)} µs to Deep: ${fmtFixed(lastUsPerWrite, 1)} µs.`);
 		}
		lines.push('');
	}

	lines.push('## Benchmark Results');
	lines.push('');

	for (const [shapeId, cases] of byShape.entries()) {
		const shapeLabel = cases[0].shapeLabel;
		const sizeLabel = cases[0].sizeLabel;

		lines.push(`### ${shapeLabel}`);
		lines.push('');
		lines.push(
			'| Approx. nodes | ' +
				sizeLabel +
				' | Total Create (ms) | Cost per Node (ms) | Total Writes | Total Write Time (ms) | Time per Write (µs) |'
		);
		lines.push(
			'| -------------:| :-------------------- | ----------------:| ----------------:| ------:| ----------------:| ------------------:|'
		);

		for (const c of cases) {
			const msPerNode = c.createStats.mean / c.nodeCount;
			const usPerWrite = (c.writeStats.mean / c.numWrites) * 1_000;
			lines.push(
				`| ${fmtInt(c.nodeCount)} | ${fmtInt(c.sizeParam)} | ${fmtFixed(c.createStats.mean, 2)} ±${fmtFixed(c.createStats.std, 2)} | ${fmtFixed(msPerNode, 5)} | ${fmtInt(c.numWrites)} | ${fmtFixed(c.writeStats.mean, 2)} | ${fmtFixed(usPerWrite, 2)} |`
			);
		}
		lines.push('');
	}

	return lines.join('\n');
}

function main() {
	const allCases = [];

	for (const shape of SHAPES) {
		for (const size of SIZE_PARAMS) {
			console.log(
				`Running shape=${shape.id}, sizeParam=${size} (${shape.sizeLabel})...`
			);
			const c = runCase(shape, size);
			allCases.push(c);
		}
	}

	const markdown = buildMarkdown(allCases);
	const outPath = path.join(__dirname, 'results.md');
	fs.writeFileSync(outPath, markdown, 'utf8');
	console.log(`\nBenchmark complete. Results written to ${outPath}`);
}

if (require.main === module) {
	try {
		main();
	} catch (err) {
		console.error('Benchmark failed:', err);
		process.exit(1);
	}
}