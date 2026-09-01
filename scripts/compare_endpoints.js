const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, 'src/main/java/com/example/sharemoney/controller');
const frontendReactDir = path.join(__dirname, 'FrontendReact/src');

function findBackendEndpoints(dir) {
    const endpoints = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.java')) {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            let basePath = '';
            const requestMappingMatch = content.match(/@RequestMapping\("([^"]+)"\)/);
            if (requestMappingMatch) {
                basePath = requestMappingMatch[1];
            }
            const regex = /@(Get|Post|Put|Delete|Patch)Mapping(?:\((?:value\s*=\s*)?"([^"]+)"\))?/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const path = match[2] || '';
                endpoints.push(`${method} ${basePath}${path}`);
            }
        }
    }
    return endpoints;
}

function findFrontendEndpoints(dir) {
    const endpoints = [];
    
    function walk(d) {
        const files = fs.readdirSync(d);
        for (const file of files) {
            const fullPath = path.join(d, file);
            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const regex = /api\.(get|post|put|delete|patch)(?:<[^>]+>)?\(`?([^?`',]+)[?`',]?/g;
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const method = match[1].toUpperCase();
                    let route = match[2];
                    // Replace variables with {var} to match backend
                    route = route.replace(/\$\{[^}]+\}/g, '{var}');
                    endpoints.push(`${method} /api${route}`); // assuming backend uses /api as base
                }
            }
        }
    }
    walk(dir);
    return endpoints;
}

const beEndpoints = findBackendEndpoints(backendDir);
const feEndpoints = findFrontendEndpoints(frontendReactDir);

console.log("== BACKEND ENDPOINTS ==");
beEndpoints.forEach(e => console.log(e));

console.log("\n== FRONTEND REACT ENDPOINTS ==");
feEndpoints.forEach(e => console.log(e));
