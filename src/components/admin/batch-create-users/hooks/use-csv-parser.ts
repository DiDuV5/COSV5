/**
 * @fileoverview CSV数据解析Hook
 * @description 处理CSV数据解析、验证和用户数据生成
 */

"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import {
  userSchema,
  type ParsedUserData,
  type BatchCreateFormData,
  type ValidationError,
  type ParseStatus,
  DEFAULT_CSV_CONFIG,
  cleanCsvField,
  parseBoolean,
  generateRandomPassword,
} from "../types/batch-create-types";

// 扩展的默认配置类型
interface CsvParseDefaults extends Partial<ParsedUserData> {
  generateRandomPassword?: boolean;
}

export interface UseCsvParserReturn {
  parsedUsers: ParsedUserData[];
  parseErrors: string[];
  parseStatus: ParseStatus;
  parseCsvData: (csvData: string, defaults: CsvParseDefaults) => void;
  clearData: () => void;
  isValidData: boolean;
}

/**
 * CSV数据解析Hook
 */
export function useCsvParser(): UseCsvParserReturn {
  const [parsedUsers, setParsedUsers] = useState<ParsedUserData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseStatus, setParseStatus] = useState<ParseStatus>({
    isPending: false,
    totalLines: 0,
    processedLines: 0,
    validUsers: 0,
    errors: [],
  });

  /**
   * 解析CSV数据
   */
  const parseCsvData = useCallback((csvData: string, defaults: CsvParseDefaults) => {
    setParseStatus(prev => ({ ...prev, isPending: true }));

    try {
      const lines = csvData.trim().split('\n');

      if (lines.length === 0) {
        setParseErrors(['CSV数据为空']);
        setParseStatus(prev => ({ ...prev, isPending: false }));
        return;
      }

      // 检查行数限制
      if (lines.length > DEFAULT_CSV_CONFIG.maxRows + 1) { // +1 for header
        setParseErrors([`CSV数据行数超过限制（最多${DEFAULT_CSV_CONFIG.maxRows}行）`]);
        setParseStatus(prev => ({ ...prev, isPending: false }));
        return;
      }

      const [headerLine, ...dataLines] = lines;
      const headers = headerLine.split(DEFAULT_CSV_CONFIG.delimiter).map(h => cleanCsvField(h));

      // 验证必需的列
      const requiredColumns = ['username'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        setParseErrors([`缺少必需的列: ${missingColumns.join(', ')}`]);
        setParseStatus(prev => ({ ...prev, isPending: false }));
        return;
      }

      const users: ParsedUserData[] = [];
      const errors: string[] = [];
      const validationErrors: ValidationError[] = [];

      setParseStatus(prev => ({
        ...prev,
        totalLines: dataLines.length,
        processedLines: 0,
        validUsers: 0,
      }));

      dataLines.forEach((line, index) => {
        const lineNumber = index + 2; // +2 because index starts at 0 and we skip header

        try {
          if (DEFAULT_CSV_CONFIG.skipEmptyLines && !line.trim()) {
            return;
          }

          const values = line.split(DEFAULT_CSV_CONFIG.delimiter).map(v =>
            DEFAULT_CSV_CONFIG.trimFields ? cleanCsvField(v) : v
          );

          // 创建用户对象
          const userData: any = { ...defaults };

          headers.forEach((header, headerIndex) => {
            const value = values[headerIndex] || '';

            switch (header) {
              case 'username':
              case 'email':
              case 'password':
              case 'displayName':
              case 'bio':
              case 'userLevel':
                userData[header] = value || undefined;
                break;
              case 'isVerified':
              case 'canPublish':
                userData[header] = value ? parseBoolean(value) : defaults[header];
                break;
            }
          });

          // 如果启用随机密码生成且没有提供密码
          if (!userData.password && defaults.generateRandomPassword) {
            userData.password = generateRandomPassword();
          }

          // 添加行号信息
          userData.lineNumber = lineNumber;

          // 验证用户数据
          const validatedUser = userSchema.parse(userData);
          users.push(validatedUser);

          setParseStatus(prev => ({
            ...prev,
            processedLines: prev.processedLines + 1,
            validUsers: prev.validUsers + 1,
          }));

        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach(e => {
              const fieldError: ValidationError = {
                lineNumber,
                field: e.path.join('.'),
                message: e.message,
                value: e.path.reduce((obj: any, key: string | number) => obj?.[key], line) || '',
              };
              validationErrors.push(fieldError);
            });

            const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            errors.push(`第${lineNumber}行：${fieldErrors}`);
          } else {
            errors.push(`第${lineNumber}行：数据格式错误`);
            validationErrors.push({
              lineNumber,
              field: 'unknown',
              message: '数据格式错误',
              value: line,
            });
          }

          setParseStatus(prev => ({
            ...prev,
            processedLines: prev.processedLines + 1,
          }));
        }
      });

      setParsedUsers(users);
      setParseErrors(errors);
      setParseStatus(prev => ({
        ...prev,
        isPending: false,
        errors: validationErrors,
      }));

    } catch (error) {
      console.error('CSV解析失败:', error);
      setParseErrors(['CSV解析失败，请检查数据格式']);
      setParseStatus(prev => ({ ...prev, isPending: false }));
    }
  }, []);

  /**
   * 清除数据
   */
  const clearData = useCallback(() => {
    setParsedUsers([]);
    setParseErrors([]);
    setParseStatus({
      isPending: false,
      totalLines: 0,
      processedLines: 0,
      validUsers: 0,
      errors: [],
    });
  }, []);

  /**
   * 检查数据是否有效
   */
  const isValidData = parsedUsers.length > 0 && parseErrors.length === 0;

  return {
    parsedUsers,
    parseErrors,
    parseStatus,
    parseCsvData,
    clearData,
    isValidData,
  };
}

/**
 * CSV模板生成Hook
 */
export function useCsvTemplate() {
  /**
   * 生成CSV模板
   */
  const generateTemplate = useCallback((includeExamples: boolean = true) => {
    const headers = [
      'username',
      'email',
      'password',
      'displayName',
      'bio',
      'userLevel',
      'isVerified',
      'canPublish'
    ];

    let template = headers.join(',') + '\n';

    if (includeExamples) {
      const examples = [
        'testuser1,test1@example.com,password123,测试用户1,这是测试用户,USER,false,false',
        'testuser2,test2@example.com,password123,测试用户2,这是测试用户,VIP,true,true',
        'creator1,creator@example.com,password123,创作者1,专业cosplay创作者,CREATOR,true,true'
      ];
      template += examples.join('\n');
    }

    return template;
  }, []);

  /**
   * 下载模板文件
   */
  const downloadTemplate = useCallback((includeExamples: boolean = true) => {
    const template = generateTemplate(includeExamples);
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'batch_users_template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [generateTemplate]);

  return {
    generateTemplate,
    downloadTemplate,
  };
}

/**
 * 用户名重复检查Hook
 */
export function useUsernameValidator() {
  const [existingUsernames, setExistingUsernames] = useState<Set<string>>(new Set());

  /**
   * 检查用户名重复
   */
  const validateUsernames = useCallback((users: ParsedUserData[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenUsernames = new Set<string>();

    users.forEach(user => {
      const username = user.username.toLowerCase();

      // 检查是否与现有用户重复
      if (existingUsernames.has(username)) {
        errors.push({
          lineNumber: user.lineNumber || 0,
          field: 'username',
          message: '用户名已存在',
          value: user.username,
        });
      }

      // 检查是否在当前批次中重复
      if (seenUsernames.has(username)) {
        errors.push({
          lineNumber: user.lineNumber || 0,
          field: 'username',
          message: '用户名在当前批次中重复',
          value: user.username,
        });
      }

      seenUsernames.add(username);
    });

    return errors;
  }, [existingUsernames]);

  /**
   * 更新现有用户名列表
   */
  const updateExistingUsernames = useCallback((usernames: string[]) => {
    setExistingUsernames(new Set(usernames.map(u => u.toLowerCase())));
  }, []);

  return {
    validateUsernames,
    updateExistingUsernames,
  };
}
