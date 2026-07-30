const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/entity';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.java'));

const result = {};

for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n');
    let tableName = file.replace('.java', '');
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@Table')) {
            let match = lines[i].match(/name\s*=\s*"([^"]+)"/);
            if (!match && i+1 < lines.length) {
                match = lines[i+1].match(/name\s*=\s*"([^"]+)"/);
            }
            if (match) tableName = match[1];
            break;
        }
    }
    
    result[tableName] = [];
    
    let currentColumn = null;
    let isNullableFalse = false;
    
    for (const line of lines) {
        if (line.includes('@Column') || line.includes('@JoinColumn')) {
            const match = line.match(/name\s*=\s*"([^"]+)"/);
            if (match) {
                currentColumn = match[1];
            }
            if (line.includes('nullable = false')) {
                isNullableFalse = true;
            }
        }
        
        if (line.trim().startsWith('private ')) {
            const parts = line.trim().split(/\s+/);
            const type = parts[1];
            let fieldName = parts[2].replace(';', '');
            
            if (!currentColumn) {
                currentColumn = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            }
            
            result[tableName].push({
                column: currentColumn,
                notNull: isNullableFalse
            });
            
            currentColumn = null;
            isNullableFalse = false;
        }
    }
}

for (const [table, fields] of Object.entries(result)) {
    console.log(`\nTable: ${table}`);
    console.log(fields.map(f => `${f.column}${f.notNull ? '*' : ''}`).join(', '));
}
