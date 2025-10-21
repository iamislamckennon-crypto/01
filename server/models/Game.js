const mongoose = require('mongoose');

const rollSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  values: {
    type: [Number],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length > 0 && arr.every(v => v >= 1 && v <= 6);
      },
      message: 'Roll values must be between 1 and 6'
    }
  },
  videoProofId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isFlagged: {
    type: Boolean,
    default: false
  }
});

const antiCheatFlagSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['suspicious_pattern', 'camera_obstruction', 'statistical_anomaly', 'manual_review', 'duplicate_pattern']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const gameSchema = new mongoose.Schema({
  hostPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'disputed', 'cancelled'],
    default: 'pending'
  },
  rolls: [rollSchema],
  antiCheatFlags: [antiCheatFlagSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
gameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total rolls count
gameSchema.virtual('totalRolls').get(function() {
  return this.rolls.length;
});

// Virtual for flagged rolls count
gameSchema.virtual('flaggedRollsCount').get(function() {
  return this.rolls.filter(roll => roll.isFlagged).length;
});

// Ensure virtuals are included in JSON output
gameSchema.set('toJSON', { virtuals: true });
gameSchema.set('toObject', { virtuals: true });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
