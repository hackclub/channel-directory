const pms = require("pretty-ms");
const utils = require("../utils");
const util = require("util");
const generateMessageString = require("../utils/allTimeline");

//const timeline = require("../utils/timeline.disabled.js")
module.exports = {
  title: "🆕 Most Recent Activity",
  description: "This gets the most recently updates channels",
  /**
   * @param {{app: import('@slack/bolt').App}} param1
   */
  render: async function ({ app, client, prisma }) {
    var messages = await app.client.search.messages({
      query: utils.queries.topChannels,
      sort: "timestamp",
      sort_dir: "desc",
      count: 100,
      token: process.env.SLACK_USER_TOKEN,
    });

    const channels = messages.messages.matches.filter(
      (match) =>
        match.channel.is_channel &&
        !match.channel.is_private &&
        match.text != "archived the channel" &&
        !utils.blockedChannels.includes(match.channel.id),
    );
    const channelMap = channels
      .map((match) => match.channel.id)
      .reduce((acc, channel) => {
        acc[channel] = (acc[channel] || 0) + 1;
        return acc;
      }, {});
    const sortedChannels = Object.keys(channelMap)
      .sort((a, b) => channelMap[b] - channelMap[a])
      .slice(0, 10);
    let text = await Promise.all(
      sortedChannels.map(async (channel) => {
        const channelRecord = await prisma.channel.findFirst({
          where: {
            id: channel,
          },
        });
        if (!channelRecord || !channelRecord.emoji) {
          return `- <#${channel}>\n`;
        } else {
          return `- ${channelRecord.emoji} <#${channel}>\n`;
        }
        // (${await timeline({ app, channel })})
      }),
    ).then((texts) => texts.join(""));
    await prisma.$disconnect();
    return (
      `This is a list of conversations that are actively ongoing and that you can jump in at any time and meet new people :yay:\n\n:siren-real: Latest message: (in <#${messages.messages.matches[0].channel.id}>) ${pms(Date.now() - Math.floor(messages.messages.matches[0].ts * 1000))} ago

${await generateMessageString(channels, Math.floor(Date.now() / 1000))}

` + text.replaceAll("@", "​@").replaceAll(/[\u{1F3FB}-\u{1F3FF}]/gmu, "")
    );
  },
};
