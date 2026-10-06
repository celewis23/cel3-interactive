export function sqlStatements(source) {
  const statements = [];
  let current = "", quote = false, dollar = false, comment = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index], next = source[index + 1];
    if (!quote && !dollar && !comment && char === "-" && next === "-") comment = true;
    if (comment && char === "\n") comment = false;
    if (!comment && !quote && char === "$" && next === "$") { dollar = !dollar; current += "$$"; index++; continue; }
    if (!comment && !dollar && char === "'") {
      if (quote && next === "'") { current += "''"; index++; continue; }
      quote = !quote;
    }
    if (!comment && !quote && !dollar && char === ";") { if (current.trim()) statements.push(current.trim()); current = ""; }
    else current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}
