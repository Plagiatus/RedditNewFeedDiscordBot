"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_1 = require("./data");
const database_1 = require("./database");
const Discord = __importStar(require("discord.js"));
const util_1 = require("./util");
exports.data = new data_1.Data();
exports.db = new database_1.Database();
exports.client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] });
exports.client.on("ready", () => { console.log("[CLIENT] connected"); });
exports.client.on("interactionCreate", handleInteraction);
async function start() {
    await exports.db.connect();
    await exports.client.login(exports.data.config.botToken);
    await updateSlashCommands();
    setInterval(updateRedditFeeds, 5 * 60 * 1000);
    updateRedditFeeds();
}
start();
async function handleInteraction(interaction) {
    if (interaction.isCommand())
        handleCommand(interaction);
    else if (interaction.isButton())
        handleButton(interaction);
}
async function handleCommand(interaction) {
    let commandName = interaction.commandName;
    if (!exports.data.interactions.has(commandName))
        return;
    try {
        // interaction.deferReply({ ephemeral: true });
        await exports.data.interactions.get(commandName)?.execute(interaction);
    }
    catch (error) {
        console.error(error);
        interaction.reply({ ephemeral: true, content: `There was an error executing this command: ${error}. If this problem persists, contact a moderator.` });
    }
}
async function handleButton(interaction) {
    let buttonID = interaction.customId;
    if (!exports.data.interactions.has(buttonID))
        return;
    try {
        await exports.data.interactions.get(buttonID)?.execute(interaction);
    }
    catch (error) {
        console.error(error);
        interaction.reply({ ephemeral: true, content: `There was an error using this button: ${error}. If this problem persists, contact a moderator.` });
    }
}
async function updateSlashCommands() {
    let commands = [];
    //load new commands
    for (let i of exports.data.interactions.values()) {
        if (i.type != "COMMAND")
            continue;
        let newInteraction = i.data?.toJSON();
        newInteraction.defaultPermission = i.defaultPermission;
        commands.push(newInteraction);
    }
    await exports.client.guilds.fetch();
    for (let guild of exports.client.guilds.cache.values()) {
        //refresh commands of guild
        await guild.commands.fetch();
        for (let command of guild.commands.cache.values()) {
            // remove outdated commands
            let found = false;
            for (let i of exports.data.interactions.values()) {
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
                const permissions = [];
                for (let roleId of guild.roles.cache.keys()) {
                    if (guild.roles.cache.get(roleId)?.permissions.has(Discord.Permissions.FLAGS.MANAGE_CHANNELS)) {
                        permissions.push({
                            id: roleId,
                            type: "ROLE",
                            permission: true
                        });
                    }
                }
                await newCommand.permissions.set({ permissions });
            }
        }
    }
    console.log("[CLIENT] Updated slash commands.");
}
async function updateRedditFeeds() {
    let redditUserCache = new Map();
    let subredditInfoCache = new Map();
    let allSubscriptions = await exports.db.getSubscriptions();
    for (let subscription of allSubscriptions) {
        let newPosts = await util_1.checkForNewPosts(subscription.subreddit);
        if (newPosts.length == 0)
            continue;
        for (let guildAndChannel of subscription.guilds) {
            try {
                let channel = await exports.client.channels.fetch(guildAndChannel.channel);
                if (!channel)
                    continue;
                if (!channel.isText())
                    continue;
                for (let post of newPosts) {
                    let embed = postEmbed(post, await getUser(post.data.author, redditUserCache), await getSubreddit(post.data.subreddit, subredditInfoCache));
                    await channel.send({ embeds: [embed] });
                }
            }
            catch (error) {
                continue;
            }
        }
    }
}
async function getUser(name, cache) {
    let cachedResult = cache.get(name);
    if (cachedResult)
        return cachedResult;
    let newUser = await util_1.getUserInfo(name);
    cache.set(name, newUser);
    return newUser;
}
async function getSubreddit(name, cache) {
    let cachedResult = cache.get(name);
    if (cachedResult)
        return cachedResult;
    let newSub = await util_1.getSubredditInfo(name);
    cache.set(name, newSub);
    return newSub;
}
function postEmbed(post, user, subreddit) {
    let userImage = util_1.fixImageUrl(user?.data.icon_img);
    let subredditImage = util_1.fixImageUrl(subreddit?.data.community_icon);
    let embed = new Discord.MessageEmbed()
        .setTitle(post.data.title)
        .setURL(`https://redd.it/${post.data.id}`)
        .setAuthor(post.data.author, userImage, "https://reddit.com/u/" + post.data.author)
        .setDescription(post.data.selftext)
        .setFooter(`r/${post.data.subreddit}`, subredditImage);
    if (post.data.thumbnail)
        embed.setThumbnail(post.data.thumbnail);
    if (post.data.link_flair_background_color)
        embed.setColor(post.data.link_flair_background_color);
    return embed;
}
