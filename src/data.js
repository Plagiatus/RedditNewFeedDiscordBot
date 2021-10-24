"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
class Data {
    constructor() {
        if (Data.instance)
            return Data.instance;
        this.config = this.loadConfig();
        this.interactions = this.loadInteractions();
        Data.instance = this;
    }
    loadInteractions() {
        let interactionFiles = fs.readdirSync(__dirname + "/interactions").filter(file => file.endsWith(".js"));
        let botInteractions = new Map();
        for (let file of interactionFiles) {
            const command = require(__dirname + `/interactions/${file}`);
            if (command.type == "COMMAND" && command.data) {
                botInteractions.set(command.data.name, command);
            }
            else if (command.type == "BUTTON" && command.button) {
                botInteractions.set(command.button.customId, command);
            }
        }
        console.log("[DATA] interactions loaded.");
        return botInteractions;
    }
    loadConfig() {
        let configTextContent = fs.readFileSync(__dirname + "/config.json", "utf8");
        console.log("[DATA] config loaded.");
        return JSON.parse(configTextContent);
    }
}
exports.Data = Data;
