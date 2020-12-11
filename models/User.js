const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true
  },
  slackId: String,
  reference: Object,
  dailies: [
    { type: Schema.ObjectId, ref: 'Report' }
  ]
});

module.exports = mongoose.model('User', userSchema);