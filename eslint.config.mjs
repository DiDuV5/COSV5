/**
 * @fileoverview CoserEden项目ESLint配置 - 扁平配置格式
 * @description 统一的代码质量和风格规范，支持TypeScript、Next.js、React、tRPC
 * @author CoserEden Team
 * @date 2025-07-14
 * @version 1.0.0
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  // 基础JavaScript规则
  js.configs.recommended,

  // TypeScript规则
  ...tseslint.configs.recommended,

  // React规则
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "warn",
      "react/jsx-key": "error",
      "react/jsx-no-target-blank": "error",
      "react/no-array-index-key": "warn",
      "react/no-unescaped-entities": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  },

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      ecmaVersion: 2021,
      sourceType: "module"
    },
    rules: {
      // 文件大小限制
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],

      // 代码复杂度
      "complexity": ["warn", { max: 10 }],
      "max-depth": ["warn", { max: 4 }],
      "max-nested-callbacks": ["warn", { max: 3 }],

      // TypeScript特定规则
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",

      // CoserEden项目特定规则
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='TRPCError']",
          message: "请使用TRPCErrorHandler替代TRPCError"
        },
        {
          selector: "JSXElement[openingElement.name.name='img']",
          message: "禁止使用原生 <img> 标签。请使用 next/image"
        },
        {
          selector: "Literal[value='OPERATOR']",
          message: "过时的用户级别 'OPERATOR'，请使用 'SUPER_ADMIN'"
        }
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../*"],
              message: "避免深层相对导入，请使用路径别名 @/"
            }
          ]
        }
      ]
    }
  },

  // 测试文件特殊规则
  {
    files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "no-restricted-syntax": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "complexity": "off"
    }
  },

  // 忽略特定文件
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".turbo/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "public/**",
      "uploads/**",
      "temp/**",
      "database-backup/**",
      "ssl/**",
      "ssl-certificates/**",
      "nginx/**",
      "nginx-production/**",
      "cicd-keys/**",
      "**/*.min.js",
      "**/*.config.js",
      "**/*.config.mjs",
      "jest.*.js",
      "next.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      "ecosystem.config.js",
      "*.tar.gz",
      "*.dump",
      "*.sql",
      "*.pem",
      "*.key",
      "*.crt",
      "*.csr",
      "*.conf"
    ]
  }
];
