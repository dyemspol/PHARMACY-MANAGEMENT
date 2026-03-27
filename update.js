const fs = require('fs');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const path = __dirname + '/' + file;
  let content = fs.readFileSync(path, 'utf8');
  let changed = false;

  // Pattern 1: regular nav link
  if (content.includes('href="reports.html" class="nav-link w-full"') && !content.includes('x-show="window.auth.getCurrentUser()?.role === \\\'admin\\\'"')) {
    content = content.replace(/<a href="reports\.html" class="nav-link w-full">/g, '<a href="reports.html" class="nav-link w-full" x-show="window.auth.getCurrentUser()?.role === \\\'admin\\\'">');
    changed = true;
  }

  // Pattern 2: active nav link
  if (content.includes('href="reports.html" class="nav-link w-full active"') && !content.includes('x-show="window.auth.getCurrentUser()?.role === \\\'admin\\\'"')) {
    content = content.replace(/<a href="reports\.html" class="nav-link w-full active">/g, '<a href="reports.html" class="nav-link w-full active" x-show="window.auth.getCurrentUser()?.role === \\\'admin\\\'">');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(path, content, 'utf8');
    console.log('Updated ' + file);
  }
});
console.log('Done');
