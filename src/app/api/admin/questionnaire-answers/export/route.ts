import { NextRequest, NextResponse } from 'next/server';
import { dailyLogsManager, protocolManager } from '@/storage/database';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Failed to parse JSON' },
        { status: 400 }
      );
    }

    const { protocolId } = body;

    if (!protocolId) {
      return NextResponse.json(
        { error: 'protocolId is required' },
        { status: 400 }
      );
    }

    // 验证协议是否存在
    const protocol = await protocolManager.getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // 获取问卷答案
    const answers = await dailyLogsManager.getLogsByProtocol(protocolId);

    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'No questionnaire answers found', success: false },
        { status: 404 }
      );
    }

    console.log(`Exporting ${answers.length} questionnaire answers to Excel`);

    // 准备数据用于 Excel 导出
    const excelData: any[] = [];

    // 添加概览信息
    excelData.push({
      '报告标题': '产品测试问卷答案报告',
      '协议标题': protocol.title,
      '产品名称': protocol.productName || '未指定',
      '测试周期': `${protocol.testPeriodDays || '未指定'}天`,
      '总提交数': answers.length,
      '导出时间': new Date().toLocaleString('zh-CN'),
    });

    excelData.push({}); // 空行分隔

    // 添加列标题
    excelData.push({
      '提交日期': '',
      '测试天数': '',
      '问题': '',
      '评分': '',
      '备注': '',
      '物料状态': '',
      '生命周期': '',
      '逻辑分支': '',
    });

    // 填充数据
    answers.forEach(answer => {
      const submittedDate = new Date(answer.submittedAt).toLocaleString('zh-CN');
      
      // 如果有多个问题，每个问题一行
      if (answer.answers && Array.isArray(answer.answers) && answer.answers.length > 0) {
        answer.answers.forEach((a: any, index: number) => {
          excelData.push({
            '提交日期': index === 0 ? submittedDate : '',
            '测试天数': index === 0 ? answer.testDay : '',
            '问题': a.question,
            '评分': a.score,
            '备注': index === 0 ? (answer.remark || '') : '',
            '物料状态': index === 0 ? (answer.materialState || '') : '',
            '生命周期': index === 0 ? (answer.lifecyclePhase || '') : '',
            '逻辑分支': index === 0 ? (answer.logicBranch || '') : '',
          });
        });
      } else {
        excelData.push({
          '提交日期': submittedDate,
          '测试天数': answer.testDay,
          '问题': '无问题',
          '评分': '',
          '备注': answer.remark || '',
          '物料状态': answer.materialState || '',
          '生命周期': answer.lifecyclePhase || '',
          '逻辑分支': answer.logicBranch || '',
        });
      }

      // 添加空行分隔不同的提交
      excelData.push({});
    });

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 20 }, // 提交日期
      { wch: 10 }, // 测试天数
      { wch: 40 }, // 问题
      { wch: 8 },  // 评分
      { wch: 30 }, // 备注
      { wch: 15 }, // 物料状态
      { wch: 15 }, // 生命周期
      { wch: 15 }, // 逻辑分支
    ];

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '问卷答案');

    // 生成 Excel 文件 buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    console.log('Excel file generated successfully, size:', excelBuffer.byteLength, 'bytes');

    // 返回文件
    const response = new NextResponse(excelBuffer, {
      status: 200,
    });

    // 设置 headers - 使用 RFC 5987 格式来支持中文文件名
    const filename = `问卷答案_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);
    
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.headers.set('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);

    return response;
  } catch (error) {
    console.error('Export questionnaire answers error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
