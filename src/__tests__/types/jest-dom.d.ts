/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveValue(value: string | number): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveFocus(): R;
      toHaveStyle(style: string | Record<string, any>): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toBeEmptyDOMElement(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toBeRequired(): R;
      toHaveAccessibleDescription(text?: string | RegExp): R;
      toHaveAccessibleName(text?: string | RegExp): R;
      toHaveErrorMessage(text?: string | RegExp): R;
    }
  }
}

export {};
