/**
 * Evidence Submit Panel Component
 * 
 * Packages evidence and sends to server.
 * Displays submission progress and results.
 */

class EvidenceSubmitPanel {
  constructor(containerElement, apiClient) {
    this.container = containerElement;
    this.apiClient = apiClient;
    this.evidence = null;
    this.submitting = false;
    this.render();
  }
  
  /**
   * Set evidence to submit
   * 
   * @param {Object} evidence - Evidence package
   */
  setEvidence(evidence) {
    this.evidence = evidence;
    this.render();
  }
  
  /**
   * Submit evidence to server
   * 
   * @param {string} gameRoomId - Game room ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Submission result
   */
  async submitEvidence(gameRoomId, playerId) {
    if (!this.evidence) {
      throw new Error('No evidence to submit');
    }
    
    if (this.submitting) {
      throw new Error('Submission already in progress');
    }
    
    this.submitting = true;
    this.render();
    
    try {
      const result = await this.apiClient.submitEvidence(gameRoomId, {
        evidence: this.evidence,
        playerId
      });
      
      this.submitting = false;
      this.render();
      
      return result;
      
    } catch (error) {
      this.submitting = false;
      this.render();
      throw error;
    }
  }
  
  /**
   * Render component
   */
  render() {
    if (!this.evidence) {
      this.container.innerHTML = `
        <div class="evidence-submit empty">
          <p>No evidence ready for submission</p>
        </div>
      `;
      return;
    }
    
    const statusClass = this.evidence.status === 'verified' ? 'success' : 
                       this.evidence.status === 'uncertain' ? 'warning' : 'error';
    
    const canSubmit = !this.submitting && 
                     this.evidence.status !== 'flagged';
    
    let html = `
      <div class="evidence-submit">
        <div class="evidence-summary">
          <h3>Evidence Summary</h3>
          
          <div class="summary-row">
            <label>Turn:</label>
            <span>${this.evidence.turnNumber}</span>
          </div>
          
          <div class="summary-row">
            <label>Dice Values:</label>
            <span>${this.evidence.diceValues.join(', ')}</span>
          </div>
          
          <div class="summary-row">
            <label>Status:</label>
            <span class="status-badge ${statusClass}">${this.evidence.status.toUpperCase()}</span>
          </div>
          
          <div class="summary-row">
            <label>Stabilization:</label>
            <span>${this.evidence.stabilizationTimeMs}ms</span>
          </div>
          
          <div class="summary-row">
            <label>Residual Motion:</label>
            <span>${(this.evidence.residualMotionScore * 100).toFixed(1)}%</span>
          </div>
          
          <div class="summary-row">
            <label>Algorithm:</label>
            <span class="code">${this.evidence.algorithmVersion}</span>
          </div>
          
          <div class="summary-row">
            <label>Frame Hashes:</label>
            <div class="hash-list">
              ${this.evidence.frameHashes.map((hash, idx) => `
                <div class="hash-item">
                  <span class="hash-label">F${idx + 1}:</span>
                  <code class="hash-value">${hash.substring(0, 12)}...${hash.substring(52)}</code>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="submit-actions">
          <button 
            id="submit-evidence-btn" 
            class="btn-primary ${canSubmit ? '' : 'disabled'}"
            ${canSubmit ? '' : 'disabled'}
          >
            ${this.submitting ? 'Submitting...' : 'Submit Evidence'}
          </button>
          
          ${this.evidence.status === 'flagged' ? `
            <p class="warning-text">
              Evidence flagged - cannot submit. Please re-roll.
            </p>
          ` : ''}
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    
    // Attach event listener
    if (canSubmit) {
      const submitBtn = this.container.querySelector('#submit-evidence-btn');
      submitBtn.addEventListener('click', () => {
        this.container.dispatchEvent(new CustomEvent('submit-evidence'));
      });
    }
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EvidenceSubmitPanel;
}
