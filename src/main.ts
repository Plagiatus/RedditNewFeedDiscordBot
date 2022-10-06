import { Data } from "./data";
import { Database } from "./database";
import * as Discord from "discord.js";
import { checkForNewPosts, fixImageUrl, getSubreddit, getSubredditInfo, getUser, getUserInfo, postEmbed } from "./util";
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
	// await updateSlashCommands();

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


async function updateSlashCommands(guild?: Discord.Guild) {
	let commands = [];
	//load new commands
	for (let i of data.interactions.values()) {
		if (i.type != "COMMAND") continue;
		let newInteraction: any = i.data?.toJSON();
		newInteraction.defaultPermission = i.defaultPermission;
		commands.push(newInteraction);
	}

	if (guild) {
		await updateSlashCommandsInGuild(guild, commands);
	} else {
		await client.guilds.fetch();
		console.log("amount of guilds", client.guilds.cache.size);
		for (let guild of client.guilds.cache.values()) {
			await updateSlashCommandsInGuild(guild, commands);
		}
		console.log("[CLIENT] Updated slash commands.")
	}
}

async function updateSlashCommandsInGuild(guild: Discord.Guild, commands: any[]) {
	//refresh commands of guild
	// console.log(guild.id);
	try {
		await guild.commands.fetch();
		for (let command of guild.commands.cache.values()) {
			// remove outdated commands
			let found: boolean = false;
			for (let i of data.interactions.values()) {
				if (i.data?.name == command.name) {
					found = true;
					break;
				}
			}
			if (!found) {
				await guild.commands.delete(command.id);
			}
		}
		// add/update commands
		for (let command of commands) {
			await guild.commands.create(command);
		}
	} catch (error) {
		console.error(error);
	}
}

async function updateRedditFeeds() {
	let redditUserCache: Map<string, RedditUser> = new Map<string, RedditUser>();
	let subredditInfoCache: Map<string, SubredditInfo> = new Map<string, SubredditInfo>();
	let allSubscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	for (let subscription of allSubscriptions) {
		let newPosts: Post[] = await checkForNewPosts(subscription.subreddit);
		if (newPosts.length == 0) continue;
		for (let guildAndChannel of subscription.guilds) {
			let channel: Discord.Channel | null;
			try {
				channel = await client.channels.fetch(guildAndChannel.channel);
				if (!channel) continue;
				if (channel.type != Discord.ChannelType.GuildText) continue;
			} catch (error) {
				console.error("[ERROR] Couldn't get channel, removing subscription.");
				db.removeSubscription(guildAndChannel.guild, subscription.subreddit);
				continue;
			}
			try {
				let botPermissions = (<Discord.TextChannel>channel).permissionsFor(client.user?.id || "");
				if (!botPermissions || !botPermissions.has(Discord.PermissionFlagsBits.SendMessages) || !botPermissions.has(Discord.PermissionFlagsBits.ViewChannel)) continue;

				for (let post of newPosts) {
					let embed: Discord.EmbedBuilder = postEmbed(post, await getUser(post.data.author, redditUserCache), await getSubreddit(post.data.subreddit, subredditInfoCache));
					await channel.send({ embeds: [embed] });
				}
			} catch (error) {
				console.error(error);
				continue;
			}
		}
		db.addToTotalMessages(subscription.subreddit, newPosts.length);
	}
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
	let subscriptions: SubscriptionInfo[] = await db.getSubscriptions();
	for (let subscription of subscriptions) {
		db.cleanCache(subscription.subreddit);
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