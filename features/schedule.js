/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const mongoose = require('mongoose');
const User = mongoose.model('User');
var schedule = require("node-schedule");

module.exports = function(controller) {

    // schedule time to report for every user 
    let cronTask = schedule.scheduleJob('0 13 * * 1-5', async function () {
      try {
        let users = await User.find({ });
        users.forEach(async user => {
          let bot = await controller.spawn(process.env.TEAM_ID);
          await bot.changeContext(user.reference);
          await bot.startPrivateConversation(user.slackId);
          bot.beginDialog('onboarding');
        });
      } catch (err) {
        console.log(err);
        return err;
      }
    });
}