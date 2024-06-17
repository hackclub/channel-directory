// This pulls all files in sections/*
// This allows directory to stay modular.
const fs = require("node:fs");
/**
 * @param {{app: import('@slack/bolt').App}} param1
 */
module.exports = async function ({ app, client }) {
  var text = "";
  let sPromises = fs
    .readdirSync("./sections")
    .filter((str) => str.endsWith(".js"))
    .sort()
    .map(async (fn) => {
      const section = await require(`../sections/${fn}`);
      const rend = (await section.render({ app })).trim();
      text += `${section.title}\n\n${rend}\n\n════════════════════════════════════\n`;
    });

  await Promise.all(sPromises);
  var subBlocks = [];
  let bPromises = fs
    .readdirSync("./buttons")
    .filter((str) => str.endsWith(".js"))
    .sort()
    .map(async (fn) => {
      const id = Math.random().toString(32).slice(2);
      const button = await require(`../buttons/${fn}`);
      subBlocks.push({
        type: "button",
        text: {
          type: "plain_text",
          text: button.title,
          emoji: true,
        },
        value: `../buttons/${fn}`,
        action_id: id,
      });
      app.action(id, async ({ ack, respond, say, body }) => {
        console.log("hello");
        await ack();
        //await say("hello")

        await app.client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: await require(body.actions[0].value).render({ app }),
        });
      });
    });

  await Promise.all(bPromises);

  text += `\nLast Updated on ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", timeStyle: "short", dateStyle: "long" })} (EST)\nWant to dive into a specific subject? Click one of the buttons below:`;
  client.set("messageText", text);

  try {
    await app.client.chat.update({
      channel: process.env.SLACK_CHANNEL,
      ts: await client.get("messageId"),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text,
          },
        },
        {
          type: "actions",
          elements: subBlocks,
        },
      ],
      text,
    });
  } catch (e) { }
};
