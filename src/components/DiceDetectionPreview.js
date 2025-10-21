/**
 * Dice Detection Preview Component
 * 
 * Displays detected dice values and confidence bars.
 * Shows real-time feedback during detection process.
 */

class DiceDetectionPreview {
  constructor(containerElement) {
    this.container = containerElement;
    this.results = null;
    this.render();
  }
  
  /**
   * Update detection results
   * 
   * @param {Object} results - Detection results { values, confidence, status, detections }
   */
  updateResults(results) {
    this.results = results;
    this.render();
  }
  
  /**
   * Clear results
   */
  clear() {
    this.results = null;
    this.render();
  }
  
  /**
   * Render component
   */
  render() {
    if (!this.results) {
      this.container.innerHTML = `
        <div class="detection-preview empty">
          <p>No detection results yet</p>
        </div>
      `;
      return;
    }
    
    const { values, confidence, status, detections } = this.results;
    
    const statusClass = status === 'verified' ? 'success' : 
                       status === 'uncertain' ? 'warning' : 'error';
    
    let html = `
      <div class="detection-preview">
        <div class="detection-header">
          <h3>Detection Results</h3>
          <span class="status-badge ${statusClass}">${status.toUpperCase()}</span>
        </div>
        
        <div class="detected-values">
          <h4>Consensus Values:</h4>
          <div class="dice-values">
            ${values.map(v => `<div class="die-value">${v}</div>`).join('')}
          </div>
        </div>
        
        <div class="confidence-bar">
          <label>Overall Confidence:</label>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${confidence * 100}%"></div>
          </div>
          <span class="confidence-value">${(confidence * 100).toFixed(1)}%</span>
        </div>
        
        ${detections ? this.renderDetectionDetails(detections) : ''}
      </div>
    `;
    
    this.container.innerHTML = html;
  }
  
  /**
   * Render individual frame detection details
   * 
   * @param {Array} detections - Frame detections
   * @returns {string} HTML string
   */
  renderDetectionDetails(detections) {
    return `
      <div class="detection-details">
        <h4>Frame-by-Frame:</h4>
        <div class="frame-detections">
          ${detections.map((d, idx) => `
            <div class="frame-detection">
              <span class="frame-label">F${idx + 1}:</span>
              <span class="frame-value">${d.value}</span>
              <div class="mini-bar">
                <div class="mini-bar-fill" style="width: ${d.confidence * 100}%"></div>
              </div>
              <span class="mini-confidence">${(d.confidence * 100).toFixed(0)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiceDetectionPreview;
}
