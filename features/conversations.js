/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const { BotkitConversation } = require('botkit');
const mongoose = require('mongoose');
const Report = mongoose.model('Report');
const User = mongoose.model('User');

module.exports = function(controller) {

  const onboarding = new BotkitConversation('onboarding', controller);

  // collect a value with conditional actions

  onboarding.say('Hey! Are you ready to fill out the *Front end Training* report now?');

  onboarding.ask({
    attachments: [{
      title: '',
      callback_id: '123',
      attachment_type: 'default',
      color: '#3de060',
      actions: [{
          "name": "yes",
          "text": "Yes! I'm ready",
          "value": "Yes! I'm ready",
          "type": "button",
          "style" : "primary"
        },
        {
          "name": "no",
          "text": "Cancel",
          "value": "Cancel",
          "type": "button",
        }
      ]
    }]
  }, [{
      pattern: "yes",
      handler: async function(answer, convo, bot, full_message) {
        var reply = full_message.original_message;
        for (var a = 0; a < reply.attachments.length; a++) {
          reply.attachments[a].actions = null;
        }
        reply.attachments[0].text = full_message.actions[0].value, 
        await bot.replyInteractive(full_message, reply);
        await convo.gotoThread('yesterday_thread');
      }
    },
    {
      pattern: "Cancel",
      handler: async function(answer, convo, bot, full_message) {
        var reply = full_message.original_message;
        for (var a = 0; a < reply.attachments.length; a++) {
          reply.attachments[a].actions = null;
        }
        reply.attachments[0].text = full_message.actions[0].value, 
        await bot.replyInteractive(full_message, reply);
        await convo.gotoThread('no_ready');         
      }
    },
    {
      default: true,
      handler: async (response_text, convo, bot, full_message) => {
        await bot.say('I do not understand your response!');
  
        // start over!
        return await convo.repeat();
      }
    }
  ]);

  // define a 'ready' thread
  onboarding.addMessage('Nice, this is your update for *Front end Training*. _Type `cancel` to stop or step `back` with back_', 'yesterday_thread');

  onboarding.addQuestion('What did you complete yesterday?', function(res, convo) {
    if(res === 'cancel'){
      convo.gotoThread('no_ready')
    } else {
      convo.gotoThread('today_thread')
    }
  }, {key: 'yesterday'}, 'yesterday_thread');

  onboarding.addQuestion('What are you planning to work on today?', function(res, convo) {
    if(res.toLowerCase() === 'cancel'){
      convo.gotoThread('no_ready')
    } else if(res.toLowerCase() === 'back') {
      convo.gotoThread('yesterday_thread')
    } else {
      convo.gotoThread('blockers_thread')  
    }
  }, {key: 'today'}, 'today_thread');

  onboarding.addQuestion('Great. Do you have any blockers? If so, just tell me. Otherwise please say: no.', function(res, convo) {
    if(res.toLowerCase() === 'cancel'){
      convo.gotoThread('no_ready')
    } else if(res.toLowerCase() === 'back') {
      convo.gotoThread('today_thread')
    } else {
      convo.gotoThread('end_thread')  
    }
  }, {key: 'blockers'}, 'blockers_thread');

  onboarding.addMessage('Well done! This is all, you can continue with your work :muscle:', 'end_thread');

  // define a 'no_ready' thread
  onboarding.addMessage('Alright buddy! See you soon!', 'no_ready');

  // handle the end of the conversation
  onboarding.after(async(results, bot) => {
    let user = await User.findOne({ slackId: results.user });
    if(results.today && results.yesterday && results.blockers){
      let report = new Report({ 
        today: results.today, 
        yesterday:results.yesterday,
        blockers: results.blockers,
        author: user._id
      })
        await report.save()
        user.dailies.push(report);
        await user.save()
    }
  });

  // add the conversation to the dialogset
  controller.addDialog(onboarding);

}