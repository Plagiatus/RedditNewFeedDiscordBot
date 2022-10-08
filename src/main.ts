import { Data } from "./data";
import { Database } from "./database";
import * as Discord from "discord.js";
import { checkForNewPosts, fixImageUrl, getSubreddit, getSubredditInfo, getUser, getUserInfo, postEmbed, resetInfoCache } from "./util";
import HttpServer from "./httpserver";


export const data = new Data();
export const db = new Database();
export const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });
export const server = new HttpServer(9002);

client.on("ready", () => { console.log("[CLIENT] connected") });
client.on("interactionCreate", handleInteraction);
client.on("guildCreate", handleGuildJoin);
client.on("guildDelete", handleGuildLeave);

async function start() {
	await db.connect();
	await client.login(data.config.botToken);

	setInterval(updateRedditFeeds, data.config.refreshIntervall * 60 * 1000);
	updateRedditFeeds();
	cleanUpCachedPosts();
	setActivity(Discord.ActivityType.Watching, `${await db.amountSubreddits()} subreddits`);
}
start();

async function handleInteraction(interaction: Discord.Interaction) {
	if (interaction.isChatInputCommand()) handleCommand(interaction);
	else if (interaction.isButton()) handleButton(interaction);

}

async function handleCommand(interaction: Discord.ChatInputCommandInteraction) {
	let commandName: string = interaction.commandName;
	if (!data.interactions.has(commandName)) return;
	try {
		// interaction.deferReply({ ephemeral: true });
		await data.interactions.get(commandName)?.execute(interaction);
	} catch (error) {
		console.error(error);
		interaction.reply({ ephemeral: true, content: `There was an error executing this command: ${error}. If this problem persists, contact a moderator.` });
	}
}
async function handleButton(interaction: Discord.ButtonInteraction) {
	let buttonID: string = interaction.customId;
	if (!data.interactions.has(buttonID)) return;
	try {
		await data.interactions.get(buttonID)?.execute(interaction);
	} catch (error) {
		console.error(error);
		interaction.reply({ ephemeral: true, content: `There was an error using this button: ${error}. If this problem persists, contact a moderator.` });
	}
}

async function updateRedditFeeds() {
	let allSubscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	for (let subscription of allSubscriptions) {
		checkOneSubscription(subscription);
	}
}

async function checkOneSubscription(subscription: SubscriptionInfo) {
	let newPosts: Post[] = await checkForNewPosts(subscription.subreddit);
	if (newPosts.length == 0) return;
	for (let guildAndChannel of subscription.guilds) {
		let channel: Discord.Channel | null;
		try {
			channel = await client.channels.fetch(guildAndChannel.channel);
			if (!channel) continue;
			if (channel.type != Discord.ChannelType.GuildText) throw new Error();
		} catch (error) {
			console.error("[ERROR] Couldn't get channel, removing subscription.");
			db.removeSubscription(guildAndChannel.guild, subscription.subreddit);
			continue;
		}
		try {
			let botPermissions = (<Discord.TextChannel>channel).permissionsFor(client.user?.id || "");
			if (!botPermissions || !botPermissions.has(Discord.PermissionFlagsBits.SendMessages) || !botPermissions.has(Discord.PermissionFlagsBits.ViewChannel)) continue;

			for (let post of newPosts) {
				let embed: Discord.EmbedBuilder = postEmbed(post, await getUser(post.data.author), await getSubreddit(post.data.subreddit));
				await channel.send({ embeds: [embed] });
			}
		} catch (error) {
			console.error(error);
			continue;
		}
	}
	db.addToTotalMessages(subscription.subreddit, newPosts.length);
}


async function handleGuildLeave(guild: Discord.Guild) {
	console.log("[GUILD] Left:", guild.name);
	let subscriptions = await db.getSubscriptionsInGuild(guild.id);
	for (let sub of subscriptions) {
		await db.removeSubscription(guild.id, sub.subreddit);
	}
}

function handleGuildJoin(guild: Discord.Guild) {
	console.log("[GUILD] Joined:", guild.name);
	// updateSlashCommands(guild);
}


async function cleanUpCachedPosts() {
	setTimeout(cleanUpCachedPosts, 1000 * 60 * 60 * 24);
	resetInfoCache();
	let subscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	for (let subscription of subscriptions) {
		db.cleanCache(subscription);
	}
}

export async function sendStatusMessage(title: string, message: string, thumbURL?: string, imageURL?: string) {
	let allSubscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	let sentChannels: string[] = [];
	console.log("Sending PSA:", title);
	for (let subscription of allSubscriptions) {
		for (let guildAndChannel of subscription.guilds) {
			if (sentChannels.includes(guildAndChannel.channel)) continue;
			sentChannels.push(guildAndChannel.channel);
			try {
				let channel = await client.channels.fetch(guildAndChannel.channel);
				if (!channel) continue;
				if (channel.type != Discord.ChannelType.GuildText) continue;

				let botPermissions = (<Discord.TextChannel>channel).permissionsFor(client.user?.id || "");
				if (!botPermissions || !botPermissions.has(Discord.PermissionFlagsBits.SendMessages) || !botPermissions.has(Discord.PermissionFlagsBits.ViewChannel)) continue;

				let embed: Discord.EmbedBuilder = new Discord.EmbedBuilder().setTitle(title || "RedditNewFeedBot Information").setDescription(message);
				if (imageURL) {
					embed.setImage(imageURL);
				}
				if (thumbURL) {
					embed.setThumbnail(thumbURL);
				}

				await channel.send({ embeds: [embed] })
			} catch (error) {
				console.log(error);
				continue;
			}
		}
	}
	console.log("Sending PSA: done.");
}

export function setActivity(type: Discord.ActivityType, name: string) {
	if (type === Discord.ActivityType.Custom) {
		client.user?.setActivity({ name })
	} else {
		client.user?.setActivity({ name, type })
	}
}