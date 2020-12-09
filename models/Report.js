const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  today: String,
  yesterday: String,
  blockers: String,
  author: {
    type: Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  },
  date:{ type: Date, default: Date.now }
});


module.exports = mongoose.model('Report', reportSchema);