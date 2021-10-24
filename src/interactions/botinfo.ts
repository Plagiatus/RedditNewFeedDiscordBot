import { CommandInteraction, MessageEmbed } from "discord.js"
import { SlashCommandBuilder } from '@discordjs/builders';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('botinfo')
		.setDescription('Returns some info about the bot.'),
	async execute(interaction: CommandInteraction) {
		interaction.reply({ ephemeral: true, embeds: [ 
			new MessageEmbed()
			.setTitle("RedditNewFeedBot")
			.setDescription("An actually reliable bot that puts the newest posts from a given subreddit into a channel.")
			.addFields([
				{name: "Questions", value: "If you have any questions, feel free to [contact the creator](https://plagiatus.net#contact)", inline: false},
				{name: "Issues", value: "Please report any issues [here](https://github.com/Plagiatus/RedditNewFeedDiscordBot/issues)", inline: false},
				{name: "I want this bot in my server!", value: "To add the bot to your server, [click here](https://discord.com/api/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=2048)", inline: false},
				// {name: "", value: "", inline: false},
				// {name: "", value: "", inline: false},
			])
			.setThumbnail("https://i.imgur.com/tIYIOf3.png")
			.setFooter("Made by Plagiatus (https://plagiatus.net)", "https://i.imgur.com/DXLXQM4.png")
		
		
		] });
	},
	defaultPermission: true,
	type: "COMMAND"
}

