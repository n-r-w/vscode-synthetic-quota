import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { formatRenewalTime } from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});

suite('formatRenewalTime Tests', () => {
	test('should format minutes only for less than 1 hour', () => {
		const now = new Date();
		const futureTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
		const result = formatRenewalTime(futureTime.toISOString());
		assert.strictEqual(result, '30m');
	});

	test('should format hours and minutes for 1-24 hours', () => {
		const now = new Date();
		const futureTime = new Date(now.getTime() + (1 * 60 + 40) * 60 * 1000); // 1 hour 40 minutes from now
		const result = formatRenewalTime(futureTime.toISOString());
		assert.strictEqual(result, '1h40m');
	});

	test('should format hours only for exact hours', () => {
		const now = new Date();
		const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
		const result = formatRenewalTime(futureTime.toISOString());
		assert.strictEqual(result, '2h');
	});

	test('should format days and hours for more than 24 hours', () => {
		const now = new Date();
		const futureTime = new Date(now.getTime() + (2 * 24 + 5) * 60 * 60 * 1000); // 2 days 5 hours from now
		const result = formatRenewalTime(futureTime.toISOString());
		assert.strictEqual(result, '2d5h');
	});

	test('should format days only for exact days', () => {
		const now = new Date();
		const futureTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
		const result = formatRenewalTime(futureTime.toISOString());
		assert.strictEqual(result, '3d');
	});

	test('should return "invalid" for past dates', () => {
		const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
		const result = formatRenewalTime(pastTime.toISOString());
		assert.strictEqual(result, 'invalid');
	});

	test('should return "invalid" for invalid dates', () => {
		const result = formatRenewalTime('invalid-date');
		assert.strictEqual(result, 'invalid');
	});
});
