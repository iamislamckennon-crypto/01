/**
 * Opponent Confirm Panel Component
 * 
 * Allows opponent confirmation or dispute with reason text.
 */

class OpponentConfirmPanel {
  constructor(containerElement, apiClient) {
    this.container = containerElement;
    this.apiClient = apiClient;
    this.evidence = null;
    this.processing = false;
    this.render();
  }
  
  /**
   * Set evidence to review
   * 
   * @param {Object} evidence - Evidence summary
   */
  setEvidence(evidence) {
    this.evidence = evidence;
    this.render();
  }
  
  /**
   * Confirm evidence
   * 
   * @param {string} gameRoomId - Game room ID
   * @param {string} playerId - Confirming player ID
   * @returns {Promise<Object>} Result
   */
  async confirmEvidence(gameRoomId, playerId) {
    if (!this.evidence) {
      throw new Error('No evidence to confirm');
    }
    
    this.processing = true;
    this.render();
    
    try {
      const result = await this.apiClient.confirmEvidence(gameRoomId, {
        turnNumber: this.evidence.turnNumber,
        playerId
      });
      
      this.processing = false;
      return result;
      
    } catch (error) {
      this.processing = false;
      this.render();
      throw error;
    }
  }
  
  /**
   * Dispute evidence
   * 
   * @param {string} gameRoomId - Game room ID
   * @param {string} playerId - Disputing player ID
   * @param {string} reason - Dispute reason
   * @returns {Promise<Object>} Result
   */
  async disputeEvidence(gameRoomId, playerId, reason) {
    if (!this.evidence) {
      throw new Error('No evidence to dispute');
    }
    
    this.processing = true;
    this.render();
    
    try {
      const result = await this.apiClient.disputeEvidence(gameRoomId, {
        turnNumber: this.evidence.turnNumber,
        playerId,
        reason
      });
      
      this.processing = false;
      return result;
      
    } catch (error) {
      this.processing = false;
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
        <div class="opponent-confirm empty">
          <p>No evidence to review</p>
        </div>
      `;
      return;
    }
    
    const statusClass = this.evidence.status === 'verified' ? 'success' : 
                       this.evidence.status === 'uncertain' ? 'warning' : 'error';
    
    const alreadyConfirmed = !!this.evidence.confirmedBy;
    const alreadyDisputed = !!this.evidence.disputedBy;
    const canAct = !this.processing && !alreadyConfirmed && !alreadyDisputed;
    
    let html = `
      <div class="opponent-confirm">
        <div class="evidence-review">
          <h3>Review Opponent's Evidence</h3>
          
          <div class="review-row">
            <label>Turn:</label>
            <span>${this.evidence.turnNumber}</span>
          </div>
          
          <div class="review-row">
            <label>Detected Values:</label>
            <span class="dice-values">
              ${this.evidence.diceValues.map(v => `<span class="die-value">${v}</span>`).join('')}
            </span>
          </div>
          
          <div class="review-row">
            <label>Status:</label>
            <span class="status-badge ${statusClass}">${this.evidence.status.toUpperCase()}</span>
          </div>
          
          <div class="review-row">
            <label>Algorithm Version:</label>
            <span class="code">${this.evidence.algorithmVersion}</span>
          </div>
          
          <div class="review-row">
            <label>Evidence Hash:</label>
            <code class="hash-value">${this.evidence.evidenceHash.substring(0, 16)}...</code>
          </div>
          
          ${alreadyConfirmed ? `
            <div class="review-row status-row">
              <label>✓ Confirmed:</label>
              <span>${this.evidence.confirmedAt}</span>
            </div>
          ` : ''}
          
          ${alreadyDisputed ? `
            <div class="review-row status-row error">
              <label>⚠ Disputed:</label>
              <span>${this.evidence.disputedAt}</span>
            </div>
            <div class="dispute-reason">
              <strong>Reason:</strong> ${this.evidence.disputeReason}
            </div>
          ` : ''}
        </div>
        
        ${canAct ? `
          <div class="review-actions">
            <button id="confirm-btn" class="btn-success">
              Confirm Evidence
            </button>
            
            <div class="dispute-form">
              <label for="dispute-reason">Or Dispute:</label>
              <textarea 
                id="dispute-reason" 
                placeholder="Explain why this evidence is incorrect..."
                rows="3"
              ></textarea>
              <button id="dispute-btn" class="btn-danger">
                Submit Dispute
              </button>
            </div>
          </div>
        ` : this.processing ? `
          <div class="processing">
            <p>Processing...</p>
          </div>
        ` : ''}
      </div>
    `;
    
    this.container.innerHTML = html;
    
    // Attach event listeners
    if (canAct) {
      const confirmBtn = this.container.querySelector('#confirm-btn');
      confirmBtn.addEventListener('click', () => {
        this.container.dispatchEvent(new CustomEvent('confirm-evidence'));
      });
      
      const disputeBtn = this.container.querySelector('#dispute-btn');
      disputeBtn.addEventListener('click', () => {
        const reason = this.container.querySelector('#dispute-reason').value.trim();
        if (reason) {
          this.container.dispatchEvent(new CustomEvent('dispute-evidence', {
            detail: { reason }
          }));
        } else {
          alert('Please provide a reason for disputing');
        }
      });
    }
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpponentConfirmPanel;
}
