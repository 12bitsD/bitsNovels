import fs from 'fs';
import path from 'child_process';

const files = [
  'src/features/epic-2/components/__tests__/KBFactionCard.test.tsx',
  'src/features/epic-2/components/__tests__/KBFactionDetail.test.tsx',
  'src/features/epic-2/components/__tests__/KBFactionList.test.tsx',
  'src/features/epic-2/components/__tests__/KBFactionPanel.test.tsx',
  'src/features/epic-2/components/__tests__/KBLocationCard.test.tsx',
  'src/features/epic-2/components/__tests__/KBLocationDetail.test.tsx',
  'src/features/epic-2/components/__tests__/KBLocationList.test.tsx',
  'src/features/epic-2/components/__tests__/KBLocationPanel.test.tsx',
  'src/features/epic-2/hooks/__tests__/useKBLocation.test.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    // Replace `): KBFaction => ({` with `): KBFaction => ({ type: 'faction',`
    content = content.replace(/\): KBFaction => \(\{/g, '): KBFaction => ({ type: "faction",');
    content = content.replace(/\): KBLocation => \(\{/g, '): KBLocation => ({ type: "location",');
    // For useKBLocation.test.tsx
    content = content.replace(/const mockLocation: KBLocation = \{/g, 'const mockLocation: KBLocation = { type: "location",');
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed types in tests!');
