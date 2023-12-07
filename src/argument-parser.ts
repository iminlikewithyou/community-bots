import { SortingFunctions } from "../src/utils";

const ArgumentParserRegex = /(?<![\/\S])(\.[^\n\r\.\/\s]+\s*[^\n\r\.\/]*)(?!\/)/gi;

export type Argument = {
    aliases: string[];
    execute: Function;
}

export const Arguments = {
    min: {
        aliases: ["min", "minimum"],
        execute: (v: string) => {
            let min = parseInt(v);
            if (isNaN(min)) return undefined;
            return min;
        }
    },
    max: {
        aliases: ["max", "maximum"],
        execute: (value: string) => {
            let max = parseInt(value);
            if (isNaN(max)) return undefined;
            return max;
        }
    },
    sort: {
        aliases: ["sort", "sorting", "sortby"],
        execute: (value: string | Function) => {
            // allow the use of custom functions as arguments (useless right now D:)
            if (typeof value === "function") return value;
            if (["lengthdesc", "length-descending", "length-desc", "lengthdescending", "desc", "descending"].includes(value)) return SortingFunctions.lengthDescending;
            else if (["lengthasc", "length-ascending", "length-asc", "lengthascending", "asc", "ascending"].includes(value)) return SortingFunctions.lengthAscending;
            else if (["alpha", "alphabet", "alphabetic", "alphabetically", "a", "alphabetical"].includes(value)) return SortingFunctions.alphabetical;
            else if (["lenalpha", "alphalen", "lengththenalphabetical"].includes(value)) return SortingFunctions.lengthThenAlphabetical;
            else return undefined;
        }
    },
    dictionary: {
        aliases: ["dictionary", "dict"],
        execute: (value: string) => {}
    },
    file: {
        aliases: ["file", "output", "outputfile"],
        execute: (value: string) => {
            return true;
        }
    },
    regex: {
        aliases: ["regex", "re", "regular", "regular-expression"],
        execute: (value: string) => {
            return true;
        }
    }
}

export function getArgByAlias(alias: string): Argument | null {
    for (let arg in Arguments) {
        if (Arguments[arg].aliases.includes(alias)) return Arguments[arg];
    }
    return null;
}

export function parseArguments(input: string): ArgumentsInterface {
    let args = {};
    let matches = input.match(ArgumentParserRegex);
    if (matches === null) return args;

    for (let match of matches) {
        match = match.toLowerCase();

        let split = match.split(" ");
        let key = split[0].slice(1).trim(); 
        let value = split.slice(1).join(" ").trim();

        let arg = getArgByAlias(key);
        if (arg === null) continue;

        // we want the argument to always be the same name,
        // which conveniently is the first alias
        args[arg.aliases[0]] = arg.execute(value);
    }

    return args;
}

export interface ArgumentsInterface {
    min?: number | undefined;
   
    max?: number | undefined;
    
    sort?: ((a: string, b: string) => number) | undefined;

    dictionary?: string | undefined;

    file?: boolean | undefined;

    regex?: boolean | undefined;
}
