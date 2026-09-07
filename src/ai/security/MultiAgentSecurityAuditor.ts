// D8.16: Multi-Agent Security Auditor
// Comprehensive AST, code, prompt injection, credential leakage, RBAC, and isolation vulnerability scanner.

import { AppProject } from '../../builder/schema/project';
import { IntelligentPlan } from '../intelligence/types';
import { AISecretFilter } from './AISecretFilter';
import { PromptInjectionDefense } from './PromptInjectionDefense';
import {
  SecurityAuditContext,
  SecurityRiskLevel,
  SecurityScanResult,
  SecuritySeverity,
  SecurityThreatCategory,
  VulnerabilityFinding,
} from './security-types';

export class MultiAgentSecurityAuditor {
  private static readonly CODE_INJECTION_PATTERNS = [
    { pattern: /\beval\s*\(/i, message: 'Disallowed dynamic code evaluation (eval)' },
    { pattern: /\bnew\s+Function\s*\(/i, message: 'Disallowed dynamic function constructor (new Function)' },
    { pattern: /\bFunction\s*\([^)]*\)\s*\(/i, message: 'Disallowed anonymous Function invocation' },
    { pattern: /\bchild_process\b/i, message: 'Disallowed child_process module access' },
    { pattern: /\bexecSync\s*\(/i, message: 'Disallowed synchronous execution (execSync)' },
    { pattern: /\bspawnSync\s*\(/i, message: 'Disallowed synchronous process spawn (spawnSync)' },
    { pattern: /\bexecFile\s*\(/i, message: 'Disallowed file execution (execFile)' },
    { pattern: /\bfork\s*\(/i, message: 'Disallowed process forking (fork)' },
    { pattern: /\bworker_threads\b/i, message: 'Disallowed worker threads execution' },
    { pattern: /\bvm\.runInContext\b/i, message: 'Disallowed VM context execution (vm.runInContext)' },
    { pattern: /\bvm\.runInNewContext\b/i, message: 'Disallowed VM context execution (vm.runInNewContext)' },
    { pattern: /\bWebAssembly\.(compile|instantiate)\b/i, message: 'Disallowed WebAssembly dynamic compilation' },
    { pattern: /\bsetTimeout\s*\(\s*["'`]/i, message: 'Unsafe setTimeout string code execution' },
    { pattern: /\bsetInterval\s*\(\s*["'`]/i, message: 'Unsafe setInterval string code execution' },
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    { pattern: /\.\.[\/\\]/, message: 'Directory path traversal attempt (../ or ..\\)' },
    { pattern: /%2e%2e[%2f%5c]/i, message: 'URL-encoded path traversal attempt' },
    { pattern: /\/etc\/(passwd|shadow|hosts)/i, message: 'Attempt to access sensitive Unix system file (/etc/passwd, shadow, hosts)' },
    { pattern: /[a-zA-Z]:[/\\]+(windows|system32)/i, message: 'Attempt to access sensitive Windows system path (C:\\Windows)' },
    { pattern: /\/proc\/self/i, message: 'Attempt to access Linux process memory/environment' },
  ];

  private static readonly PROTOTYPE_POLLUTION_PATTERNS = [
    { pattern: /__proto__/i, message: 'Prototype pollution attempt targeting __proto__' },
    { pattern: /constructor\s*\.\s*prototype/i, message: 'Prototype pollution attempt targeting constructor.prototype' },
    { pattern: /(prototype\s*\[|\[\s*["'`]prototype["'`]\s*\])/i, message: 'Dynamic prototype indexing attempt' },
    { pattern: /Object\.setPrototypeOf\s*\(/i, message: 'Disallowed prototype reassignment via Object.setPrototypeOf' },
  ];

  private static readonly ADVERSARIAL_PROMPT_PATTERNS = [
    { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, message: 'Direct instruction override attempt' },
    { pattern: /system\s+override/i, message: 'System override instruction pattern' },
    { pattern: /disregard\s+(all\s+)?(safety|rules|instructions)/i, message: 'Safety rules disregard pattern' },
    { pattern: /you\s+are\s+now\s+in\s+(developer|unrestricted|god|dan)\s+mode/i, message: 'Adversarial jailbreak roleplay pattern' },
    { pattern: /\bDAN\b\s*(\d+(\.\d+)?)?/i, message: 'Known "Do Anything Now" (DAN) jailbreak payload' },
    { pattern: /repeat\s+(the\s+)?(above|system)\s+instructions\s+verbatim/i, message: 'System prompt exfiltration attempt' },
    { pattern: /output\s+(your\s+)?system\s+prompt/i, message: 'System prompt extraction instruction' },
    { pattern: /bypass\s+(rls|permissions?|authorization|guardrails)/i, message: 'Authorization / guardrail bypass command' },
    { pattern: /drop\s+table/i, message: 'SQL table dropping instruction' },
    { pattern: /delete\s+(all\s+)?(users|databases|collections)/i, message: 'Destructive database deletion instruction' },
  ];

  /**
   * Scans raw string code for execution, traversal, and prototype pollution vulnerabilities.
   */
  public static auditCodeString(code: string, context?: SecurityAuditContext): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    if (!code || typeof code !== 'string') {
      return this.buildResult(true, findings, startTime);
    }

    // 1. Code Injection
    for (const item of this.CODE_INJECTION_PATTERNS) {
      if (item.pattern.test(code)) {
        findings.push({
          findingId: `f_code_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'CODE_INJECTION',
          severity: 'CRITICAL',
          message: item.message,
          target: context?.projectId || 'code_snippet',
          snippet: this.extractSnippet(code, item.pattern),
          remediation: 'Remove all dynamic code execution. Use static declarative schemas instead.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Path Traversal
    for (const item of this.PATH_TRAVERSAL_PATTERNS) {
      if (item.pattern.test(code)) {
        findings.push({
          findingId: `f_traversal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'PATH_TRAVERSAL',
          severity: 'HIGH',
          message: item.message,
          target: context?.projectId || 'path_ref',
          snippet: this.extractSnippet(code, item.pattern),
          remediation: 'Enforce strict relative paths bounded within project root. Disallow parent folder traversal.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 3. Prototype Pollution
    for (const item of this.PROTOTYPE_POLLUTION_PATTERNS) {
      if (item.pattern.test(code)) {
        findings.push({
          findingId: `f_proto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'PROTOTYPE_POLLUTION',
          severity: 'HIGH',
          message: item.message,
          target: context?.projectId || 'object_props',
          snippet: this.extractSnippet(code, item.pattern),
          remediation: 'Do not allow access to __proto__ or constructor.prototype in dynamic payloads.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 4. Secret Leaks
    const secretAudit = this.auditSecrets(code);
    findings.push(...secretAudit.findings);

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Scans a ComponentNode AST (tags, props, styles, event handlers, and children) for XSS and security vulnerabilities.
   */
  public static auditComponent(component: any, context?: SecurityAuditContext): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    if (!component || typeof component !== 'object') {
      return this.buildResult(true, findings, startTime);
    }

    const traverse = (node: any, pathStr: string) => {
      if (!node || typeof node !== 'object') return;

      const nodeId = node.id || node.name || pathStr;
      const tag = (node.type || node.tag || '').toLowerCase();

      // Check dangerous HTML tags
      const dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'base'];
      if (dangerousTags.includes(tag)) {
        findings.push({
          findingId: `f_ast_tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'UNSAFE_COMPONENT_PROPS',
          severity: 'CRITICAL',
          message: `Disallowed dangerous HTML element tag: <${tag}>`,
          target: `${pathStr}[${tag}]`,
          snippet: `<${tag} id="${nodeId}">`,
          remediation: 'Replace unsafe raw script/embed tags with sandboxed visual builder components.',
          detectedAt: new Date().toISOString(),
        });
      }

      // Check Props
      if (node.props && typeof node.props === 'object') {
        const rawPropsStr = JSON.stringify(node.props);
        if (/"__proto__"\s*:/i.test(rawPropsStr) || /"constructor"\s*:/i.test(rawPropsStr)) {
          findings.push({
            findingId: `f_ast_proto_raw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: 'PROTOTYPE_POLLUTION',
            severity: 'HIGH',
            message: 'Prototype pollution target property name detected in component props',
            target: `${pathStr}.props`,
            remediation: 'Strip forbidden prototype keys from component properties.',
            detectedAt: new Date().toISOString(),
          });
        }

        for (const [propKey, propVal] of Object.entries(node.props)) {
          const lowerKey = propKey.toLowerCase();
          const valStr = typeof propVal === 'string' ? propVal : JSON.stringify(propVal);

          // DangerouslySetInnerHTML
          if (lowerKey === 'dangerouslysetinnerhtml') {
            findings.push({
              findingId: `f_ast_danger_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              category: 'UNSAFE_COMPONENT_PROPS',
              severity: 'CRITICAL',
              message: 'Forbidden dangerouslySetInnerHTML property detected',
              target: `${pathStr}.props.${propKey}`,
              snippet: valStr.substring(0, 100),
              remediation: 'Use sanitized text children or structured nodes instead of raw HTML injection.',
              detectedAt: new Date().toISOString(),
            });
          }

          // javascript: URIs in href, src, action
          if (['href', 'src', 'action', 'formaction'].includes(lowerKey)) {
            if (typeof propVal === 'string' && /^\s*javascript\s*:/i.test(propVal)) {
              findings.push({
                findingId: `f_ast_jsuri_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                category: 'UNSAFE_COMPONENT_PROPS',
                severity: 'CRITICAL',
                message: `Dangerous javascript: URI detected in prop ${propKey}`,
                target: `${pathStr}.props.${propKey}`,
                snippet: propVal.substring(0, 100),
                remediation: 'Use valid http/https URLs or safe internal action references.',
                detectedAt: new Date().toISOString(),
              });
            }
          }

          // Inline event handler attributes (onerror, onload, onclick with inline JS)
          if (/^on[a-z]+/i.test(lowerKey) && typeof propVal === 'string') {
            const inlineScriptAudit = this.auditCodeString(propVal);
            if (!inlineScriptAudit.safe || /<script|alert\(|document\.cookie/i.test(propVal)) {
              findings.push({
                findingId: `f_ast_handler_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                category: 'UNSAFE_COMPONENT_PROPS',
                severity: 'HIGH',
                message: `Suspicious or malicious script inside inline event handler prop ${propKey}`,
                target: `${pathStr}.props.${propKey}`,
                snippet: propVal.substring(0, 100),
                remediation: 'Use declarative workflow action triggers instead of raw JavaScript event handlers.',
                detectedAt: new Date().toISOString(),
              });
            }
          }

          // Prototype pollution in prop keys
          if (lowerKey === '__proto__' || lowerKey === 'constructor' || lowerKey === 'prototype') {
            findings.push({
              findingId: `f_ast_proto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              category: 'PROTOTYPE_POLLUTION',
              severity: 'HIGH',
              message: `Prototype pollution target property name detected: ${propKey}`,
              target: `${pathStr}.props.${propKey}`,
              remediation: 'Strip forbidden prototype keys from component properties.',
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Check Styles
      if (node.styles && typeof node.styles === 'object') {
        for (const [styleKey, styleVal] of Object.entries(node.styles)) {
          if (typeof styleVal === 'string') {
            if (/expression\s*\(/i.test(styleVal) || /url\s*\(\s*["']?javascript:/i.test(styleVal) || /@import/i.test(styleVal)) {
              findings.push({
                findingId: `f_ast_style_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                category: 'UNSAFE_COMPONENT_PROPS',
                severity: 'HIGH',
                message: `Malicious CSS pattern (expression / javascript: URL / @import) detected in style ${styleKey}`,
                target: `${pathStr}.styles.${styleKey}`,
                snippet: styleVal,
                remediation: 'Disallow dynamic expressions or script execution in CSS styles.',
                detectedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      // Traverse children recursively
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any, idx: number) => {
          traverse(child, `${pathStr}.children[${idx}]`);
        });
      }
    };

    traverse(component, component.id || 'root');
    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Scans agent prompts for direct, multi-turn, delimiter, and obfuscated jailbreak attacks.
   */
  public static auditAgentPrompt(prompt: string, role?: string, context?: SecurityAuditContext): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    if (!prompt || typeof prompt !== 'string') {
      return this.buildResult(true, findings, startTime);
    }

    // 1. Direct and multi-turn jailbreak patterns
    for (const item of this.ADVERSARIAL_PROMPT_PATTERNS) {
      if (item.pattern.test(prompt)) {
        findings.push({
          findingId: `f_prompt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'PROMPT_INJECTION',
          severity: 'CRITICAL',
          message: item.message,
          target: context?.projectId || 'prompt',
          snippet: this.extractSnippet(prompt, item.pattern),
          remediation: 'Reject instruction and enforce active boundary guardrails.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 2. Delimiter breakout attempts
    if (/<\/untrusted_data>/i.test(prompt) || /\[SYSTEM INSTRUCTION\]/i.test(prompt) || /===END RULES===/i.test(prompt)) {
      findings.push({
        findingId: `f_delim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'PROMPT_INJECTION',
        severity: 'HIGH',
        message: 'Delimiter breakout attempt detected in prompt',
        target: 'prompt_delimiter',
        remediation: 'Sanitize boundary delimiters before passing untrusted text to LLM context.',
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Obfuscation Scanning: Unicode Zero-Width Characters
    const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF]/g;
    if (zeroWidthRegex.test(prompt)) {
      // Strip zero-width and re-test against patterns
      const normalized = prompt.replace(zeroWidthRegex, '');
      const strippedHasAttack = this.ADVERSARIAL_PROMPT_PATTERNS.some((p) => p.pattern.test(normalized));
      if (strippedHasAttack) {
        findings.push({
          findingId: `f_zw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'PROMPT_INJECTION',
          severity: 'CRITICAL',
          message: 'Obfuscated prompt injection detected using Unicode zero-width space evasion',
          target: 'prompt_obfuscation',
          remediation: 'Strip all zero-width characters before evaluating prompt safety.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // 4. Obfuscation Scanning: Base64 Payloads
    const base64Words = prompt.match(/[A-Za-z0-9+/=]{20,}/g) || [];
    for (const b64 of base64Words) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        // Check if decoded contains printable text with injection
        if (/^[ -~\t\n\r]+$/.test(decoded)) {
          const hasInjected = this.ADVERSARIAL_PROMPT_PATTERNS.some((p) => p.pattern.test(decoded)) ||
            this.CODE_INJECTION_PATTERNS.some((p) => p.pattern.test(decoded));
          if (hasInjected) {
            findings.push({
              findingId: `f_b64_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              category: 'PROMPT_INJECTION',
              severity: 'CRITICAL',
              message: 'Obfuscated Base64 attack payload detected in prompt',
              target: 'prompt_base64',
              snippet: decoded.substring(0, 80),
              remediation: 'Block base64 payload evasion and drop request.',
              detectedAt: new Date().toISOString(),
            });
            break;
          }
        }
      } catch {}
    }

    // 5. Obfuscation Scanning: Hex sequences
    const hexMatch = prompt.match(/(\\x[0-9a-fA-F]{2}){4,}/g) || prompt.match(/(0x[0-9a-fA-F]{2}[,\s]*){4,}/g);
    if (hexMatch) {
      try {
        const hexStr = hexMatch[0].replace(/\\x|0x|[\s,]/g, '');
        const decoded = Buffer.from(hexStr, 'hex').toString('utf-8');
        if (this.ADVERSARIAL_PROMPT_PATTERNS.some((p) => p.pattern.test(decoded))) {
          findings.push({
            findingId: `f_hex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: 'PROMPT_INJECTION',
            severity: 'CRITICAL',
            message: 'Obfuscated Hexadecimal attack payload detected in prompt',
            target: 'prompt_hex',
            snippet: decoded.substring(0, 80),
            remediation: 'Decode and reject obfuscated hex sequences.',
            detectedAt: new Date().toISOString(),
          });
        }
      } catch {}
    }

    // 6. Secret leaks in prompt
    const secretAudit = this.auditSecrets(prompt);
    findings.push(...secretAudit.findings);

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Scans strings or structured objects for credentials, API keys, tokens, and database passwords.
   */
  public static auditSecrets(input: any): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];
    const text = typeof input === 'string' ? input : JSON.stringify(input);

    const secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9_\-]{20,}/i, name: 'OpenAI Secret Key' },
      { pattern: /claude-[a-zA-Z0-9]{20,}/i, name: 'Anthropic API Key' },
      { pattern: /AIza[0-9A-Za-z-_]{35}/i, name: 'Google API Key' },
      { pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{16,}/i, name: 'Bearer Token' },
      { pattern: /postgres:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/i, name: 'Postgres DB Password URI' },
      { pattern: /mongodb(\+srv)?:\/\/[^@\n]+:[^@\n]+@[^\/\n]+/i, name: 'MongoDB Password URI' },
      { pattern: /(password|secret|apikey|api_key|service_role|access_token|private_key)["']?\s*[:=]\s*["']?([^"' \n\r]{8,})/i, name: 'Cleartext Key/Token Assignment' },
    ];

    for (const sp of secretPatterns) {
      if (sp.pattern.test(text)) {
        findings.push({
          findingId: `f_secret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'CREDENTIAL_LEAK',
          severity: 'HIGH',
          message: `Sensitive credential leak detected: ${sp.name}`,
          target: 'secret_pattern',
          snippet: '[REDACTED_CREDENTIAL]',
          remediation: 'Pass credentials via secure environment variables or vault references. Redact before logging.',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Verifies Role-Based Access Control (RBAC) boundaries.
   * Disallows viewers and auditors from performing any state-mutating operations.
   */
  public static auditRBAC(actorRole: string, operations: any[], project: AppProject): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];
    const normalizedRole = (actorRole || 'viewer').toLowerCase();

    const mutatingOpTypes = [
      'create_component',
      'delete_component',
      'modify_properties',
      'move_component',
      'add_page',
      'delete_page',
      'set_app_settings',
      'bind_data',
      'update_theme',
      'import_schema',
    ];

    if (normalizedRole === 'viewer' || normalizedRole === 'auditor') {
      for (const op of operations) {
        const opType = (op.type || op.operationType || '').toLowerCase();
        if (mutatingOpTypes.includes(opType) || opType.startsWith('mutate_') || opType.startsWith('create_') || opType.startsWith('delete_')) {
          findings.push({
            findingId: `f_rbac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: 'PRIVILEGE_ESCALATION',
            severity: 'CRITICAL',
            message: `Role "${actorRole}" is not authorized to execute mutating operation: ${opType}`,
            target: `role:${actorRole}`,
            snippet: JSON.stringify(op).substring(0, 100),
            remediation: 'Upgrade user permissions or require admin delegation to mutate project entities.',
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Ensures strict cross-project tenant isolation.
   * Rejects any operations or entity references targeting foreign project IDs.
   */
  public static auditCrossProjectIsolation(sourceProjectId: string, targets: any[]): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    for (const target of targets) {
      const targetStr = typeof target === 'string' ? target : JSON.stringify(target);
      // Check for foreign project ID references (e.g. "proj_other", "proj_foreign", or mismatched UUIDs)
      const foreignMatches = targetStr.match(/proj_[a-zA-Z0-9_\-]+/g) || [];
      for (const foreignId of foreignMatches) {
        if (foreignId !== sourceProjectId && foreignId !== 'proj_default') {
          findings.push({
            findingId: `f_iso_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: 'CROSS_PROJECT_ACCESS',
            severity: 'CRITICAL',
            message: `Cross-project isolation breach: attempted access to foreign project entity "${foreignId}" from "${sourceProjectId}"`,
            target: foreignId,
            snippet: targetStr.substring(0, 100),
            remediation: 'Restrict all operation targets strictly to current active projectId.',
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Audits an entire IntelligentPlan before execution.
   */
  public static auditPlan(plan: IntelligentPlan, context?: SecurityAuditContext): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    if (!plan) {
      return this.buildResult(true, findings, startTime);
    }

    // Audit each step's operation and rollback strategy
    for (const step of plan.steps || []) {
      if (!['undo_operation', 'restore_snapshot', 'prune_orphaned_entity'].includes(step.rollbackStrategy)) {
        findings.push({
          findingId: `f_plan_rollback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'CODE_INJECTION',
          severity: 'HIGH',
          message: `Step ${step.stepId} declared unsafe rollback strategy: ${step.rollbackStrategy}`,
          target: step.stepId,
          remediation: 'Provide an atomic reversible rollback strategy (undo_operation or restore_snapshot).',
          detectedAt: new Date().toISOString(),
        });
      }

      if (step.operation) {
        // Audit operation code, strings, and payloads
        const opStr = JSON.stringify(step.operation);
        const opScan = this.auditCodeString(opStr, context);
        findings.push(...opScan.findings);

        // Audit AST node if present in operation payload or node field
        const opAny = step.operation as any;
        const targetNode = opAny?.payload?.node || opAny?.payload?.component || opAny?.node || opAny?.component;
        if (targetNode) {
          const compScan = this.auditComponent(targetNode, context);
          findings.push(...compScan.findings);
        }

        // Cross-project check on operation payload
        if (context?.projectId) {
          const isoScan = this.auditCrossProjectIsolation(context.projectId, [step.operation]);
          findings.push(...isoScan.findings);
        }
      }
    }

    // RBAC check if actorRole is specified in context
    if (context?.actorRole) {
      const rbacScan = this.auditRBAC(context.actorRole, plan.steps.map((s) => s.operation).filter(Boolean), {} as any);
      findings.push(...rbacScan.findings);
    }

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Audits an entire AppProject tree.
   */
  public static auditProject(project: AppProject, context?: SecurityAuditContext): SecurityScanResult {
    const startTime = Date.now();
    const findings: VulnerabilityFinding[] = [];

    if (!project) {
      return this.buildResult(true, findings, startTime);
    }

    // Audit project stringified representation for secrets and dynamic execution
    const codeScan = this.auditCodeString(JSON.stringify(project), { projectId: project.id });
    findings.push(...codeScan.findings);

    // Audit each page's root component AST
    for (const page of project.pages || []) {
      if (page.root) {
        const compScan = this.auditComponent(page.root, { projectId: project.id });
        findings.push(...compScan.findings);
      }
    }

    return this.buildResult(findings.length === 0, findings, startTime);
  }

  /**
   * Assesses whether an immediate session quarantine should be triggered.
   */
  public static assessQuarantine(scanResult: SecurityScanResult): { quarantine: boolean; reason?: string } {
    if (scanResult.safe) {
      return { quarantine: false };
    }

    const hasCritical = scanResult.findings.some((f) => f.severity === 'CRITICAL');
    const highCount = scanResult.findings.filter((f) => f.severity === 'HIGH').length;

    if (hasCritical) {
      const critFinding = scanResult.findings.find((f) => f.severity === 'CRITICAL');
      return {
        quarantine: true,
        reason: `Critical security violation detected: ${critFinding?.message}`,
      };
    }

    if (highCount >= 2) {
      return {
        quarantine: true,
        reason: `Multiple high-severity security violations (${highCount}) detected`,
      };
    }

    return { quarantine: false };
  }

  /**
   * Quantitative risk scoring from 0.0 (catastrophic) to 10.0 (completely secure).
   */
  public static calculateRiskScore(findings: VulnerabilityFinding[]): { score: number; riskLevel: SecurityRiskLevel } {
    if (findings.length === 0) {
      return { score: 10.0, riskLevel: 'NONE' };
    }

    let penalty = 0;
    for (const f of findings) {
      switch (f.severity) {
        case 'CRITICAL':
          penalty += 4.5;
          break;
        case 'HIGH':
          penalty += 2.5;
          break;
        case 'MEDIUM':
          penalty += 1.0;
          break;
        case 'LOW':
          penalty += 0.3;
          break;
        case 'INFO':
          penalty += 0.05;
          break;
      }
    }

    const score = Math.max(0.0, Math.round((10.0 - penalty) * 10) / 10);

    let riskLevel: SecurityRiskLevel = 'LOW';
    if (findings.some((f) => f.severity === 'CRITICAL') || score <= 2.0) {
      riskLevel = 'CRITICAL';
    } else if (findings.some((f) => f.severity === 'HIGH') || score <= 5.0) {
      riskLevel = 'HIGH';
    } else if (findings.some((f) => f.severity === 'MEDIUM') || score <= 7.5) {
      riskLevel = 'MEDIUM';
    } else if (findings.length > 0) {
      riskLevel = 'LOW';
    } else {
      riskLevel = 'NONE';
    }

    return { score, riskLevel };
  }

  private static buildResult(
    safe: boolean,
    findings: VulnerabilityFinding[],
    startTime: number
  ): SecurityScanResult {
    const { score, riskLevel } = this.calculateRiskScore(findings);
    const quarantine = this.assessQuarantine({
      safe: findings.length === 0,
      score,
      riskLevel,
      findings,
      quarantineRecommended: false,
      scanTimestamp: new Date().toISOString(),
      durationMs: 0,
    });

    return {
      safe: findings.length === 0,
      score,
      riskLevel,
      findings,
      quarantineRecommended: quarantine.quarantine,
      scanTimestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  private static extractSnippet(text: string, regex: RegExp): string {
    const match = text.match(regex);
    if (!match || match.index === undefined) return text.substring(0, 80);
    const start = Math.max(0, match.index - 20);
    const end = Math.min(text.length, match.index + match[0].length + 20);
    return text.substring(start, end);
  }
}
