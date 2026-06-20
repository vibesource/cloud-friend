import type { ReactNode } from 'react';
import styles from './SettingsFields.module.css';

interface BaseProps {
  label: string;
  hint?: string;
}

export function TextField({
  label,
  hint,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export function NumberField({
  label,
  hint,
  ...props
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="number" {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  ...props
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...props
}: BaseProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: ReactNode;
  }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select {...props}>{children}</select>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
