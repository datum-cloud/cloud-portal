'use client';

import * as React from 'react';
import { useFormMetadata } from '@conform-to/react';
import { useFormContext } from '../context/form-context';
import type { FormFieldArrayProps, FormFieldArrayRenderProps } from '../types';

/**
 * Form.FieldArray - Dynamic array of fields
 *
 * Provides helpers for managing arrays of form fields.
 *
 * @example
 * ```tsx
 * <Form.FieldArray name="members">
 *   {({ fields, append, remove }) => (
 *     <>
 *       {fields.map((field, index) => (
 *         <div key={field.key} className="flex gap-2">
 *           <Form.Field name={`members.${index}.email`} label="Email">
 *             <Form.Input type="email" />
 *           </Form.Field>
 *           <Form.Field name={`members.${index}.role`} label="Role">
 *             <Form.Select>
 *               <Form.SelectItem value="admin">Admin</Form.SelectItem>
 *               <Form.SelectItem value="user">User</Form.SelectItem>
 *             </Form.Select>
 *           </Form.Field>
 *           <button type="button" onClick={() => remove(index)}>
 *             Remove
 *           </button>
 *         </div>
 *       ))}
 *       <button type="button" onClick={() => append({ email: '', role: 'user' })}>
 *         Add Member
 *       </button>
 *     </>
 *   )}
 * </Form.FieldArray>
 * ```
 */
export function FormFieldArray({ name, children }: FormFieldArrayProps) {
  const { fields, formId } = useFormContext();
  const form = useFormMetadata(formId);

  // Get the array field metadata
  const arrayField = React.useMemo(() => {
    const parts = name.split('.');
    let current: any = fields;

    for (const part of parts) {
      if (!current) break;

      if (current.getFieldset) {
        current = current.getFieldset()[part];
      } else {
        current = current[part];
      }
    }

    return current;
  }, [fields, name]);

  if (!arrayField) {
    console.warn(`Form.FieldArray: Field "${name}" not found in form schema`);
    return null;
  }

  // Get the field list
  const fieldList = arrayField.getFieldList?.() ?? [];

  // Create the fields array with id, key, and name
  const formFields: FormFieldArrayRenderProps['fields'] = fieldList.map(
    (field: any, index: number) => ({
      id: field.id,
      key: field.key,
      name: `${name}.${index}`,
    })
  );

  // Append handler
  const append = React.useCallback(
    (value: Record<string, unknown> = {}) => {
      form.insert({
        name: arrayField.name,
        defaultValue: value as any,
      });
    },
    [form, arrayField.name]
  );

  // Remove handler
  const remove = React.useCallback(
    (index: number) => {
      form.remove({
        name: arrayField.name,
        index,
      });
    },
    [form, arrayField.name]
  );

  // Move handler
  const move = React.useCallback(
    (from: number, to: number) => {
      form.reorder({
        name: arrayField.name,
        from,
        to,
      });
    },
    [form, arrayField.name]
  );

  const renderProps: FormFieldArrayRenderProps = {
    fields: formFields,
    append,
    remove,
    move,
  };

  return <>{children(renderProps)}</>;
}

FormFieldArray.displayName = 'Form.FieldArray';
