/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const { SlackDialog } = require('botbuilder-adapter-slack');
const { BotkitConversation } = require('botkit');
const mongoose = require('mongoose');
const Report = mongoose.model('Report');
const User = mongoose.model('User');

module.exports = function(controller) {

    controller.ready(async () => {
        if (process.env.MYTEAM) {
            let bot = await controller.spawn(process.env.MYTEAM);
            await bot.startConversationInChannel(process.env.MYCHAN,process.env.MYUSER);
            bot.say('I AM AWOKEN.');
        }
    });

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
            user = new User({ name: info.user.real_name, slackId: info.user.id })
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
      if(res === 'cancel'){
        convo.gotoThread('no_ready')
      } else if( res === 'back') {
        convo.gotoThread('yesterday_thread')
      } else {
        convo.gotoThread('blockers_thread')  
      }
    }, {key: 'today'}, 'today_thread');

    onboarding.addQuestion('Great. Do you have any blockers? If so, just tell me. Otherwise please say: no.', function(res, convo) {
      if(res === 'cancel'){
        convo.gotoThread('no_ready')
      } else if( res === 'back') {
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

    // launch the dialog in response to a message or event
    controller.hears(['hello'], 'direct_message', async(bot, message) => {
        await bot.changeContext(message.reference)
        bot.beginDialog('onboarding');
    });

    
    ///-------------------------------------------
    controller.on('direct_message', async(bot, message) => {
        await bot.reply(message,'I heard a private message');
    });

    controller.hears('dm me', 'message', async(bot, message) => {
        await bot.startPrivateConversation(message.user);
        await bot.say(`Let's talk in private.`);
    });

    controller.on('direct_mention', async(bot, message) => {
        await bot.reply(message, `I heard a direct mention that said "${ message.text }"`);
    });

    controller.on('mention', async(bot, message) => {
        await bot.reply(message, `You mentioned me when you said "${ message.text }"`);
    });

    controller.hears('ephemeral', 'message,direct_message', async(bot, message) => {
        await bot.replyEphemeral(message,'This is an ephemeral reply sent using bot.replyEphemeral()!');
    });

    controller.hears('threaded', 'message,direct_message', async(bot, message) => {
        await bot.replyInThread(message,'This is a reply in a thread!');

        await bot.startConversationInThread(message.channel, message.user, message.incoming_message.channelData.ts);
        await bot.say('And this should also be in that thread!');
    });

    controller.hears('blocks', 'message', async(bot, message) => {

        await bot.reply(message,{
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n\n *Please select a restaurant:*"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Farmhouse Thai Cuisine*\n:star::star::star::star: 1528 reviews\n They do have some vegan options, like the roti and curry, plus they have a ton of salad stuff and noodles can be ordered without meat!! They have something for everyone here"
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "https://s3-media3.fl.yelpcdn.com/bphoto/c7ed05m9lC2EmA3Aruue7A/o.jpg",
                        "alt_text": "alt text for image"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Kin Khao*\n:star::star::star::star: 1638 reviews\n The sticky rice also goes wonderfully with the caramelized pork belly, which is absolutely melt-in-your-mouth and so soft."
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "https://s3-media2.fl.yelpcdn.com/bphoto/korel-1YjNtFtJlMTaC26A/o.jpg",
                        "alt_text": "alt text for image"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Ler Ros*\n:star::star::star::star: 2082 reviews\n I would really recommend the  Yum Koh Moo Yang - Spicy lime dressing and roasted quick marinated pork shoulder, basil leaves, chili & rice powder."
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": "https://s3-media2.fl.yelpcdn.com/bphoto/DawwNigKJ2ckPeDeDM7jAg/o.jpg",
                        "alt_text": "alt text for image"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Farmhouse",
                                "emoji": true
                            },
                            "value": "Farmhouse"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Kin Khao",
                                "emoji": true
                            },
                            "value": "Kin Khao"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Ler Ros",
                                "emoji": true
                            },
                            "value": "Ler Ros"
                        }
                    ]
                }
            ]
        });

    });

    controller.on('block_actions', async (bot, message) => {
        await bot.reply(message, `Sounds like your choice is ${ message.incoming_message.channelData.actions[0].value }`)
    });

    controller.on('slash_command', async(bot, message) => {
        if (message.text === 'plain') {
            await bot.reply(message, 'This is a plain reply');
        } else if (message.text === 'public') {
            await bot.replyPublic(message, 'This is a public reply');
        } else if (message.text === 'private') {
            await bot.replyPrivate(message, 'This is a private reply');
        }

        // set http status
        bot.httpBody({text:'You can send an immediate response using bot.httpBody()'});

    });

    controller.on('interactive_message', async (bot, message) => {

        console.log('INTERACTIVE MESSAGE', message);

        switch(message.actions[0].name) {
            case 'replace':
                await bot.replyInteractive(message,'[ A previous message was successfully replaced with this less exciting one. ]');
                break;
            case 'dialog':
                await bot.replyWithDialog(message, new SlackDialog('this is a dialog', '123', 'Submit', [
                    {
                        type: 'text',
                        label: 'Field 1',
                        name: 'field1',
                    },
                    {
                        type: 'text',
                        label: 'Field 2',
                        name: 'field2',
                    }
                ]).notifyOnCancel(true).state('foo').asObject());
                break;
            default:
                await bot.reply(message, 'Got a button click!');
        }
    });


    controller.on('dialog_submission', async (bot, message) => {
        await bot.reply(message, 'Got a dialog submission');

        // Return an error to Slack
        bot.dialogError([
            {
                "name": "field1",
                "error": "there was an error in field1"
            }
        ])
    });

    controller.on('dialog_cancellation', async (bot, message) => {
        await bot.reply(message, 'Got a dialog cancellation');
    });

    controller.hears('marco', 'direct_message', async (bot, message) => {
     
      // let user = bot.api.users.info({ user: message.user }, function (err, response) { 
      //   console.log(response)
      //   return response
      //  });

      //  let user = bot.api.users.profile.get({ user: message.user }, function(err, response) {
      //   console.log(err, response);
      //   return response
      // });

      // let userlist = bot.api.users.list({ }, function(err, list){
      //  return list
      // })

      //  let user = bot.api.channel.info({ channel: message.channel }, function (err, response) { 
      //     console.log(response)
      //     return response
      //    });

      // user.then(function(allowed) {
      //   console.log(allowed)
      // })
      
      // user.then(function(allowed) {
      //   console.log(allowed);
      // })]\
    
     let avhan = bot.api.conversations.members({channel: 'C01EC15T83H'},function(err,response) {
       return response;
     })

     avhan.then(function(allowed) {
        console.log(allowed);
      })

    });

    controller.on('interactive_message', async (bot, message) => {

      var reply = message.original_message;
      reply.attachments.push(
        {
            text: 'You said, ' + message.actions[0].value,
        }
      );

      await bot.replyInteractive(message, reply);

    });

}