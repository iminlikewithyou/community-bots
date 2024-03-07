import appRootPath from "app-root-path";
import fs from "fs";

/*
  Using a ModuleConfig allows us to disable a module and re-enable it later without losing the configuration.
  For now, the configuration is just the bot name that the module uses.
  When re-enabling a module, the bot name will be the same as it was when it was disabled.
*/
interface ModuleConfig {
  enabled: boolean
  botName?: string
}

interface Config {
  singleton: {
    enabled: boolean
    botName?: string
  }
  modules: {
    [module: string]: ModuleConfig
  }
}

interface TokenConfig {
  [botName: string]: {
    id: string
    token: string
    secret: string
    accessToken: any
  }
}

/**
 * The path to the JSON file containing the Community Bots configuration.
 */
const CONFIG_PATH = appRootPath.resolve("config/config.json");

/**
 * The path to the JSON file containing the names of the bots, their client IDs, secrets, and tokens.
 */
const TOKENS_PATH = appRootPath.resolve("config/tokens.json");

/**
 * The configuration for Community Bots.
 * 
 * **DON'T MODIFY THIS VARIABLE DIRECTLY UNLESS YOU ARE A COMPLETE FUCKING IDIOT**
 */
export let config: Config;

// check if CONFIG_PATH exists
if (fs.existsSync(CONFIG_PATH)) {
  // The configuration exists, let's try to parse it.
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (error) {
    console.log("Community Bots failed to read the configuration!");
    throw error;
  }
} else {

}

/**
 * The token configuration of the bots.
 */
export const tokens: TokenConfig = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));

/**
 * Sets the default values for the configuration if they don't exist.
 */
function setConfigDefaults() {
  if (!config.singleton.enabled) {
    config.singleton.enabled = false;
  }
  if (!config.singleton.botName) {
    config.singleton.botName = undefined;
  }
  Object.keys(config.modules).forEach((module) => {
    if (!config.modules[module].enabled) {
      config.modules[module].enabled = false;
    }
    if (!config.modules[module].botName) {
      config.modules[module].botName = undefined;
    }
  });
  saveConfig();
}

/**
 * Writes the current configuration to the JSON file.
 */
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Writes the current token configuration to the JSON file.
 */
function saveTokens() {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Sets whether or not Community Bots will use singleton mode when it starts up.
 * If singleton is enabled, but there is an invalid singleton.botName set, it will prompt the user to set a valid bot name.
 * 
 * This will also save the configuration to the JSON file.
 * 
 * @param enabled Whether or not to enable singleton mode
 */
export function setSingletonEnabled(enabled: boolean) {
  config.singleton.enabled = enabled;
  saveConfig();
}

/**
 * Sets the bot to use as the singleton bot if Community Bots is in singleton mode.
 * If the bot name is invalid when Community Bots starts up, it will prompt the user to set a valid bot name.
 * 
 * This will also save the configuration to the JSON file.
 * 
 * @param botName The identifier of the bot to set as the singleton bot
 */
export function setSingletonBot(botName: string) {
  config.singleton.botName = botName;
  saveConfig();
}

/**
 * Sets whether or not a module is enabled.
 * If this module is enabled, but the module.botName is invalid, it will prompt the user to set a valid bot name.
 * 
 * This will also save the configuration to the JSON file.
 * 
 * @param module The module to enable or disable
 * @param enabled Whether or not to enable the module
 */
export function setModuleEnabled(module: string, enabled: boolean) {
  // TODO: check if the module is set up
  config.modules[module].enabled = enabled;
  saveConfig();
}

/**
 * Sets the bot to use for a module.
 * If the bot name is invalid when Community Bots starts up, it will prompt the user to set a valid bot name.
 * 
 * This will also save the configuration to the JSON file.
 * 
 * @param module The module to set the bot for
 * @param bot The identifier of the bot to set as the module's bot
 */
export function setModuleBot(module: string, bot: string) {
  config.modules[module].botName = bot;
  saveConfig();
}

/**
 * Sets a module's configuration, overwriting it if it already exists.
 * 
 * @param module The module to set the configuration for
 * @param moduleConfig The configuration to set for the module
 */
export function configureModule(module: string, moduleConfig: ModuleConfig) {
  config.modules[module] = moduleConfig;
  saveConfig();
}

/**
 * Adds a bot to the list of bots that Community Bots can use, overwriting it if it already exists.
 * 
 * @param bot The bot's name
 * @param id The client ID of the bot
 * @param token The token of the bot
 * @param secret The secret of the bot
 * @param oauth The access token of the bot
 */
export function addBot(bot: string, id: string, token: string, secret: string, accessToken: any) {
  tokens[bot] = { id, token, secret, accessToken };
  saveTokens();
}

/**
 * Removes a bot from the list of bots that Community Bots can use.
 * 
 * @param bot The bot to remove
 */
export function removeBot(bot: string) {
  delete tokens[bot];
  saveTokens();
}