/**
 * @fileoverview Prisma模拟（用于自动清理服务）
 * @description 提供基本的数据库操作模拟
 */

/**
 * 模拟的Prisma客户端
 */
export const prismaMock = {
  cleanupReport: {
    create: async (data: any) => {
      console.log('📊 模拟保存清理报告:', data);
      return { id: 'mock-id', ...data.data };
    },
    findMany: async (options: any) => {
      console.log('📊 模拟查询清理报告:', options);
      return [];
    },
    deleteMany: async (options: any) => {
      console.log('📊 模拟删除清理报告:', options);
      return { count: 0 };
    },
  },
  uploadSession: {
    findMany: async (options: any) => {
      console.log('📊 模拟查询上传会话:', options);
      return [];
    },
    delete: async (options: any) => {
      console.log('📊 模拟删除上传会话:', options);
      return { id: 'mock-id' };
    },
  },
  postMedia: {
    findMany: async (options: any) => {
      console.log('📊 模拟查询媒体文件:', options);
      return [];
    },
  },
};
