/**
 * UUID令牌流程端到端测试脚本
 * 验证从生成到验证的完整链路
 */

import { randomUUID } from 'crypto';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 测试UUID生成和格式验证
 */
function testUUIDGeneration(): TestResult {
  try {
    const uuid = randomUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    const isValid = uuidRegex.test(uuid);
    const hasCorrectLength = uuid.length === 36;
    
    return {
      success: isValid && hasCorrectLength,
      message: isValid && hasCorrectLength ? 'UUID生成正常' : 'UUID格式错误',
      details: {
        uuid,
        length: uuid.length,
        format: isValid,
        expectedLength: 36
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'UUID生成失败',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 测试URL编码/解码一致性
 */
function testURLEncoding(): TestResult {
  try {
    const testUUID = randomUUID();
    
    // 测试encodeURIComponent
    const encoded1 = encodeURIComponent(testUUID);
    const decoded1 = decodeURIComponent(encoded1);
    
    // 测试URLSearchParams
    const searchParams = new URLSearchParams({ token: testUUID });
    const encoded2 = searchParams.toString();
    const decoded2 = new URLSearchParams(encoded2).get('token');
    
    const method1Success = testUUID === decoded1;
    const method2Success = testUUID === decoded2;
    
    return {
      success: method1Success && method2Success,
      message: method1Success && method2Success ? 'URL编码/解码一致' : 'URL编码/解码不一致',
      details: {
        original: testUUID,
        encodeURIComponent: {
          encoded: encoded1,
          decoded: decoded1,
          success: method1Success
        },
        URLSearchParams: {
          encoded: encoded2,
          decoded: decoded2,
          success: method2Success
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'URL编码测试失败',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 测试URL生成一致性
 */
async function testURLGeneration(): Promise<TestResult> {
  try {
    const testUUID = randomUUID();
    
    // 动态导入URL配置
    const { generateVerificationUrl } = await import('@/lib/config/url-config');
    
    const url = generateVerificationUrl(testUUID);
    const parsedUrl = new URL(url);
    const extractedToken = parsedUrl.searchParams.get('token');
    
    const isConsistent = testUUID === extractedToken;
    
    return {
      success: isConsistent,
      message: isConsistent ? 'URL生成一致' : 'URL生成不一致',
      details: {
        original: testUUID,
        generatedUrl: url,
        extractedToken,
        consistent: isConsistent,
        urlLength: url.length
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'URL生成测试失败',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 测试不同UUID格式的处理
 */
function testUUIDFormats(): TestResult {
  try {
    const testCases = [
      randomUUID(),                                                    // 标准UUID
      randomUUID().toUpperCase(),                                      // 大写UUID
      randomUUID().toLowerCase(),                                      // 小写UUID
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',                        // 固定测试UUID
      'F47AC10B-58CC-4372-A567-0E02B2C3D479',                        // 固定大写UUID
    ];

    const results = testCases.map(uuid => {
      const encoded = encodeURIComponent(uuid);
      const decoded = decodeURIComponent(encoded);
      return {
        original: uuid,
        encoded,
        decoded,
        consistent: uuid === decoded
      };
    });

    const allConsistent = results.every(r => r.consistent);

    return {
      success: allConsistent,
      message: allConsistent ? '所有UUID格式处理一致' : '部分UUID格式处理不一致',
      details: { results }
    };
  } catch (error) {
    return {
      success: false,
      message: 'UUID格式测试失败',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 运行完整的UUID一致性测试套件
 */
export async function runUUIDConsistencyTests(): Promise<{
  success: boolean;
  results: Record<string, TestResult>;
  summary: string;
}> {
  console.log('🧪 开始UUID令牌一致性测试套件\n');

  const results: Record<string, TestResult> = {};

  // 1. UUID生成测试
  console.log('1️⃣ 测试UUID生成...');
  results.generation = testUUIDGeneration();
  console.log(`   ${results.generation.success ? '✅' : '❌'} ${results.generation.message}`);

  // 2. URL编码测试
  console.log('2️⃣ 测试URL编码/解码...');
  results.encoding = testURLEncoding();
  console.log(`   ${results.encoding.success ? '✅' : '❌'} ${results.encoding.message}`);

  // 3. URL生成测试
  console.log('3️⃣ 测试URL生成...');
  results.urlGeneration = await testURLGeneration();
  console.log(`   ${results.urlGeneration.success ? '✅' : '❌'} ${results.urlGeneration.message}`);

  // 4. UUID格式测试
  console.log('4️⃣ 测试UUID格式处理...');
  results.formats = testUUIDFormats();
  console.log(`   ${results.formats.success ? '✅' : '❌'} ${results.formats.message}`);

  // 汇总结果
  const allSuccess = Object.values(results).every(r => r.success);
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.values(results).length;

  const summary = `测试完成: ${successCount}/${totalCount} 通过`;
  
  console.log(`\n📊 ${allSuccess ? '🎉' : '⚠️'} ${summary}`);
  
  if (!allSuccess) {
    console.log('\n❌ 失败的测试:');
    Object.entries(results).forEach(([name, result]) => {
      if (!result.success) {
        console.log(`   - ${name}: ${result.message}`);
        if (result.details) {
          console.log(`     详情:`, result.details);
        }
      }
    });
  }

  return {
    success: allSuccess,
    results,
    summary
  };
}

// 如果直接运行此脚本
if (require.main === module) {
  runUUIDConsistencyTests().then(({ success }) => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ 测试套件执行失败:', error);
    process.exit(1);
  });
}
