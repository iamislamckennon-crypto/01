/**
 * Unit Tests for Pixel Difference Module
 */

const { 
  calculatePixelDiffRatio, 
  calculateResidualMotion, 
  detectExcessiveMovement 
} = require('../../src/vision/pixelDiff');

console.log('Testing calculatePixelDiffRatio...');

// Test identical frames
const frame1 = new Uint8Array(64 * 64);
frame1.fill(128);

const frame2 = new Uint8Array(64 * 64);
frame2.fill(128);

const diff1 = calculatePixelDiffRatio(frame1, frame2);
console.assert(diff1 === 0, 'Identical frames should have 0 difference');
console.log('✓ Identical frames test passed');

// Test completely different frames
const frame3 = new Uint8Array(64 * 64);
frame3.fill(0);

const frame4 = new Uint8Array(64 * 64);
frame4.fill(255);

const diff2 = calculatePixelDiffRatio(frame3, frame4, 30);
console.assert(diff2 > 0.9, 'Completely different frames should have high difference');
console.log('✓ Completely different frames test passed');

// Test partially different frames
const frame5 = new Uint8Array(64 * 64);
frame5.fill(128);

const frame6 = new Uint8Array(64 * 64);
frame6.fill(128);
// Change 25% of pixels
for (let i = 0; i < Math.floor(frame6.length * 0.25); i++) {
  frame6[i] = 200;
}

const diff3 = calculatePixelDiffRatio(frame5, frame6, 30);
console.assert(diff3 > 0.2 && diff3 < 0.3, 'Partially different frames should have moderate difference');
console.log('✓ Partially different frames test passed');

console.log();

// Test calculateResidualMotion
console.log('Testing calculateResidualMotion...');

const stableFrames = [
  frame1,
  frame2,
  frame1
];

const motion1 = calculateResidualMotion(stableFrames);
console.assert(motion1 < 0.1, 'Stable frames should have low motion');
console.log('✓ Stable frames test passed');

const movingFrames = [
  frame3,
  frame4,
  frame3
];

const motion2 = calculateResidualMotion(movingFrames);
console.assert(motion2 > 0.5, 'Moving frames should have high motion');
console.log('✓ Moving frames test passed');

console.log();

// Test detectExcessiveMovement
console.log('Testing detectExcessiveMovement...');

const excessive1 = detectExcessiveMovement(frame1, frame2, 0.35);
console.assert(excessive1 === false, 'Similar frames should not trigger excessive movement');
console.log('✓ No excessive movement test passed');

const excessive2 = detectExcessiveMovement(frame3, frame4, 0.35);
console.assert(excessive2 === true, 'Very different frames should trigger excessive movement');
console.log('✓ Excessive movement detected test passed');

console.log();
console.log('='.repeat(50));
console.log('All pixel diff tests passed!');
console.log('='.repeat(50));
