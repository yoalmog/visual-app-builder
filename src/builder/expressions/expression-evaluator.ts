/**
 * Safe Expression Evaluator
 * 
 * Strict constraints:
 * - Zero eval usage
 * - Zero new Function usage
 * - NO arbitrary JavaScript execution
 * - Block prototype, constructor, and global window/document access
 * - Evaluates literals, identifiers, dotted property access, arithmetic (+, -, *, /, %),
 *   comparisons (==, ===, !=, !==, <, <=, >, >=), booleans (&&, ||, !), and ternary (a ? b : c)
 */

export interface EvaluationResult {
  success: boolean;
  value: any;
  error?: string;
}

export interface EvaluationContext {
  [key: string]: any;
}

const FORBIDDEN_PROPERTIES = new Set([
  'constructor',
  'prototype',
  '__proto__',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'window',
  'document',
  'globalThis',
  'global',
  'process',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
]);

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'PUNCTUATION';

interface Token {
  type: TokenType;
  value: any;
}

/**
 * Tokenize an expression string safely
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number literals (including negative numbers handled in parser, or starting with digit)
    if (/[0-9]/.test(char) || (char === '.' && i + 1 < len && /[0-9]/.test(input[i + 1]))) {
      let numStr = '';
      while (i < len && (/[0-9]/.test(input[i]) || input[i] === '.')) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // String literals ('...' or "...")
    if (char === "'" || char === '"') {
      const quote = char;
      i++;
      let str = '';
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      if (i < len && input[i] === quote) {
        i++;
      }
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Multi-character operators
    const twoChars = input.slice(i, i + 2);
    const threeChars = input.slice(i, i + 3);

    if (threeChars === '===' || threeChars === '!==') {
      tokens.push({ type: 'OPERATOR', value: threeChars });
      i += 3;
      continue;
    }

    if (
      twoChars === '==' ||
      twoChars === '!=' ||
      twoChars === '<=' ||
      twoChars === '>=' ||
      twoChars === '&&' ||
      twoChars === '||'
    ) {
      tokens.push({ type: 'OPERATOR', value: twoChars });
      i += 2;
      continue;
    }

    // Single-character operators
    if ('+-*/%<>=!?:'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Punctuation: parentheses, brackets, dot, comma
    if ('()[].,'.includes(char)) {
      tokens.push({ type: 'PUNCTUATION', value: char });
      i++;
      continue;
    }

    // Identifiers / Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let ident = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(input[i])) {
        ident += input[i];
        i++;
      }

      if (ident === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true });
      } else if (ident === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false });
      } else if (ident === 'null') {
        tokens.push({ type: 'NULL', value: null });
      } else if (ident === 'undefined') {
        tokens.push({ type: 'NULL', value: undefined });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: ident });
      }
      continue;
    }

    // Unknown character -> reject
    throw new Error(`Unexpected character in expression: '${char}'`);
  }

  return tokens;
}

/**
 * Safe Recursive Descent Parser & AST Evaluator
 */
class ExpressionParser {
  private tokens: Token[];
  private pos = 0;
  private context: EvaluationContext;

  constructor(tokens: Token[], context: EvaluationContext) {
    this.tokens = tokens;
    this.context = context;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private matchOperator(op: string): boolean {
    const t = this.peek();
    if (t && t.type === 'OPERATOR' && t.value === op) {
      this.pos++;
      return true;
    }
    return false;
  }

  private matchPunctuation(p: string): boolean {
    const t = this.peek();
    if (t && t.type === 'PUNCTUATION' && t.value === p) {
      this.pos++;
      return true;
    }
    return false;
  }

  public parse(): any {
    if (this.tokens.length === 0) return undefined;
    const res = this.parseTernary();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected trailing token: ${JSON.stringify(this.peek())}`);
    }
    return res;
  }

  // Ternary: condition ? trueExpr : falseExpr
  private parseTernary(): any {
    const condition = this.parseLogicalOr();
    if (this.matchOperator('?')) {
      const trueVal = this.parseTernary();
      if (!this.matchOperator(':')) {
        throw new Error("Expected ':' in ternary expression");
      }
      const falseVal = this.parseTernary();
      return condition ? trueVal : falseVal;
    }
    return condition;
  }

  // Logical OR: a || b
  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();
    while (this.matchOperator('||')) {
      const right = this.parseLogicalAnd();
      left = left || right;
    }
    return left;
  }

  // Logical AND: a && b
  private parseLogicalAnd(): any {
    let left = this.parseEquality();
    while (this.matchOperator('&&')) {
      const right = this.parseEquality();
      left = left && right;
    }
    return left;
  }

  // Equality: ==, !=, ===, !==
  private parseEquality(): any {
    let left = this.parseRelational();
    while (true) {
      if (this.matchOperator('===')) {
        const right = this.parseRelational();
        left = left === right;
      } else if (this.matchOperator('!==')) {
        const right = this.parseRelational();
        left = left !== right;
      } else if (this.matchOperator('==')) {
        const right = this.parseRelational();
        // eslint-disable-next-line eqeqeq
        left = left == right;
      } else if (this.matchOperator('!=')) {
        const right = this.parseRelational();
        // eslint-disable-next-line eqeqeq
        left = left != right;
      } else {
        break;
      }
    }
    return left;
  }

  // Relational: <, <=, >, >=
  private parseRelational(): any {
    let left = this.parseAdditive();
    while (true) {
      if (this.matchOperator('<=')) {
        const right = this.parseAdditive();
        left = left <= right;
      } else if (this.matchOperator('>=')) {
        const right = this.parseAdditive();
        left = left >= right;
      } else if (this.matchOperator('<')) {
        const right = this.parseAdditive();
        left = left < right;
      } else if (this.matchOperator('>')) {
        const right = this.parseAdditive();
        left = left > right;
      } else {
        break;
      }
    }
    return left;
  }

  // Additive: +, -
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (true) {
      if (this.matchOperator('+')) {
        const right = this.parseMultiplicative();
        left = left + right;
      } else if (this.matchOperator('-')) {
        const right = this.parseMultiplicative();
        left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  // Multiplicative: *, /, %
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (true) {
      if (this.matchOperator('*')) {
        const right = this.parseUnary();
        left = left * right;
      } else if (this.matchOperator('/')) {
        const right = this.parseUnary();
        left = right === 0 ? 0 : left / right;
      } else if (this.matchOperator('%')) {
        const right = this.parseUnary();
        left = left % right;
      } else {
        break;
      }
    }
    return left;
  }

  // Unary: !, -, +
  private parseUnary(): any {
    if (this.matchOperator('!')) {
      return !this.parseUnary();
    }
    if (this.matchOperator('-')) {
      return -this.parseUnary();
    }
    if (this.matchOperator('+')) {
      return +this.parseUnary();
    }
    return this.parsePostfix();
  }

  // Postfix: property access (.prop), index access ([index]), method calls (.toLowerCase())
  private parsePostfix(): any {
    let expr = this.parsePrimary();

    while (true) {
      // Dotted property access: expr.prop
      if (this.matchPunctuation('.')) {
        const propToken = this.consume();
        if (!propToken || propToken.type !== 'IDENTIFIER') {
          throw new Error('Expected identifier after .');
        }
        const propName = propToken.value;
        if (FORBIDDEN_PROPERTIES.has(propName)) {
          throw new Error(`Unsafe property access rejected: ${propName}`);
        }

        // Method calls e.g. .toLowerCase() or .trim()
        if (this.matchPunctuation('(')) {
          const args: any[] = [];
          if (!this.matchPunctuation(')')) {
            do {
              args.push(this.parseTernary());
            } while (this.matchPunctuation(','));
            if (!this.matchPunctuation(')')) {
              throw new Error("Expected ')' after method arguments");
            }
          }
          if (typeof expr?.[propName] === 'function') {
            expr = expr[propName](...args);
          } else {
            expr = undefined;
          }
        } else {
          if (Array.isArray(expr)) {
            expr = expr.map((item) => item?.[propName]);
          } else {
            expr = expr?.[propName];
          }
        }
      }
      // Bracket index access: expr[key] or wildcard array expr[]
      else if (this.matchPunctuation('[')) {
        if (this.matchPunctuation(']')) {
          // Wildcard array projection: items[]
          if (!Array.isArray(expr) && expr !== undefined && expr !== null) {
            expr = [expr];
          }
        } else {
          const indexExpr = this.parseTernary();
          if (!this.matchPunctuation(']')) {
            throw new Error("Expected ']' after index expression");
          }
          if (typeof indexExpr === 'string' && FORBIDDEN_PROPERTIES.has(indexExpr)) {
            throw new Error(`Unsafe property access rejected: ${indexExpr}`);
          }
          expr = expr?.[indexExpr];
        }
      } else {
        break;
      }
    }

    return expr;
  }

  // Primary: literals, identifiers, grouped expressions (expr), function calls
  private parsePrimary(): any {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'NUMBER' || t.type === 'STRING' || t.type === 'BOOLEAN' || t.type === 'NULL') {
      this.consume();
      return t.value;
    }

    // Grouped expression: ( expr )
    if (this.matchPunctuation('(')) {
      const inner = this.parseTernary();
      if (!this.matchPunctuation(')')) {
        throw new Error("Expected ')' after grouped expression");
      }
      return inner;
    }

    // Identifier: function call or context/variable lookup
    if (t.type === 'IDENTIFIER') {
      this.consume();
      const name = t.value;

      if (FORBIDDEN_PROPERTIES.has(name)) {
        throw new Error(`Unsafe identifier access rejected: ${name}`);
      }

      // Function call: NAME(...)
      if (this.matchPunctuation('(')) {
        const args: any[] = [];
        if (!this.matchPunctuation(')')) {
          do {
            args.push(this.parseTernary());
          } while (this.matchPunctuation(','));
          if (!this.matchPunctuation(')')) {
            throw new Error(`Expected ')' after function '${name}' arguments`);
          }
        }
        return this.executeBuiltinFunction(name.toUpperCase(), args);
      }

      // Check context
      if (this.context && Object.prototype.hasOwnProperty.call(this.context, name)) {
        return this.context[name];
      }

      // Check scoped variables within context
      if (this.context?.variables && Object.prototype.hasOwnProperty.call(this.context.variables, name)) {
        return this.context.variables[name];
      }

      // Fallback: check nested dotted property if identifier has dots, or return undefined
      return this.context?.[name];
    }

    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  private executeBuiltinFunction(name: string, args: any[]): any {
    switch (name) {
      case 'IF': {
        const [condition, trueVal, falseVal] = args;
        return condition ? trueVal : falseVal;
      }
      case 'AND': {
        return args.length > 0 && args.every(Boolean);
      }
      case 'OR': {
        return args.length > 0 && args.some(Boolean);
      }
      case 'NOT': {
        return !args[0];
      }
      case 'COALESCE': {
        for (const a of args) {
          if (a !== null && a !== undefined) return a;
        }
        return null;
      }
      case 'CONCAT': {
        return args.map((a) => (a === null || a === undefined ? '' : String(a))).join('');
      }
      case 'LENGTH': {
        const val = args[0];
        if (typeof val === 'string' || Array.isArray(val)) return val.length;
        if (val && typeof val === 'object') return Object.keys(val).length;
        return 0;
      }
      case 'UPPER': {
        return String(args[0] ?? '').toUpperCase();
      }
      case 'LOWER': {
        return String(args[0] ?? '').toLowerCase();
      }
      case 'TRIM': {
        return String(args[0] ?? '').trim();
      }
      case 'SUM': {
        const items = Array.isArray(args[0]) ? args[0] : args;
        return items.reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
      }
      case 'COUNT': {
        if (Array.isArray(args[0])) return args[0].length;
        return args.filter((a) => a !== null && a !== undefined).length;
      }
      case 'AVERAGE':
      case 'AVG': {
        const items = Array.isArray(args[0]) ? args[0] : args;
        if (items.length === 0) return 0;
        const total = items.reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        return total / items.length;
      }
      case 'MIN': {
        const items = Array.isArray(args[0]) ? args[0] : args;
        if (items.length === 0) return 0;
        return Math.min(...items.map((v: any) => Number(v) || 0));
      }
      case 'MAX': {
        const items = Array.isArray(args[0]) ? args[0] : args;
        if (items.length === 0) return 0;
        return Math.max(...items.map((v: any) => Number(v) || 0));
      }
      case 'DATE': {
        const d = args[0] ? new Date(args[0]) : new Date();
        return isNaN(d.getTime()) ? '' : d.toISOString();
      }
      case 'FORMAT': {
        const [val, fmt] = args;
        if (typeof val === 'number') {
          if (fmt === 'currency') return `$${val.toFixed(2)}`;
          if (typeof fmt === 'number') return val.toFixed(fmt);
          return val.toLocaleString();
        }
        if (val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)))) {
          return new Date(val).toLocaleDateString();
        }
        return String(val ?? '');
      }
      case 'FILTER': {
        const [arr, propOrFn] = args;
        if (!Array.isArray(arr)) return [];
        if (typeof propOrFn === 'string') {
          return arr.filter((item) => Boolean(item?.[propOrFn]));
        }
        return arr.filter(Boolean);
      }
      case 'MAP': {
        const [arr, prop] = args;
        if (!Array.isArray(arr)) return [];
        if (typeof prop === 'string') {
          return arr.map((item) => item?.[prop]);
        }
        return arr;
      }
      default:
        throw new Error(`Unknown expression function: ${name}`);
    }
  }
}

/**
 * Strip double curly braces if present: {{expr}} -> expr
 */
export function normalizeExpressionString(raw: string): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

/**
 * Safe expression evaluator
 */
export function evaluateExpression(
  expression: string,
  context: EvaluationContext = {}
): EvaluationResult {
  try {
    if (!expression || typeof expression !== 'string') {
      return { success: true, value: expression };
    }

    const clean = normalizeExpressionString(expression);
    if (!clean) {
      return { success: true, value: '' };
    }

    // Security pre-check for malicious keywords
    for (const forbidden of Array.from(FORBIDDEN_PROPERTIES)) {
      const regex = new RegExp(`\\b${forbidden}\\b`);
      if (regex.test(clean)) {
        return {
          success: false,
          value: undefined,
          error: `Unsafe identifier or property rejected: ${forbidden}`,
        };
      }
    }


    const tokens = tokenize(clean);
    const parser = new ExpressionParser(tokens, context);
    const value = parser.parse();

    return {
      success: true,
      value,
    };
  } catch (err: any) {
    return {
      success: false,
      value: undefined,
      error: err.message || 'Expression evaluation error',
    };
  }
}

/**
 * Convenience helper to evaluate and return a display string or fallback
 */
export function evaluateToString(
  expression: string,
  context: EvaluationContext = {},
  fallback = ''
): string {
  const res = evaluateExpression(expression, context);
  if (!res.success || res.value === undefined || res.value === null) {
    return fallback;
  }
  return String(res.value);
}
