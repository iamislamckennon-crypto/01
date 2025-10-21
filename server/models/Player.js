const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_-]+$/
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  country: {
    type: String,
    default: 'Unknown',
    maxlength: 100
  },
  reputationScore: {
    type: Number,
    default: 100,
    min: -1000,
    max: 10000
  },
  flagsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
playerSchema.index({ username: 1 });
playerSchema.index({ reputationScore: -1 });

// Virtual for reputation tier
playerSchema.virtual('reputationTier').get(function() {
  const score = this.reputationScore;
  if (score >= 2500) return 'Legendary';
  if (score >= 1500) return 'Elite';
  if (score >= 1000) return 'Trusted';
  if (score >= 500) return 'Established';
  if (score >= 100) return 'Developing';
  if (score >= 0) return 'New';
  if (score >= -99) return 'Cautionary';
  return 'Suspended';
});

// Method to update reputation
playerSchema.methods.updateReputation = function(change, reason) {
  this.reputationScore += change;
  console.log(`Player ${this.username} reputation changed by ${change} (${reason}). New score: ${this.reputationScore}`);
};

// Method to increment flags
playerSchema.methods.incrementFlags = function() {
  this.flagsCount += 1;
  console.log(`Player ${this.username} flag count increased to ${this.flagsCount}`);
};

// Ensure virtuals are included in JSON output
playerSchema.set('toJSON', { virtuals: true });
playerSchema.set('toObject', { virtuals: true });

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
