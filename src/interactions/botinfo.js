"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const builders_1 = require("@discordjs/builders");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Returns some info about the bot.'),
    async execute(interaction) {
        interaction.reply({ ephemeral: true, embeds: [
                new discord_js_1.MessageEmbed()
                    .setTitle("RedditNewFeedBot")
                    .setDescription("An actually reliable bot that puts the newest posts from a given subreddit into a channel.")
                    .addFields([
                    { name: "Questions", value: "If you have any questions, feel free to [contact the creator](https://plagiatus.net#contact)", inline: false },
                    { name: "Issues", value: "Please report any issues [here](https://github.com/Plagiatus/RedditNewFeedDiscordBot/issues)", inline: false },
                    { name: "I want this bot in my server!", value: "To add the bot to your server, [click here](https://discord.com/api/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200)", inline: false },
                ])
                    .setThumbnail("https://i.imgur.com/tIYIOf3.png")
                    .setFooter("Made by Plagiatus (https://plagiatus.net)", "https://i.imgur.com/DXLXQM4.png")
            ] });
    },
    defaultPermission: true,
    type: "COMMAND"
};
