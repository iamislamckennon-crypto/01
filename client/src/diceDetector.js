/**
 * Client-Side Dice Detection Module
 * Deterministic pip detection using grayscale + threshold + blob detection
 */

class DiceDetector {
  constructor(config = {}) {
    this.MOTION_THRESHOLD = config.MOTION_THRESHOLD || 0.02;
    this.STABLE_WINDOW = config.STABLE_WINDOW || 3;
    this.CONSENSUS_FRAMES = config.CONSENSUS_FRAMES || 3;
    this.stabilizationStartTime = null;
    this.stableFrameCount = 0;
    this.capturedFrames = [];
    this.baselineFrame = null;
  }

  /**
   * Capture baseline surface frame (F0) before roll
   */
  captureBaseline(imageData) {
    this.baselineFrame = this.convertToGrayscale(imageData);
    return {
      hash: this.hashFrame(this.baselineFrame),
      timestamp: Date.now()
    };
  }

  /**
   * Convert ImageData to grayscale array
   */
  convertToGrayscale(imageData) {
    const gray = new Uint8Array(imageData.width * imageData.height);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      // Standard luminance formula
      gray[i] = Math.round(
        0.299 * imageData.data[idx] +
        0.587 * imageData.data[idx + 1] +
        0.114 * imageData.data[idx + 2]
      );
    }
    return { data: gray, width: imageData.width, height: imageData.height };
  }

  /**
   * Calculate pixel difference ratio between two grayscale frames
   */
  calculatePixelDiff(frame1, frame2) {
    if (!frame1 || !frame2 || frame1.data.length !== frame2.data.length) {
      return 1.0;
    }
    
    let diffSum = 0;
    const threshold = 30; // Pixel value diff threshold
    
    for (let i = 0; i < frame1.data.length; i++) {
      if (Math.abs(frame1.data[i] - frame2.data[i]) > threshold) {
        diffSum++;
      }
    }
    
    return diffSum / frame1.data.length;
  }

  /**
   * Check if frame is stabilized (motion below threshold)
   */
  checkStabilization(currentFrame, previousFrame) {
    if (!previousFrame) {
      return { stable: false, diffRatio: 1.0 };
    }
    
    const diffRatio = this.calculatePixelDiff(currentFrame, previousFrame);
    const stable = diffRatio < this.MOTION_THRESHOLD;
    
    if (stable) {
      this.stableFrameCount++;
    } else {
      this.stableFrameCount = 0;
    }
    
    return { stable, diffRatio, consecutiveStable: this.stableFrameCount };
  }

  /**
   * Detect dice pips using simple blob detection
   * Returns detected value and confidence
   */
  detectPips(grayFrame) {
    // Apply threshold to create binary image
    const binary = this.threshold(grayFrame, 128);
    
    // Detect blobs (connected components)
    const blobs = this.detectBlobs(binary);
    
    // Filter circular pip-like blobs
    const pips = blobs.filter(blob => this.isPipLike(blob));
    
    // Determine dice value based on pip count
    const value = this.pipCountToDiceValue(pips.length);
    
    // Calculate confidence based on pip characteristics
    const confidence = this.calculateConfidence(pips);
    
    return {
      value,
      confidence,
      pipCount: pips.length,
      pips: pips.map(p => ({ x: p.x, y: p.y, size: p.size }))
    };
  }

  /**
   * Apply binary threshold to grayscale image
   */
  threshold(grayFrame, thresholdValue) {
    const binary = new Uint8Array(grayFrame.data.length);
    for (let i = 0; i < grayFrame.data.length; i++) {
      binary[i] = grayFrame.data[i] < thresholdValue ? 0 : 255;
    }
    return { data: binary, width: grayFrame.width, height: grayFrame.height };
  }

  /**
   * Simple blob detection using connected components
   */
  detectBlobs(binary) {
    const visited = new Uint8Array(binary.data.length);
    const blobs = [];
    const width = binary.width;
    const height = binary.height;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary.data[idx] === 0 && !visited[idx]) {
          const blob = this.floodFill(binary, visited, x, y);
          if (blob.size > 10 && blob.size < 1000) { // Filter noise and large regions
            blobs.push(blob);
          }
        }
      }
    }
    
    return blobs;
  }

  /**
   * Flood fill to find connected component
   */
  floodFill(binary, visited, startX, startY) {
    const width = binary.width;
    const height = binary.height;
    const stack = [{ x: startX, y: startY }];
    const pixels = [];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || binary.data[idx] !== 0) {
        continue;
      }
      
      visited[idx] = 1;
      pixels.push({ x, y });
      
      // 4-connected neighbors
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
    
    // Calculate blob centroid
    let sumX = 0, sumY = 0;
    for (const p of pixels) {
      sumX += p.x;
      sumY += p.y;
    }
    
    return {
      x: sumX / pixels.length,
      y: sumY / pixels.length,
      size: pixels.length,
      pixels
    };
  }

  /**
   * Check if blob is pip-like (approximately circular)
   */
  isPipLike(blob) {
    // Calculate compactness (circularity metric)
    // Perfect circle has compactness close to 1
    const area = blob.size;
    
    // Calculate perimeter (approximation)
    let perimeter = 0;
    const visited = new Set();
    for (const p of blob.pixels) {
      const key = `${p.x},${p.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        // Check if pixel is on boundary
        const neighbors = [
          `${p.x+1},${p.y}`, `${p.x-1},${p.y}`,
          `${p.x},${p.y+1}`, `${p.x},${p.y-1}`
        ];
        if (neighbors.some(n => !visited.has(n))) {
          perimeter++;
        }
      }
    }
    
    if (perimeter === 0) return false;
    
    const compactness = (4 * Math.PI * area) / (perimeter * perimeter);
    
    // Pips should be reasonably circular (0.3 to 1.5 allows for imperfect detection)
    return compactness > 0.3 && compactness < 1.5;
  }

  /**
   * Convert pip count to dice value (1-6)
   */
  pipCountToDiceValue(pipCount) {
    // Standard dice have 1-6 pips
    if (pipCount >= 1 && pipCount <= 6) {
      return pipCount;
    }
    // If pip count doesn't match, return 0 (uncertain)
    return 0;
  }

  /**
   * Calculate detection confidence based on pip characteristics
   */
  calculateConfidence(pips) {
    if (pips.length === 0 || pips.length > 6) {
      return 0;
    }
    
    // Base confidence on pip count validity
    let confidence = 0.7;
    
    // Check pip size consistency
    if (pips.length > 1) {
      const avgSize = pips.reduce((sum, p) => sum + p.size, 0) / pips.length;
      const variance = pips.reduce((sum, p) => sum + Math.pow(p.size - avgSize, 2), 0) / pips.length;
      const stdDev = Math.sqrt(variance);
      
      // Lower confidence if pip sizes vary too much
      if (stdDev > avgSize * 0.5) {
        confidence -= 0.2;
      } else {
        confidence += 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Hash frame data for evidence package
   */
  hashFrame(frame) {
    // Simple hash for demo (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < frame.data.length; i += 100) {
      hash = ((hash << 5) - hash) + frame.data[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Process single frame for detection
   */
  async processFrame(imageData) {
    const grayFrame = this.convertToGrayscale(imageData);
    const detection = this.detectPips(grayFrame);
    const frameHash = this.hashFrame(grayFrame);
    
    return {
      hash: frameHash,
      detection,
      timestamp: Date.now()
    };
  }

  /**
   * Build evidence package from captured frames
   */
  buildEvidencePackage(turnNumber, capturedFrames, surfaceHash, timingData) {
    const frameHashes = capturedFrames.map(f => f.hash);
    const diceValues = capturedFrames.map(f => f.detection.value);
    
    return {
      turnNumber,
      surfaceHash,
      frameHashes,
      diceValues,
      detections: capturedFrames.map(f => ({
        value: f.detection.value,
        confidence: f.detection.confidence,
        pipCount: f.detection.pipCount
      })),
      stabilizationTimeMs: timingData.stabilizationTime,
      residualMotionScore: timingData.residualMotion,
      algorithmVersion: '1.0.0-phase1',
      timestamp: Date.now()
    };
  }

  /**
   * Check for camera movement between baseline and first frame
   */
  checkCameraMove(firstFrame, threshold = 0.15) {
    if (!this.baselineFrame || !firstFrame) {
      return { moved: false, diffRatio: 0 };
    }
    
    const diffRatio = this.calculatePixelDiff(this.baselineFrame, firstFrame);
    const moved = diffRatio > threshold;
    
    return { moved, diffRatio };
  }

  /**
   * Reset detector state for new turn
   */
  reset() {
    this.stabilizationStartTime = null;
    this.stableFrameCount = 0;
    this.capturedFrames = [];
    // Keep baseline frame for camera move detection
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiceDetector;
}
