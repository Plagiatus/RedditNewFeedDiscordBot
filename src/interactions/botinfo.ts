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
				{name: "What does it do?", value: "This bot posts an embed of all the new posts in a chosen subreddit.", inline: false},
				{name: "How can I use it?", value: "You need a role that has the **manage channels** permission, then you can use the /reddit command to modify which subreddit feeds you want to see in which channels.", inline: false},
				{name: "Can I modify the way it works?", value: "No, at least not directly from inside discord. The bot sourcecode is [open source](https://github.com/Plagiatus/RedditNewFeedDiscordBot) however, so you can always modify and host it yourself.", inline: false},
				{name: "Questions", value: "If you have any questions, feel free to [contact the creator](https://plagiatus.net#contact).", inline: false},
				{name: "Issues", value: "Please report any issues [here](https://github.com/Plagiatus/RedditNewFeedDiscordBot/issues).", inline: false},
				{name: "I want this bot in my server!", value: "To add the bot to your server, [click here](https://discord.com/api/oauth2/authorize?client_id=900766304628244490&scope=applications.commands%20bot&permissions=51200).", inline: false},
			])
			.setThumbnail("https://i.imgur.com/tIYIOf3.png")
			.setFooter("Made by Plagiatus (https://plagiatus.net)", "https://i.imgur.com/DXLXQM4.png")
		
		
		] });
	},
	defaultPermission: true,
	type: "COMMAND"
}

