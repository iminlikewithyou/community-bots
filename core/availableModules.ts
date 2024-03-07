import * as fs from 'fs';

const MODULES_PATH = '../modules';

/**
 * Checks whether a directory is empty or not.
 *
 * @param directoryPath The path of the directory
 */
function isDirectoryEmpty(directoryPath: string): boolean {
  const files = fs.readdirSync(directoryPath);
  return files.length === 0;
}

// Find which modules are available by filtering out the empty directories
const modules: string[] = fs.readdirSync(MODULES_PATH).filter(file => {
  return !isDirectoryEmpty(`${MODULES_PATH}/${file}`)
});

console.log('Available modules:', modules);

export default modules;