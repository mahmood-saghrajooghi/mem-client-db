const fs = require('fs');
const path = require('path');

// Configuration
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build'];
const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const regionRegex = /\/\/\s*#region\s+([^\n\r]+)([\s\S]*?)\/\/\s*#endregion/g;

  let match;
  let regionsFound = [];

  // Find all regions first
  while ((match = regionRegex.exec(content)) !== null) {
    regionsFound.push({
      fullMatch: match[0],
      name: match[1].trim(),
      innerContent: match[2],
      index: match.index
    });
  }

  if (regionsFound.length === 0) return;

  console.log(`Found ${regionsFound.length} regions in ${filePath}`);

  // Sort regions by index in descending order to replace from bottom up without messing up indices
  regionsFound.sort((a, b) => b.index - a.index);

  let newContent = content;

  regionsFound.forEach(region => {
    const regionName = region.name.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize filename
    const newFileName = `${regionName}.js`;
    const newFilePath = path.join(path.dirname(filePath), newFileName);

    // Check if file already exists to avoid overwriting
    if (fs.existsSync(newFilePath)) {
      console.warn(`Warning: ${newFilePath} already exists. Skipping extraction of region '${region.name}' to avoid overwrite.`);
      return;
    }

    console.log(`Extracting region '${region.name}' to ${newFileName}`);

    // Write the extracted content to the new file
    fs.writeFileSync(newFilePath, region.innerContent.trim() + '\n');

    // Remove the region from the original file using slicing to ensure we replace the correct instance
    // Since we are processing from bottom to top, the indices remain valid for the preceding parts of the string
    const replacement = `// Region '${region.name}' moved to '${newFileName}'`;
    newContent = newContent.slice(0, region.index) + replacement + newContent.slice(region.index + region.fullMatch.length);
  });

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

const rootDir = process.cwd();
const files = getAllFiles(rootDir);

files.forEach(file => {
  // skip this script itself if it's in the list
  if (file === __filename) return;
  processFile(file);
});
