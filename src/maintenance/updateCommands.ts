import { REST, Routes, RESTPostAPIApplicationCommandsJSONBody } from "discord.js";
import { Data } from "../data";


/** updates commands to servers. */

let data = new Data();
let commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

data.interactions.forEach((interaction) => {
    if (interaction.data)
        commands.push(interaction.data.toJSON());
});

const rest = new REST({ version: "10" }).setToken(data.config.botToken);

async function applyInteractions() {
    try {
        console.log(data.config.clientId);
        const returnData: any = await rest.put(Routes.applicationCommands(data.config.clientId), { body: commands});
        console.log(`Successfully updated ${returnData.length} global application commands`);
    } catch (error) {
        console.error(error);
    }

}

applyInteractions();