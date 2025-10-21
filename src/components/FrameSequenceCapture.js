/**
 * Frame Sequence Capture Component
 * 
 * Manages stabilization timing and captures 3 frames (F1, F2, F3)
 * for dice detection evidence.
 */

class FrameSequenceCapture {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.options = {
      stabilizationTime: options.stabilizationTime || 600, // ms
      frameCaptureInterval: options.frameCaptureInterval || 200, // ms
      frameCount: 3,
      ...options
    };
    
    this.frames = [];
    this.capturing = false;
  }
  
  /**
   * Start video stream
   */
  async startVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      this.video.srcObject = stream;
      await this.video.play();
      
      // Set canvas size to match video
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      return true;
    } catch (error) {
      console.error('Failed to start video:', error);
      return false;
    }
  }
  
  /**
   * Stop video stream
   */
  stopVideo() {
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
  }
  
  /**
   * Capture a single frame
   * 
   * @returns {ImageData} Captured frame data
   */
  captureFrame() {
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Capture baseline frame (pre-roll)
   * 
   * @returns {ImageData} Baseline frame
   */
  captureBaseline() {
    return this.captureFrame();
  }
  
  /**
   * Capture sequence of stabilized frames
   * 
   * @param {Function} progressCallback - Called with progress updates
   * @returns {Promise<Object>} Result with frames and metadata
   */
  async captureSequence(progressCallback = null) {
    if (this.capturing) {
      throw new Error('Capture already in progress');
    }
    
    this.capturing = true;
    this.frames = [];
    
    const startTime = Date.now();
    
    try {
      // Wait for stabilization
      if (progressCallback) {
        progressCallback({ stage: 'stabilizing', progress: 0 });
      }
      
      await this.waitForStabilization(progressCallback);
      
      // Capture frames
      if (progressCallback) {
        progressCallback({ stage: 'capturing', progress: 0 });
      }
      
      for (let i = 0; i < this.options.frameCount; i++) {
        const frame = this.captureFrame();
        this.frames.push(frame);
        
        if (progressCallback) {
          const progress = ((i + 1) / this.options.frameCount) * 100;
          progressCallback({ stage: 'capturing', progress, frameNumber: i + 1 });
        }
        
        // Wait between frames (except after last frame)
        if (i < this.options.frameCount - 1) {
          await this.sleep(this.options.frameCaptureInterval);
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      if (progressCallback) {
        progressCallback({ stage: 'complete', progress: 100 });
      }
      
      return {
        frames: this.frames,
        stabilizationTimeMs: this.options.stabilizationTime,
        totalTimeMs: totalTime
      };
      
    } finally {
      this.capturing = false;
    }
  }
  
  /**
   * Wait for camera stabilization
   * 
   * @param {Function} progressCallback - Progress callback
   */
  async waitForStabilization(progressCallback = null) {
    const interval = 100;
    const steps = this.options.stabilizationTime / interval;
    
    for (let i = 0; i < steps; i++) {
      await this.sleep(interval);
      
      if (progressCallback) {
        const progress = ((i + 1) / steps) * 100;
        progressCallback({ stage: 'stabilizing', progress });
      }
    }
  }
  
  /**
   * Sleep utility
   * 
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get captured frames
   * 
   * @returns {Array<ImageData>} Captured frames
   */
  getFrames() {
    return this.frames;
  }
  
  /**
   * Clear captured frames
   */
  clearFrames() {
    this.frames = [];
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FrameSequenceCapture;
}
