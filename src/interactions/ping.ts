import { CommandInteraction } from "discord.js"
import { SlashCommandBuilder } from '@discordjs/builders';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies "pong" if the bot is online.'),
	async execute(interaction: CommandInteraction) {
		interaction.reply({ ephemeral: true, content: `Pong! (${Date.now() - interaction.createdTimestamp}ms)` });
	},
	defaultPermission: true,
	type: "COMMAND"
}

