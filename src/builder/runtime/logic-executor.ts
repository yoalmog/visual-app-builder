import { ActionDefinition, Condition, ConditionGroup, LogicRule } from '../schema/component';
import { evaluateExpression, EvaluationContext } from '../expressions/expression-evaluator';
import { useRuntimeStore } from './runtime-store';
import { MockAuthProvider } from '../providers/auth-provider';

export const sharedAuthProvider = new MockAuthProvider();

/**
 * Evaluate a single condition against the evaluation context
 */
export function evaluateCondition(condition: Condition, ctx: EvaluationContext): boolean {
  if (!condition) return true;

  // Resolve left-hand operand: either an expression {{...}}, variable lookup, or raw value
  const operandLeft = condition.left !== undefined ? condition.left : (condition as any).field;
  let leftVal: any = operandLeft;
  if (typeof operandLeft === 'string' && operandLeft.includes('{{')) {
    const res = evaluateExpression(operandLeft, ctx);
    leftVal = res.success ? res.value : operandLeft;
  } else if (typeof operandLeft === 'string' && ctx && Object.prototype.hasOwnProperty.call(ctx, operandLeft)) {
    leftVal = ctx[operandLeft];
  } else if (typeof operandLeft === 'string' && ctx?.variables && Object.prototype.hasOwnProperty.call(ctx.variables, operandLeft)) {
    leftVal = ctx.variables[operandLeft];
  }

  // Resolve right-hand operand if applicable
  let rightVal: any = condition.right;
  if (typeof condition.right === 'string' && condition.right.includes('{{')) {
    const res = evaluateExpression(condition.right, ctx);
    rightVal = res.success ? res.value : condition.right;
  } else if (typeof condition.right === 'string' && ctx && Object.prototype.hasOwnProperty.call(ctx, condition.right)) {
    rightVal = ctx[condition.right];
  } else if (typeof condition.right === 'string' && ctx?.variables && Object.prototype.hasOwnProperty.call(ctx.variables, condition.right)) {
    rightVal = ctx.variables[condition.right];
  }

  switch (condition.operator) {
    case 'equals':
      // eslint-disable-next-line eqeqeq
      return leftVal == rightVal;

    case 'not_equals':
      // eslint-disable-next-line eqeqeq
      return leftVal != rightVal;

    case 'contains':
      if (typeof leftVal === 'string' || Array.isArray(leftVal)) {
        return leftVal.includes(rightVal);
      }
      return false;

    case 'starts_with':
      return typeof leftVal === 'string' && leftVal.startsWith(String(rightVal));

    case 'ends_with':
      return typeof leftVal === 'string' && leftVal.endsWith(String(rightVal));

    case 'greater_than':
      return Number(leftVal) > Number(rightVal);

    case 'less_than':
      return Number(leftVal) < Number(rightVal);

    case 'greater_equal':
      return Number(leftVal) >= Number(rightVal);

    case 'less_equal':
      return Number(leftVal) <= Number(rightVal);

    case 'is_empty':
      return (
        leftVal === undefined ||
        leftVal === null ||
        leftVal === '' ||
        (Array.isArray(leftVal) && leftVal.length === 0)
      );

    case 'is_not_empty':
      return (
        leftVal !== undefined &&
        leftVal !== null &&
        leftVal !== '' &&
        (!Array.isArray(leftVal) || leftVal.length > 0)
      );

    case 'is_true':
      return Boolean(leftVal) === true;

    case 'is_false':
      return Boolean(leftVal) === false;

    default:
      return true;
  }
}

/**
 * Evaluate a group of conditions (ALL or ANY)
 */
export function evaluateConditionGroup(group: ConditionGroup | undefined, ctx: EvaluationContext): boolean {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return true;
  }

  if (group.type === 'any') {
    return group.conditions.some((cond) => evaluateCondition(cond, ctx));
  }

  // Default to 'all'
  return group.conditions.every((cond) => evaluateCondition(cond, ctx));
}

/**
 * Validate URL to prevent unsafe schemes
 */
export function isValidUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Execute a single action definition
 */
export async function executeAction(
  action: ActionDefinition,
  ctx: EvaluationContext,
  eventName = 'action'
): Promise<{ success: boolean; error?: string }> {
  const runtime = useRuntimeStore.getState();

  try {
    switch (action.type) {
      case 'set_variable': {
        if (!action.variableName) {
          runtime.recordTrace({
            event: eventName,
            actionType: 'set_variable',
            status: 'FAIL',
            message: 'Missing variable name',
          });
          return { success: false, error: 'Missing variable name' };
        }

        let resolvedVal = action.valueExpression;
        if (typeof action.valueExpression === 'string') {
          if (action.valueExpression.includes('{{')) {
            const trimmed = action.valueExpression.trim();
            if (trimmed.startsWith('{{') && trimmed.endsWith('}}') && !trimmed.slice(2, -2).includes('{{')) {
              const evalRes = evaluateExpression(trimmed, ctx);
              resolvedVal = evalRes.success ? evalRes.value : action.valueExpression;
            } else {
              // Interpolate embedded {{expr}}
              resolvedVal = action.valueExpression.replace(/\{\{([^}]+)\}\}/g, (_, inner) => {
                const evalRes = evaluateExpression(inner.trim(), ctx);
                return evalRes.success && evalRes.value !== undefined ? String(evalRes.value) : '';
              });
            }
          } else if (action.valueExpression === 'true') {
            resolvedVal = true;
          } else if (action.valueExpression === 'false') {
            resolvedVal = false;
          } else if (action.valueExpression === 'null') {
            resolvedVal = null;
          } else {
            resolvedVal = action.valueExpression;
          }
        }

        runtime.setVariable(action.variableName, resolvedVal);
        ctx[action.variableName] = resolvedVal; // update context in-flight for chain

        runtime.recordTrace({
          event: eventName,
          actionType: 'set_variable',
          target: action.variableName,
          status: 'PASS',
          message: `Variable '${action.variableName}' set to ${JSON.stringify(resolvedVal)}`,
        });
        return { success: true };
      }

      case 'navigate': {
        const targetPage = action.targetPageId || action.pageId;
        if (!targetPage) {
          runtime.recordTrace({
            event: eventName,
            actionType: 'navigate',
            status: 'FAIL',
            message: 'Missing target page ID',
          });
          return { success: false, error: 'Missing target page ID' };
        }

        runtime.navigate(targetPage);
        runtime.recordTrace({
          event: eventName,
          actionType: 'navigate',
          target: targetPage,
          status: 'PASS',
          message: `Navigated to page '${targetPage}'`,
        });
        return { success: true };
      }

      case 'open_url': {
        if (!action.url || !isValidUrl(action.url)) {
          runtime.recordTrace({
            event: eventName,
            actionType: 'open_url',
            status: 'FAIL',
            message: 'Invalid or unsafe URL scheme',
          });
          return { success: false, error: 'Invalid or unsafe URL scheme' };
        }

        if (typeof window !== 'undefined' && typeof window.open === 'function') {
          window.open(action.url, action.target || '_blank');
        }

        runtime.recordTrace({
          event: eventName,
          actionType: 'open_url',
          target: action.url,
          status: 'PASS',
          message: `Opened URL '${action.url}'`,
        });
        return { success: true };
      }

      case 'show_element': {
        if (!action.targetNodeId) {
          return { success: false, error: 'Missing targetNodeId' };
        }
        runtime.setVisibleOverride(action.targetNodeId, true);
        runtime.recordTrace({
          event: eventName,
          actionType: 'show_element',
          target: action.targetNodeId,
          status: 'PASS',
          message: `Show element '${action.targetNodeId}'`,
        });
        return { success: true };
      }

      case 'hide_element': {
        if (!action.targetNodeId) {
          return { success: false, error: 'Missing targetNodeId' };
        }
        runtime.setVisibleOverride(action.targetNodeId, false);
        runtime.recordTrace({
          event: eventName,
          actionType: 'hide_element',
          target: action.targetNodeId,
          status: 'PASS',
          message: `Hide element '${action.targetNodeId}'`,
        });
        return { success: true };
      }

      case 'toggle_element': {
        if (!action.targetNodeId) {
          return { success: false, error: 'Missing targetNodeId' };
        }
        runtime.toggleVisibleOverride(action.targetNodeId);
        runtime.recordTrace({
          event: eventName,
          actionType: 'toggle_element',
          target: action.targetNodeId,
          status: 'PASS',
          message: `Toggle element '${action.targetNodeId}'`,
        });
        return { success: true };
      }

      case 'create_record': {
        if (!action.collectionId) {
          return { success: false, error: 'Missing collectionId' };
        }

        // Resolve any dynamic expressions in record values
        const resolvedValues: Record<string, any> = {};
        for (const [k, v] of Object.entries(action.recordValues || {})) {
          if (typeof v === 'string' && v.includes('{{')) {
            resolvedValues[k] = evaluateExpression(v, ctx).value;
          } else {
            resolvedValues[k] = v;
          }
        }

        const res = runtime.createRecord(action.collectionId, resolvedValues);
        if (!res.success) {
          if (action.id) {
            runtime.setError(action.id, res.error || 'Failed to create record');
          }
          runtime.recordTrace({
            event: eventName,
            actionType: 'create_record',
            target: action.collectionId,
            status: 'FAIL',
            message: res.error || 'Failed to create record',
          });
          return { success: false, error: res.error };
        }

        runtime.recordTrace({
          event: eventName,
          actionType: 'create_record',
          target: action.collectionId,
          status: 'PASS',
          message: `Created record in '${action.collectionId}' (id: ${res.id})`,
        });
        return { success: true };
      }

      case 'update_record': {
        if (!action.collectionId || !action.recordId) {
          return { success: false, error: 'Missing collectionId or recordId' };
        }

        const resolvedValues: Record<string, any> = {};
        for (const [k, v] of Object.entries(action.recordValues || {})) {
          if (typeof v === 'string' && v.includes('{{')) {
            resolvedValues[k] = evaluateExpression(v, ctx).value;
          } else {
            resolvedValues[k] = v;
          }
        }

        const res = runtime.updateRecord(action.collectionId, action.recordId, resolvedValues);
        if (!res.success) {
          runtime.recordTrace({
            event: eventName,
            actionType: 'update_record',
            target: action.recordId,
            status: 'FAIL',
            message: res.error || 'Failed to update record',
          });
          return { success: false, error: res.error };
        }

        runtime.recordTrace({
          event: eventName,
          actionType: 'update_record',
          target: action.recordId,
          status: 'PASS',
          message: `Updated record '${action.recordId}'`,
        });
        return { success: true };
      }

      case 'delete_record': {
        if (!action.collectionId || !action.recordId) {
          return { success: false, error: 'Missing collectionId or recordId' };
        }

        runtime.deleteRecord(action.collectionId, action.recordId);
        runtime.recordTrace({
          event: eventName,
          actionType: 'delete_record',
          target: action.recordId,
          status: 'PASS',
          message: `Deleted record '${action.recordId}' from '${action.collectionId}'`,
        });
        return { success: true };
      }

      case 'submit_form': {
        // Form submission: validates fields in the form
        // If a form field is invalid, submission is aborted
        const formStates = runtime.forms;
        let hasErrors = false;
        let errorMsg = '';

        for (const [nodeId, fieldState] of Object.entries(formStates)) {
          if (!fieldState.valid) {
            hasErrors = true;
            errorMsg = fieldState.error || `Field ${nodeId} is invalid`;
            break;
          }
        }

        if (hasErrors) {
          runtime.recordTrace({
            event: eventName,
            actionType: 'submit_form',
            status: 'FAIL',
            message: `Form validation failed: ${errorMsg}`,
          });
          return { success: false, error: errorMsg };
        }

        runtime.recordTrace({
          event: eventName,
          actionType: 'submit_form',
          status: 'PASS',
          message: 'Form submitted successfully',
        });
        return { success: true };
      }

      case 'reset_form': {
        runtime.resetForm();
        runtime.recordTrace({
          event: eventName,
          actionType: 'reset_form',
          status: 'PASS',
          message: 'Form reset',
        });
        return { success: true };
      }

      case 'delay': {
        const ms = action.delayMs || 100;
        await new Promise((resolve) => setTimeout(resolve, ms));
        runtime.recordTrace({
          event: eventName,
          actionType: 'delay',
          status: 'PASS',
          message: `Delayed ${ms}ms`,
        });
        return { success: true };
      }

      // ── Phase 5 Actions ──────────────────────────────────────────────────

      case 'call_api': {
        if (!action.connectorId) {
          runtime.recordTrace({ event: eventName, actionType: 'call_api', status: 'FAIL', message: 'Missing connectorId' });
          return { success: false, error: 'Missing connectorId' };
        }
        runtime.setApiLoading(action.connectorId, true);
        const start5 = Date.now();
        try {
          const proxyRes = await fetch('/api/connectors/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectorId: action.connectorId,
              method: action.method || 'GET',
              path: action.path || '/',
              headers: action.requestHeaders || {},
              body: action.requestBody,
            }),
          });
          const durationMs = Date.now() - start5;
          let responseData: any;
          try { responseData = await proxyRes.json(); } catch { responseData = null; }

          runtime.recordNetworkTrace({
            type: 'API',
            method: action.method || 'GET',
            label: `call_api: ${action.connectorId}`,
            status: proxyRes.status,
            durationMs,
            success: proxyRes.ok,
            error: proxyRes.ok ? undefined : `HTTP ${proxyRes.status}`,
          });

          if (proxyRes.ok) {
            runtime.setApiResponse(action.connectorId, { data: responseData, status: proxyRes.status, loading: false });
            if (action.onSuccess && Array.isArray(action.onSuccess)) {
              await executeActionChain(action.onSuccess, { ...ctx, apiResponse: responseData }, eventName);
            }
            runtime.recordTrace({ event: eventName, actionType: 'call_api', target: action.connectorId, status: 'PASS', message: `API call succeeded (${proxyRes.status})` });
            return { success: true };
          } else {
            runtime.setApiResponse(action.connectorId, { data: null, status: proxyRes.status, loading: false, error: `HTTP ${proxyRes.status}` });
            if (action.onError && Array.isArray(action.onError) && action.abortOnError !== false) {
              await executeActionChain(action.onError, ctx, eventName);
            }
            runtime.recordTrace({ event: eventName, actionType: 'call_api', target: action.connectorId, status: 'FAIL', message: `API call failed (${proxyRes.status})` });
            return { success: false, error: `API call failed: HTTP ${proxyRes.status}` };
          }
        } catch (fetchErr: any) {
          runtime.setApiResponse(action.connectorId, { data: null, loading: false, error: fetchErr.message });
          runtime.recordTrace({ event: eventName, actionType: 'call_api', target: action.connectorId, status: 'FAIL', message: fetchErr.message });
          return { success: false, error: fetchErr.message };
        }
      }

      case 'create_cloud_record': {
        if (!action.collectionId) return { success: false, error: 'Missing collectionId' };
        // Resolve values like create_record
        const resolvedVals: Record<string, any> = {};
        for (const [k, v] of Object.entries(action.recordValues || {})) {
          if (typeof v === 'string' && v.includes('{{')) {
            resolvedVals[k] = evaluateExpression(v, ctx).value;
          } else {
            resolvedVals[k] = v;
          }
        }
        // Delegate to local runtime for now (cloud provider would be invoked at render level)
        const cloudRes = runtime.createRecord(action.collectionId, resolvedVals);
        runtime.recordNetworkTrace({ type: 'DATABASE', label: `create_cloud_record: ${action.collectionId}`, success: cloudRes.success, error: cloudRes.error });
        runtime.recordTrace({ event: eventName, actionType: 'create_cloud_record', target: action.collectionId, status: cloudRes.success ? 'PASS' : 'FAIL', message: cloudRes.error || `Cloud record created (id: ${cloudRes.id})` });
        return cloudRes;
      }

      case 'update_cloud_record': {
        if (!action.collectionId || !action.recordId) return { success: false, error: 'Missing collectionId or recordId' };
        const resolvedVals: Record<string, any> = {};
        for (const [k, v] of Object.entries(action.recordValues || {})) {
          if (typeof v === 'string' && v.includes('{{')) {
            resolvedVals[k] = evaluateExpression(v, ctx).value;
          } else {
            resolvedVals[k] = v;
          }
        }
        const updateRes = runtime.updateRecord(action.collectionId, action.recordId, resolvedVals);
        runtime.recordNetworkTrace({ type: 'DATABASE', label: `update_cloud_record: ${action.recordId}`, success: updateRes.success, error: updateRes.error });
        runtime.recordTrace({ event: eventName, actionType: 'update_cloud_record', target: action.recordId, status: updateRes.success ? 'PASS' : 'FAIL', message: updateRes.error || 'Cloud record updated' });
        return updateRes;
      }

      case 'delete_cloud_record': {
        if (!action.collectionId || !action.recordId) return { success: false, error: 'Missing collectionId or recordId' };
        const deleteRes = runtime.deleteRecord(action.collectionId, action.recordId);
        runtime.recordNetworkTrace({ type: 'DATABASE', label: `delete_cloud_record: ${action.recordId}`, success: deleteRes.success, error: deleteRes.error });
        runtime.recordTrace({ event: eventName, actionType: 'delete_cloud_record', target: action.recordId, status: deleteRes.success ? 'PASS' : 'FAIL', message: 'Cloud record deleted' });
        return deleteRes;
      }

      case 'refresh_data_source': {
        const collectionId = action.collectionId || '';
        runtime.setCloudLoading(collectionId, true);
        runtime.recordTrace({ event: eventName, actionType: 'refresh_data_source', target: collectionId, status: 'PASS', message: `Data source refresh triggered for '${collectionId}'` });
        runtime.setCloudLoading(collectionId, false);
        return { success: true };
      }

      case 'auth_login': {
        const email = action.email || '';
        const password = action.password || '';
        if (!email || !password) {
          runtime.recordTrace({ event: eventName, actionType: 'auth_login', status: 'FAIL', message: 'Missing email or password' });
          if (action.onError && Array.isArray(action.onError)) {
            await executeActionChain(action.onError, ctx, eventName);
          }
          return { success: false, error: 'Missing email or password' };
        }
        const res = await sharedAuthProvider.login(email, password);
        if (res.success && res.user) {
          runtime.setCurrentUser(res.user);
          if (res.session) runtime.setSession(res.session);
          runtime.recordNetworkTrace({ type: 'AUTH', label: `auth_login: ${email.substring(0, 3)}***`, success: true });
          runtime.recordTrace({ event: eventName, actionType: 'auth_login', status: 'PASS', message: 'Auth login succeeded' });
          if (action.onSuccess && Array.isArray(action.onSuccess)) {
            await executeActionChain(action.onSuccess, ctx, eventName);
          }
          return { success: true };
        } else {
          runtime.recordNetworkTrace({ type: 'AUTH', label: `auth_login: ${email.substring(0, 3)}***`, success: false, error: res.error });
          runtime.recordTrace({ event: eventName, actionType: 'auth_login', status: 'FAIL', message: res.error || 'Login failed' });
          if (action.onError && Array.isArray(action.onError)) {
            await executeActionChain(action.onError, ctx, eventName);
          }
          return { success: false, error: res.error };
        }
      }

      case 'auth_signup': {
        const email = action.email || '';
        const password = action.password || '';
        const res = await sharedAuthProvider.signup(email, password, { name: email.split('@')[0] });
        if (res.success && res.user) {
          runtime.setCurrentUser(res.user);
          if (res.session) runtime.setSession(res.session);
          runtime.recordNetworkTrace({ type: 'AUTH', label: `auth_signup: ${email}`, success: true });
          runtime.recordTrace({ event: eventName, actionType: 'auth_signup', status: 'PASS', message: 'Auth signup succeeded' });
          if (action.onSuccess && Array.isArray(action.onSuccess)) {
            await executeActionChain(action.onSuccess, ctx, eventName);
          }
          return { success: true };
        } else {
          runtime.recordNetworkTrace({ type: 'AUTH', label: `auth_signup: ${email}`, success: false, error: res.error });
          runtime.recordTrace({ event: eventName, actionType: 'auth_signup', status: 'FAIL', message: res.error || 'Signup failed' });
          if (action.onError && Array.isArray(action.onError)) {
            await executeActionChain(action.onError, ctx, eventName);
          }
          return { success: false, error: res.error };
        }
      }

      case 'auth_logout': {
        await sharedAuthProvider.logout();
        runtime.clearAuth();
        runtime.recordNetworkTrace({ type: 'AUTH', label: 'auth_logout', success: true });
        runtime.recordTrace({ event: eventName, actionType: 'auth_logout', status: 'PASS', message: 'Auth logout executed' });
        if (action.onSuccess && Array.isArray(action.onSuccess)) {
          await executeActionChain(action.onSuccess, ctx, eventName);
        }
        return { success: true };
      }

      case 'upload_file': {
        if (!action.targetVariable) {
          runtime.recordTrace({ event: eventName, actionType: 'upload_file', status: 'FAIL', message: 'Missing targetVariable' });
          return { success: false, error: 'Missing targetVariable for upload_file' };
        }
        // Actual file upload happens via UI; action records intent
        runtime.recordNetworkTrace({ type: 'STORAGE', label: `upload_file -> ${action.targetVariable}`, success: true });
        runtime.recordTrace({ event: eventName, actionType: 'upload_file', target: action.targetVariable, status: 'PASS', message: 'File upload dispatched' });
        return { success: true };
      }

      default: {
        runtime.recordTrace({
          event: eventName,
          actionType: (action as any).type || 'unknown',
          status: 'FAIL',
          message: `Unknown action type: ${(action as any).type}`,
        });
        return { success: false, error: `Unknown action type: ${(action as any).type}` };
      }
    }
  } catch (err: any) {
    runtime.recordTrace({
      event: eventName,
      actionType: action.type,
      status: 'FAIL',
      message: err.message || 'Action execution error',
    });
    return { success: false, error: err.message };
  }
}

/**
 * Execute an ordered chain of actions with optional abort-on-error support
 */
export async function executeActionChain(
  actions: ActionDefinition[],
  ctx: EvaluationContext,
  eventName = 'chain'
): Promise<{ success: boolean; executedCount: number; lastError?: string }> {
  let executedCount = 0;

  for (const action of actions) {
    const res = await executeAction(action, ctx, eventName);
    executedCount++;

    if (!res.success) {
      if (action.abortOnError !== false) {
        // By default or when explicitly true, abort remaining chain
        return {
          success: false,
          executedCount,
          lastError: res.error,
        };
      }
    }
  }

  return {
    success: true,
    executedCount,
  };
}

/**
 * Trigger logic rules matching a specific event on a node
 */
export async function triggerNodeLogicRules(
  rules: LogicRule[] | undefined,
  event: 'click' | 'submit' | 'change' | 'page_load' | 'page_enter',
  ctx: EvaluationContext
): Promise<void> {
  if (!rules || !Array.isArray(rules)) return;

  for (const rule of rules) {
    if (rule.event !== event) continue;

    // Evaluate conditions
    const shouldExecute = evaluateConditionGroup(rule.conditionGroup, ctx);
    if (shouldExecute && Array.isArray(rule.actions)) {
      await executeActionChain(rule.actions, ctx, `event:${event}`);
    }
  }
}
