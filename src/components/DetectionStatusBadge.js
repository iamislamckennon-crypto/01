/**
 * Detection Status Badge Component
 * 
 * Shows Verified / Uncertain / Flagged status with visual indicator.
 */

class DetectionStatusBadge {
  constructor(containerElement) {
    this.container = containerElement;
    this.status = null;
    this.render();
  }
  
  /**
   * Update status
   * 
   * @param {string} status - Status: verified, uncertain, flagged
   */
  updateStatus(status) {
    this.status = status;
    this.render();
  }
  
  /**
   * Clear status
   */
  clear() {
    this.status = null;
    this.render();
  }
  
  /**
   * Render component
   */
  render() {
    if (!this.status) {
      this.container.innerHTML = `
        <div class="status-badge empty">
          <span class="badge-text">No Status</span>
        </div>
      `;
      return;
    }
    
    const statusConfig = {
      verified: {
        class: 'success',
        icon: '✓',
        text: 'VERIFIED',
        description: 'Detection passed all checks'
      },
      uncertain: {
        class: 'warning',
        icon: '?',
        text: 'UNCERTAIN',
        description: 'Requires opponent confirmation'
      },
      flagged: {
        class: 'error',
        icon: '⚠',
        text: 'FLAGGED',
        description: 'Detection failed or disputed'
      }
    };
    
    const config = statusConfig[this.status] || statusConfig.flagged;
    
    let html = `
      <div class="status-badge ${config.class}">
        <span class="badge-icon">${config.icon}</span>
        <span class="badge-text">${config.text}</span>
      </div>
      <div class="status-description">
        ${config.description}
      </div>
    `;
    
    this.container.innerHTML = html;
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DetectionStatusBadge;
}
