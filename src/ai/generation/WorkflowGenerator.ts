// Workflow Generator: Synthesizes visual automation workflows using the workflow engine
import { AIOperation } from '../operations/AIOperation';

export class WorkflowGenerator {
  /**
   * Generates a form submission & record creation workflow with validation and notification.
   */
  public static generateFormSubmitWorkflow(params: {
    workflowId: string;
    workflowName: string;
    targetCollectionId: string;
    notificationMessage?: string;
  }): AIOperation {
    const triggerNodeId = `node_trig_${params.workflowId}`;
    const validateNodeId = `node_val_${params.workflowId}`;
    const createRecordNodeId = `node_create_${params.workflowId}`;
    const notifyNodeId = `node_notify_${params.workflowId}`;

    return {
      id: `op_wf_${params.workflowId}`,
      type: 'create_workflow',
      description: `Create workflow "${params.workflowName}"`,
      risk: 'medium',
      reversible: true,
      workflow: {
        id: params.workflowId,
        name: params.workflowName,
        description: `Automated workflow for ${params.workflowName}`,
        nodes: [
          {
            id: triggerNodeId,
            type: 'trigger',
            name: 'Form Submit Trigger',
            data: { triggerType: 'manual' },
          },
          {
            id: validateNodeId,
            type: 'condition',
            name: 'Validate Payload',
            data: {
              condition: 'Boolean(data && Object.keys(data).length > 0)',
              trueNodeId: createRecordNodeId,
              falseNodeId: undefined,
            },
          },
          {
            id: createRecordNodeId,
            type: 'action',
            name: 'Create Record',
            data: {
              actionType: 'create_record',
              collectionId: params.targetCollectionId,
              recordData: '{{data}}',
            },
          },
          {
            id: notifyNodeId,
            type: 'action',
            name: 'Show Notification',
            data: {
              actionType: 'show_notification',
              message: params.notificationMessage || 'Record created successfully!',
              notificationType: 'success',
            },
          },
        ],
        edges: [
          { id: `edge_1_${params.workflowId}`, source: triggerNodeId, target: validateNodeId },
          { id: `edge_2_${params.workflowId}`, source: createRecordNodeId, target: notifyNodeId },
        ],
      },
    };
  }
}
