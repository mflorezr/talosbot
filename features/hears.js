/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const mongoose = require('mongoose');
const Report = mongoose.model('Report');
const User = mongoose.model('User');

module.exports = function(controller) {

    // // use a function to match a condition in the message
    // controller.hears(async (message) => message.text && message.text.toLowerCase() === 'foo', ['message'], async (bot, message) => {
    //     await bot.reply(message, 'I heard "foo" via a function test');
    // });

    // // use a regular expression to match the text of the message
    // controller.hears(new RegExp(/^\d+$/), ['message','direct_message'], async function(bot, message) {
    //     await bot.reply(message,{ text: 'I heard a number using a regular expression.' });
    // });

    // // match any one of set of mixed patterns like a string, a regular expression
    // controller.hears(['allcaps', new RegExp(/^[A-Z\s]+$/)], ['message','direct_message'], async function(bot, message) {
    //     await bot.reply(message,{ text: 'I HEARD ALL CAPS!' });
    // });

  controller.hears(['!register'], 'direct_message', async(bot, message) => {
    await bot.changeContext(message.reference);
    let user = await User.findOne({ slackId: message.user });
    if(user){
      await bot.reply(message,'Hey! You are already registered in our system. Thanks for be here :ablobdance:');
    } else {
      let slackUser = bot.api.users.info({ user: message.user }, function(err, response) {
        return response
      });
      slackUser.then(async (info) =>{
        user = new User({ name: info.user.real_name, slackId: info.user.id, reference: message.reference})
        await user.save()
      })
      await bot.reply(message,`Hey buddy! Welcome to the Talos DailyBot :welcome: . I'll be your friendly reminder during your training. Have a lot of fun! `);
    }
  });

  controller.hears(['!goodbye'], 'direct_message', async(bot, message) => {
    await bot.changeContext(message.reference);
    let user = await User.findOne({ slackId: message.user });
    if(user){
      await bot.reply(message,"It's a shame that you have to leave so soon, We hope you had a good training. We'll miss you");
      await User.deleteOne({ _id: user._id});
    } else {
      await bot.reply(message,"Have a good day stranger!");
    }
  });

  // launch the dialog in response to a message or event
  controller.hears(['hello'], 'direct_message', async(bot, message) => {
    await bot.changeContext(message.reference)
    bot.beginDialog('onboarding');
  });

}