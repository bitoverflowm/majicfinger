const fs = require('fs');
const path = require('path');

const iconsDirPath = path.join(__dirname, 'node_modules', '@radix-ui', 'react-icons', 'dist');

fs.readdir(iconsDirPath, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  const iconNames = files
    .filter(file => file.endsWith('.d.ts'))
    .map(file => file.replace('.d.ts', ''));

  // Write the icon names to a JSON file
  fs.writeFileSync('iconNames.json', JSON.stringify(iconNames, null, 2));
});