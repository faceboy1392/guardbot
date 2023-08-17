const fs = require('fs');
const path = require('path');

// Define the directory to search for .ts files
const directoryPath = path.join(__dirname, 'src');

// Define a regular expression to match comments and whitespace
const regex = /^\s*(\/\/[^/].*)?\s*$/

// Initialize a variable to keep track of the total lines of code
let totalLines = 0;

// Define a recursive function to traverse the directory tree and count lines of code
function countLines(filePath) {
  // Get the file stats
  const stats = fs.statSync(filePath);
  
  // If the file is a directory, traverse its contents recursively
  if (stats.isDirectory()) {
    const files = fs.readdirSync(filePath);
    files.forEach(file => {
      const subFilePath = path.join(filePath, file);
      countLines(subFilePath);
    });
  }
  // If the file is a .ts file, count its lines of code
  else if (filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
      if (!regex.test(line)) {
        totalLines++;
      }
    });
  }
}

// Call the countLines function with the root directory path
countLines(directoryPath);

// Log the total number of lines of code
console.log(`Total lines of code: ${totalLines}`);