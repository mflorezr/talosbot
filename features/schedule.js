/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var schedule = require("node-schedule");
const axios = require("axios");

module.exports = function (controller) {
  // schedule time to report for every user
  let cronTask = schedule.scheduleJob("0 13 * * 1-5", async function () {
    axios
      .post("https://talosbotstrapi.herokuapp.com/auth/local", {
        identifier: "admin@strapi.io",
        password: "admin123",
      })
      .then((response) => {
        axios
          .get(`https://talosbotstrapi.herokuapp.com/slack-users`, {
            headers: {
              Authorization: `Bearer ${response.data.jwt}`,
            },
          })
          .then((users) => {
            users.data.forEach(async (user) => {
              let bot = await controller.spawn(process.env.TEAM_ID);
              await bot.changeContext(user.conversationReference);
              await bot.startPrivateConversation(user.SlackID);
              bot.beginDialog("onboarding");
            });
          })
          .catch((error) => {
            console.log(error);
          });
      });
  });
};
