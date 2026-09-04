// Component & Section Generator using registered components
import { AIOperation } from '../operations/AIOperation';

export class ComponentGenerator {
  /**
   * Generates a 3-tier pricing section component tree.
   */
  public static generatePricingSection(pageId: string, parentId: string): AIOperation {
    const sectionId = `pricing_${Date.now()}`;
    return {
      id: `op_${sectionId}`,
      type: 'add_component',
      description: 'Add 3-tier pricing section',
      risk: 'low',
      reversible: true,
      pageId,
      parentId,
      node: {
        id: sectionId,
        type: 'section',
        name: 'Pricing Section',
        props: {},
        styles: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          padding: '48px 24px',
          width: '100%',
        },
        children: [
          {
            id: `pricing_hdr_${sectionId}`,
            type: 'heading',
            name: 'Pricing Title',
            props: { text: 'Flexible Plans for Every Team', level: 'h2' },
            styles: { fontSize: '32px', fontWeight: '800', textAlign: 'center' },
          },
          {
            id: `pricing_grid_${sectionId}`,
            type: 'grid',
            name: 'Plans Grid',
            props: { columns: 3 },
            styles: {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              width: '100%',
              maxWidth: '1200px',
            },
            children: ['Starter', 'Pro', 'Enterprise'].map((plan, i) => ({
              id: `plan_card_${sectionId}_${i}`,
              type: 'container',
              name: `${plan} Card`,
              props: {},
              styles: {
                padding: '32px',
                borderRadius: '12px',
                backgroundColor: i === 1 ? '#0F172A' : '#FFFFFF',
                color: i === 1 ? '#FFFFFF' : '#0F172A',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: i === 1 ? '0 20px 25px -5px rgba(0, 0, 0, 0.2)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              },
              children: [
                {
                  id: `plan_name_${sectionId}_${i}`,
                  type: 'heading',
                  name: 'Plan Name',
                  props: { text: plan, level: 'h3' },
                  styles: { fontSize: '20px', fontWeight: '700' },
                },
                {
                  id: `plan_price_${sectionId}_${i}`,
                  type: 'text',
                  name: 'Price',
                  props: { text: i === 0 ? '$19/mo' : i === 1 ? '$49/mo' : '$99/mo' },
                  styles: { fontSize: '36px', fontWeight: '800' },
                },
                {
                  id: `plan_btn_${sectionId}_${i}`,
                  type: 'button',
                  name: 'CTA Button',
                  props: { text: 'Get Started' },
                  styles: {
                    padding: '12px 24px',
                    borderRadius: '8px',
                    backgroundColor: i === 1 ? '#4F46E5' : '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: 'auto',
                  },
                },
              ],
            })),
          },
        ],
      },
    };
  }

  /**
   * Generates a data form with labels, inputs, and submit button.
   */
  public static generateForm(params: {
    pageId: string;
    parentId: string;
    formName: string;
    fields: Array<{ name: string; label: string; type: string; required?: boolean }>;
    submitButtonText?: string;
  }): AIOperation {
    const formId = `form_${Date.now()}`;
    return {
      id: `op_${formId}`,
      type: 'add_component',
      description: `Add form: ${params.formName}`,
      risk: 'low',
      reversible: true,
      pageId: params.pageId,
      parentId: params.parentId,
      node: {
        id: formId,
        type: 'container',
        name: params.formName,
        props: {},
        styles: {
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          maxWidth: '600px',
          width: '100%',
        },
        children: [
          ...params.fields.map((f, idx) => ({
            id: `field_grp_${formId}_${idx}`,
            type: 'container',
            name: `${f.label} Group`,
            props: {},
            styles: { display: 'flex', flexDirection: 'column', gap: '6px' },
            children: [
              {
                id: `label_${formId}_${idx}`,
                type: 'text',
                name: `${f.label} Label`,
                props: { text: f.label },
                styles: { fontSize: '14px', fontWeight: '600', color: '#334155' },
              },
              {
                id: `input_${formId}_${idx}`,
                type: f.type === 'textarea' ? 'textarea' : 'input',
                name: `${f.label} Input`,
                props: { placeholder: `Enter ${f.label}...` },
                styles: {
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                },
              },
            ],
          })),
          {
            id: `submit_btn_${formId}`,
            type: 'button',
            name: 'Submit Button',
            props: { text: params.submitButtonText || 'Submit' },
            styles: {
              padding: '12px 20px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
            },
          },
        ],
      },
    };
  }
}
