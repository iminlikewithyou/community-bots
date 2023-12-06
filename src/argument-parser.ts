const ArgumentParserRegex = /(?<![\/\S])(\.[^\n\r\.\/\s]+\s*[^\n\r\.\/]*)(?!\/)/gi;

export interface Arguments {
    min?: number;
   
    max?: number;
    
    sort?: string;

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
        arg.sort = arg.sort.toLowerCase();
        if (!["lengthdescending", "lengthascending", "alphabetical", "lengththenalphabetical"].includes(arg.sort)) arg.sort = undefined;
    }

    if (arg.dictionary !== undefined) {
        arg.dictionary = arg.dictionary.toLowerCase();
        if (!["english"].includes(arg.dictionary)) arg.dictionary = undefined;
    }

    arg.file = !(arg.file !== undefined);
    arg.regex = !(arg.regex !== undefined);

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
        let value = split.slice(1).join(" ").trim(); // 

        args[key] = value;
    }

    return validateArguments(args);
}