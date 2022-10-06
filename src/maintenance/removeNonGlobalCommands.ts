import { Data } from "../data";
import * as Discord from "discord.js";
import { REST, Routes } from "discord.js";

console.log("remove now")
const data = new Data();
const rest = new REST({ version: "10" }).setToken(data.config.botToken);
// const data = null;
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });

async function removeNonGlobalCommands() {
	await client.login(data.config.botToken);

	await client.guilds.fetch();
	console.log("amount of guilds", client.guilds.cache.size);
	for (let guild of client.guilds.cache.values()) {
        try {
            await rest.put(Routes.applicationGuildCommands(data.config.clientId, guild.id), { body: [] });
        } catch (error) {
            console.error(error);
        }
	}
	console.log("removal done.");
}

removeNonGlobalCommands();