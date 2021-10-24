"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builders_1 = require("@discordjs/builders");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies "pong" if the bot is online.'),
    async execute(interaction) {
        interaction.reply({ ephemeral: true, content: `Pong! (${Date.now() - interaction.createdTimestamp}ms)` });
    },
    defaultPermission: true,
    type: "COMMAND"
};
