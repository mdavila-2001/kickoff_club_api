const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getAllTsFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllTsFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

function stripCommentsFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({ removeComments: true });
  const cleanCode = printer.printFile(sourceFile);
  fs.writeFileSync(filePath, cleanCode, 'utf8');
  console.log(`Stripped comments from: ${filePath}`);
}

function main() {
  const srcDir = path.join(__dirname, 'src');
  const files = getAllTsFiles(srcDir);
  console.log(`Found ${files.length} TypeScript files to process.`);
  files.forEach(stripCommentsFromFile);
  console.log('Finished stripping comments from all files.');
}

main();
