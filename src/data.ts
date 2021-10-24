import * as fs from "fs";

export class Data {
	static instance: Data | null;
	config!: Config;
	interactions!: Map<string, BotInteraction>;

	constructor() {
		if (Data.instance) return Data.instance;
		this.config = this.loadConfig();
		this.interactions = this.loadInteractions();
		Data.instance = this;
	}

	private loadInteractions(): Map<string, BotInteraction> {
		let interactionFiles: string[] = fs.readdirSync(__dirname + "/interactions").filter(file => file.endsWith(".js"));
		let botInteractions: Map<string, BotInteraction> = new Map<string, BotInteraction>();
		for (let file of interactionFiles) {
			const command: BotInteraction = require(__dirname + `/interactions/${file}`);
			if (command.type == "COMMAND" && command.data) {
				botInteractions.set(command.data.name, command);
			} else if (command.type == "BUTTON" && command.button) {
				botInteractions.set(command.button.customId as string, command);
			}
		}

		console.log("[DATA] interactions loaded.");
		return botInteractions;
	}

	private loadConfig(): Config {
		let configTextContent = fs.readFileSync(__dirname + "/config.json", "utf8");
		console.log("[DATA] config loaded.");
		return JSON.parse(configTextContent);
	}
}