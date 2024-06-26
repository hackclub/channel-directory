const utils = require("../utils");
module.exports = {
  title: "🧵 Top 5 most recently active threads",
  description: "Most active threads in Hack Club",
  /**
   * @param {{app: import('@slack/bolt').App}} param1
   */
  render: async function ({ app, client }) {
    function reduceText(text, link) {
      if (text.length <= 160) return text;
      if (text.split("\n").length > 1)
        return text.split("\n")[0].slice(0, 160) + `<${link}|[...]>`;
      return text.slice(0, 160) + `<${link}|[...]>`;
    }
    var messages = await app.client.search.messages({
      query: utils.queries.topChannels,
      sort: "timestamp",
      sort_dir: "desc",
      count: 100,
      token: process.env.SLACK_USER_TOKEN,
    });
    var text = "";
    let uniqueMessages = messages.messages.matches
      .filter(
        (message) =>
          !message.channel.is_private &&
          !utils.blockedChannels.includes(message.channel.id) &&
          message.text,
      )
      .reduce((acc, message) => {
        let thread_ts = new URL(message.permalink).searchParams.get(
          "thread_ts",
        );
        if (
          message.channel.is_private ||
          !message.channel.is_channel ||
          message.is_mpim
        )
          return acc;
        if (
          !acc.find((item) => item.thread_ts === thread_ts) &&
          !acc.find((item) => item.channel.id === message.channel.id)
        ) {
          acc.push({
            thread_ts: thread_ts,
            permalink: message.permalink,
            text: message.text,
            channel: message.channel.id,
          });
        }
        return acc;
      }, [])
      .slice(0, 5);

    uniqueMessages.forEach(function (msg) {
      // There is a zero width space in the below "replaceAll".
      // This prevents users from being pinged.
      text += `${reduceText(msg.text, msg.permalink)
        .split("\n")
        .map((str) => "> " + str)
        .join("\n")
        .replaceAll(/<@[^|]+\|([^>]+)>/g, "[$1]")
        .replaceAll(
          "@",
          "​@",
        )}\nFrom <#${msg.channel}> (<${msg.permalink}|Source>)\n\n`;
    });
    return text
      .replaceAll("@", "​@")
      .replaceAll(/[\u{1F3FB}-\u{1F3FF}]/gmu, "");
  },
};
