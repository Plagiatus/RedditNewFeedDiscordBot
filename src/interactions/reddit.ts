import { ActivityType, ChannelType, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel } from "discord.js"
import { SlashCommandBuilder } from '@discordjs/builders';
import { sendRedditRequest, subredditUrl } from "../util";
import { client, db, setActivity } from "../main";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reddit')
		.setDescription('Manages the reddit feed.')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((command) =>
			command.setName("add").setDescription("Adds a reddits new feed to a selected channel.")
				.addStringOption((option) => option.setName("subreddit").setDescription("The subreddit to get a feed from").setRequired(true))
				.addChannelOption((option) => option.setName("channel").setDescription("The channel to send the message in").setRequired(true))
		)
		.addSubcommand((command) =>
			command.setName("remove").setDescription("Removes a reddits new feed from this server.")
				.addStringOption((option) => option.setName("subreddit").setDescription("The subreddit to get a feed from").setRequired(true))
		)
		.addSubcommand((command) =>
			command.setName("list").setDescription("Show all subreddit feeds on this server.")
		)
	,
	async execute(interaction: ChatInputCommandInteraction) {
		let subcommand: string = interaction.options.getSubcommand();
		let functionToExecute = subcommands.get(subcommand);
		if (!functionToExecute) {
			await interaction.reply({ ephemeral: true, content: "**ERROR**: Subcommand not found" });
			return;
		}
		await interaction.deferReply({ ephemeral: true });
		functionToExecute(interaction);
	},
	defaultPermission: false,
	type: "COMMAND"
}

const subcommands: Map<string, SubcommandFunction> = new Map<string, SubcommandFunction>();

async function add(interaction: ChatInputCommandInteraction) {
	let subreddit: string | null = interaction.options.getString("subreddit");
	let channel = interaction.options.getChannel("channel");

	if (!subreddit) {
		await interaction.editReply({ content: "ERRROR: Subreddit option hasn't been filled." });
		return;
	}
	if (!channel) {
		await interaction.editReply({ content: "ERRROR: Channel option hasn't been filled." });
		return;
	}
	if (channel.type != ChannelType.GuildText) {
		await interaction.editReply({ content: "ERRROR: Channel needs to be a normal text channel." });
		return;
	}

	let botPermissions = (<TextChannel>channel).permissionsFor(client.user?.id || "");
	if (!botPermissions || !botPermissions.has(PermissionFlagsBits.SendMessages) || !botPermissions.has(PermissionFlagsBits.ViewChannel)) {
		await interaction.editReply({ content: "ERROR: I have no permission to send messages in that channel." });
		return;
	}

	let response = await sendRedditRequest(subredditUrl(subreddit)).catch(async (reason) => {
		await interaction.editReply({ content: "**ERROR**: Subreddit not found. It's either private, banned, otherwise not publicly available or doesn't exist." });
	});
	if (!response) return;
	if (!interaction.guildId) {
		await interaction.editReply({ content: "**ERROR**: Discord server not found." });
		return;
	}

	let alreadySubscribed: boolean = await db.doesSubscriptionAlreadyExist(interaction.guildId, subreddit);
	if (alreadySubscribed) {
		await db.removeSubscription(interaction.guildId, subreddit);
		await interaction.editReply({ content: `I'll now post new submissions from **r/${subreddit}** to a different channel: ${channel}` });
	} else {
		await interaction.editReply({ content: `Success! I'll now post new submissions from **r/${subreddit}** to ${channel}.` });
	}
	await db.addSubscription(interaction.guildId, channel.id, subreddit);
	setActivity(ActivityType.Watching, `${await db.amountSubreddits()} subreddits`);
}
subcommands.set("add", add);


async function remove(interaction: ChatInputCommandInteraction) {
	let subreddit: string | null = interaction.options.getString("subreddit");
	if (!subreddit) {
		await interaction.editReply({ content: "**ERROR**: Subreddit option hasn't been filled." });
		return;
	}
	if (!interaction.guildId) {
		await interaction.editReply({ content: "**ERROR**: Discord server not found." });
		return;
	}

	let alreadySubscribed: boolean = await db.doesSubscriptionAlreadyExist(interaction.guildId, subreddit);
	if (!alreadySubscribed) {
		interaction.editReply({ content: `**ERROR**: You weren't subscribed to **${subreddit}** in the first place.` });
		return;
	}
	interaction.editReply({ content: `Subreddit feed from **${subreddit}** has been successfully removed.` });
	await db.removeSubscription(interaction.guildId, subreddit);
	setActivity(ActivityType.Watching, `${await db.amountSubreddits()} subreddits`);
}
subcommands.set("remove", remove);

async function list(interaction: ChatInputCommandInteraction) {
	if (!interaction.guildId) {
		interaction.editReply({ content: "**ERROR**: Discord server not found." });
		return;
	}
	let subscriptions: SubscriptionInfo[] = await db.getSubscriptionsInGuild(interaction.guildId);
	if (subscriptions.length == 0) {
		interaction.editReply({ content: "There are **no feeds** linked to this discord server." })
		return;
	}
	let embed: EmbedBuilder = new EmbedBuilder()
		.setTitle("List of linked feeds")
		.setDescription(`There are **${subscriptions.length}** feeds linked to this discord server:`);
	for (let sub of subscriptions) {
		try {
			let channel = await interaction.guild?.channels.fetch(sub.guilds.find(g => g.guild == interaction.guildId)?.channel || "");
			if (!channel) {
				embed.addFields({ name: `r/${sub.subreddit}`, value: "_invalid channel_", inline: true });
				continue;
			}

			let botPermissions = channel.permissionsFor(client.user?.id || "");
			if (!botPermissions || !botPermissions.has(PermissionFlagsBits.SendMessages) || !botPermissions.has(PermissionFlagsBits.ViewChannel)) {
				embed.addFields({ name: `r/${sub.subreddit}`, value: `${channel.toString()}\n_no permission_`, inline: true });
				continue;
			}

			embed.addFields({ name: `r/${sub.subreddit}`, value: channel.toString(), inline: true });

		} catch (error) {
			embed.addFields({ name: `r/${sub.subreddit}`, value: "_invalid channel_", inline: true });

		}
	}
	interaction.editReply({ embeds: [embed] });
}
subcommands.set("list", list);

type SubcommandFunction = (interaction: ChatInputCommandInteraction) => void;