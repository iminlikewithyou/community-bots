import { SortingFunctions } from "../src/utils";

const ArgumentParserRegex = /(?<![\/\S])(\.[^\n\r\.\/\s]+\s*[^\n\r\.\/]*)(?!\/)/gi;

export interface Arguments {
    min?: number;
   
    max?: number;
    
    sort?: (a: string, b: string) => number;

    dictionary?: string;

    file?: boolean;

    regex?: boolean;
}

function validateArguments(arg: Arguments): Arguments {
    if (arg.min !== undefined) {
        arg.min = parseInt(arg.min.toString());
        if (isNaN(arg.min)) arg.min = undefined;
    }

    if (arg.max !== undefined) {
        arg.max = parseInt(arg.max.toString());
        if (isNaN(arg.max)) arg.max = undefined;
    }

    if (arg.sort !== undefined) {
        if (typeof arg.sort === "function") return arg;
        // this is a silent error for the user, not telling them they typo'd it
        // TODO: make some kind of warning for this, maybe its fine?
        // TODO: make this shit not awful :sob:, probably more regex?
        // this is just a thing we HAVE to do without autocomplete from slash commands
        // switch in js makes me suicidal (logical or doesnt work in cases)
        switch (arg.sort) {
            case "lengthdesc":
            case "length-descending":
            case "length-desc":
            case "lengthdescending":
                arg.sort = SortingFunctions.lengthDescending;
                break;
            case "lengthasc":
            case "length-ascending":
            case "length-asc":
            case "lengthascending":
                arg.sort = SortingFunctions.lengthAscending;
                break;
            case "alpha":
            case "alphabet":
            case "alphabetic":
            case "alphabetically":
            case "a":
            case "alphabetical":
                arg.sort = SortingFunctions.alphabetical;
                break;
            case "lenalpha":
            case "alphalen":
            case "lengththenalphabetical":
                arg.sort = SortingFunctions.lengthThenAlphabetical;
                break;
            default:
                arg.sort = undefined;
                break;
        }
    }

    if (arg.dictionary !== undefined) {
        // TODO: make this work whenever dictionaries are added
        if (true) arg.dictionary = undefined;
    }

    arg.file = !(arg.file === undefined);
    arg.regex = !(arg.regex === undefined);

    if (arg.min !== undefined && arg.max !== undefined) {
        // flip the values if they are in the wrong order
        // this may be a bit confusing
        if (arg.min > arg.max) {
            let temp = arg.min;
            arg.min = arg.max;
            arg.max = temp;
        }
    }

    console.log(arg);
    return arg;
}

export function parseArguments(input: string): Arguments {
    let args = {} as Arguments;
    let matches = input.match(ArgumentParserRegex);
    if (matches === null) return args;

    for (let match of matches) {
        match = match.toLowerCase();

        let split = match.split(" ");
        let key = split[0].slice(1).trim(); 
        let value = split.slice(1).join(" ").trim();

        // i dont really like doing this, it feels like a hack way to do it
        // but i dont want to over complicate it to a unneccessary point
        // ...and i cant think of anything better right now
        // this also doesnt allow you to use aliases for arguments,
        // such as .min, .minimum, .minval or .sort, .sorting, .sortby
        console.log(key, value, value.length);
        args[key] = value;
    }

    return validateArguments(args);
}