import * as https from "https";
import { Data } from "./data";
import { Database } from "./database";
import * as Discord from "discord.js";
import { checkForNewPosts, fixImageUrl, getSubreddit, getSubredditInfo, getUser, getUserInfo, postEmbed } from "./util";

export const data = new Data();
export const db = new Database();
export const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] })

client.on("ready", () => { console.log("[CLIENT] connected") });
client.on("interactionCreate", handleInteraction);
client.on("guildCreate", handleGuildJoin);
client.on("guildDelete", handleGuildLeave);

async function start() {
	await db.connect();
	await client.login(data.config.botToken);
	await updateSlashCommands();

	setInterval(updateRedditFeeds, data.config.refreshIntervall * 60 * 1000);
	updateRedditFeeds();
}
start();

async function handleInteraction(interaction: Discord.Interaction) {
	if (interaction.isCommand()) handleCommand(interaction);
	else if (interaction.isButton()) handleButton(interaction);

}

async function handleCommand(interaction: Discord.CommandInteraction) {
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

		for (let guild of client.guilds.cache.values()) {
			await updateSlashCommandsInGuild(guild, commands);
		}
		console.log("[CLIENT] Updated slash commands.")
	}
}

async function updateSlashCommandsInGuild(guild: Discord.Guild, commands: any[]) {
	//refresh commands of guild
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
		let newCommand = await guild.commands.create(command);
		//enable mod-only useage
		if (!newCommand.defaultPermission) {
			await guild.roles.fetch();
			const permissions: Discord.ApplicationCommandPermissionData[] = [];
			for (let roleId of guild.roles.cache.keys()) {
				if (guild.roles.cache.get(roleId)?.permissions.has(Discord.Permissions.FLAGS.MANAGE_CHANNELS) || guild.roles.cache.get(roleId)?.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR) || guild.roles.cache.get(roleId)?.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)) {
					permissions.push({
						id: roleId,
						type: "ROLE",
						permission: true
					});
				}
			}

			let owner = await guild.fetchOwner();
			permissions.push({
				id: owner.id,
				type: "USER",
				permission: true
			});
			await newCommand.permissions.set({ permissions });
		}
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
			try {
				let channel = await client.channels.fetch(guildAndChannel.channel);
				if (!channel) continue;
				if (!channel.isText()) continue;
				for (let post of newPosts) {
					let embed: Discord.MessageEmbed = postEmbed(post, await getUser(post.data.author, redditUserCache), await getSubreddit(post.data.subreddit, subredditInfoCache));
					await channel.send({ embeds: [embed] });
				}
			} catch (error) {
				console.log(error);
				continue;
			}
		}
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
	updateSlashCommands(guild);
}