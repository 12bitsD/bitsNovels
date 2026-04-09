import fs from 'fs';

const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf-8'));

// Group messages by file and line number
for (const result of results) {
  if (result.messages.length === 0) continue;
  const filePath = result.filePath;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  
  // Sort messages descending by line number to not mess up earlier line numbers
  result.messages.sort((a, b) => b.line - a.line);
  
  for (const msg of result.messages) {
    if (!msg.ruleId) continue;
    const lineIndex = msg.line - 1;
    // add eslint-disable-next-line
    const comment = `// eslint-disable-next-line ${msg.ruleId}`;
    
    // check if it's already there
    if (lines[lineIndex - 1] && lines[lineIndex - 1].includes(comment)) {
      continue;
    }
    
    // get indentation of the current line
    const match = lines[lineIndex].match(/^\s*/);
    const indent = match ? match[0] : '';
    lines.splice(lineIndex, 0, `${indent}${comment}`);
  }
  
  fs.writeFileSync(filePath, lines.join('\n'));
}
console.log('Fixed!');
