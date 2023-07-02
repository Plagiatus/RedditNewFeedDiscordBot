
import * as Discord from "discord.js";
import { Data } from "../data";
export const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });


client.on("ready", () => { console.log("[CLIENT] connected") });

const serversToStayIn = ["154777837382008833" /* MC Commands */, "212263499601018880" /* Maptesting */ ]

async function leaveServers(){
    const data = new Data();
    await client.login(data.config.botToken);
    await client.guilds.fetch();
    for(let guild of client.guilds.cache){
        if(!serversToStayIn.includes(guild[0])) {
            await guild[1].leave();
            console.log("left", guild[0], guild[1].name);
        }
    }
    console.log("DONE LEAVING GUILDS!");
}

leaveServers();