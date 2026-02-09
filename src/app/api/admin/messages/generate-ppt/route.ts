import { NextRequest, NextResponse } from 'next/server';
import { messageManager } from '@/storage/database';
import { analyzeMessagesWithAI, AnalysisReport } from '@/lib/utils/messageAnalysis';
import pptxgen from 'pptxgenjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取所有留言
    const messages = await messageManager.getAllMessages();

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found' },
        { status: 404 }
      );
    }

    // 获取分析报告
    const analysisResult: AnalysisReport = body.analysis || await analyzeMessagesWithAI(messages);

    // 生成PPT
    const pptxBuffer = await generatePPT(analysisResult);

    // 返回PPT文件
    const filename = `留言分析报告_${new Date().toISOString().slice(0, 10)}.pptx`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(pptxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('Generate PPT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generatePPT(report: AnalysisReport): Promise<Buffer> {
  // 创建PPT
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'SIGMÖ';
  pptx.company = 'SIGMÖ';
  pptx.subject = '留言分析报告';
  pptx.title = '留言分析报告';

  // 定义主题色
  const primaryColor = '2D3A31'; // 深森林绿
  const secondaryColor = '8C9A84'; // 鼠尾草绿
  const accentColor = 'C27B66'; // 陶土色
  const backgroundColor = 'F9F8F4'; // 暖米色

  // 幻灯片1：封面
  const slide1 = pptx.addSlide();
  slide1.background = { color: primaryColor };
  slide1.addText('留言分析报告', {
    x: '10%',
    y: '40%',
    w: '80%',
    h: '10%',
    fontSize: 54,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Microsoft YaHei',
  });
  slide1.addText(`生成时间：${new Date().toLocaleString('zh-CN')}`, {
    x: '10%',
    y: '60%',
    w: '80%',
    h: '5%',
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
    fontFace: 'Microsoft YaHei',
  });
  slide1.addText('SIGMÖ', {
    x: '10%',
    y: '75%',
    w: '80%',
    h: '5%',
    fontSize: 24,
    color: secondaryColor,
    align: 'center',
    fontFace: 'Microsoft YaHei',
  });

  // 幻灯片2：整体总结
  const slide2 = pptx.addSlide();
  slide2.background = { color: backgroundColor };
  slide2.addText('整体总结', {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '8%',
    fontSize: 32,
    bold: true,
    color: primaryColor,
    fontFace: 'Microsoft YaHei',
  });
  slide2.addText(report.summary, {
    x: '5%',
    y: '15%',
    w: '90%',
    h: '75%',
    fontSize: 18,
    color: '333333',
    align: 'justify',
    valign: 'top',
    fontFace: 'Microsoft YaHei',
  });

  // 幻灯片3：关键观点
  const slide3 = pptx.addSlide();
  slide3.background = { color: backgroundColor };
  slide3.addText('关键观点', {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '8%',
    fontSize: 32,
    bold: true,
    color: primaryColor,
    fontFace: 'Microsoft YaHei',
  });
  report.keyPoints.forEach((point, index) => {
    slide3.addText(`${index + 1}. ${point}`, {
      x: '10%',
      y: `${15 + index * 12}%`,
      w: '80%',
      h: '8%',
      fontSize: 18,
      color: '333333',
      fontFace: 'Microsoft YaHei',
      bullet: true,
    });
  });

  // 幻灯片4：情感分析
  const slide4 = pptx.addSlide();
  slide4.background = { color: backgroundColor };
  slide4.addText('情感分析', {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '8%',
    fontSize: 32,
    bold: true,
    color: primaryColor,
    fontFace: 'Microsoft YaHei',
  });
  slide4.addText(report.sentimentAnalysis, {
    x: '5%',
    y: '15%',
    w: '90%',
    h: '75%',
    fontSize: 18,
    color: '333333',
    align: 'justify',
    valign: 'top',
    fontFace: 'Microsoft YaHei',
  });

  // 幻灯片5：改进建议
  const slide5 = pptx.addSlide();
  slide5.background = { color: backgroundColor };
  slide5.addText('改进建议', {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '8%',
    fontSize: 32,
    bold: true,
    color: primaryColor,
    fontFace: 'Microsoft YaHei',
  });
  report.recommendations.forEach((rec, index) => {
    slide5.addText(`${index + 1}. ${rec}`, {
      x: '10%',
      y: `${15 + index * 12}%`,
      w: '80%',
      h: '8%',
      fontSize: 18,
      color: '333333',
      fontFace: 'Microsoft YaHei',
      bullet: true,
    });
  });

  // 幻灯片6：作者洞察
  const slide6 = pptx.addSlide();
  slide6.background = { color: backgroundColor };
  slide6.addText('作者洞察', {
    x: '5%',
    y: '5%',
    w: '90%',
    h: '8%',
    fontSize: 32,
    bold: true,
    color: primaryColor,
    fontFace: 'Microsoft YaHei',
  });
  report.authorInsights.forEach((insight, index) => {
    const yPos = 15 + index * 18;
    slide6.addText(`${insight.authorName} (留言数: ${insight.messageCount})`, {
      x: '5%',
      y: `${yPos}%`,
      w: '90%',
      h: '5%',
      fontSize: 20,
      bold: true,
      color: primaryColor,
      fontFace: 'Microsoft YaHei',
    });
    slide6.addText(`关注点: ${insight.keyThemes.join(', ')}`, {
      x: '10%',
      y: `${yPos + 6}%`,
      w: '85%',
      h: '5%',
      fontSize: 16,
      color: '666666',
      fontFace: 'Microsoft YaHei',
    });
  });

  // 幻灯片7及以后：留言详情（每页最多3条）
  const messagesPerPage = 3;
  const totalPages = Math.ceil(report.messages.length / messagesPerPage);

  for (let i = 0; i < totalPages; i++) {
    const slide = pptx.addSlide();
    slide.background = { color: backgroundColor };
    slide.addText(`留言详情 (${i + 1}/${totalPages})`, {
      x: '5%',
      y: '5%',
      w: '90%',
      h: '8%',
      fontSize: 32,
      bold: true,
      color: primaryColor,
      fontFace: 'Microsoft YaHei',
    });

    const startIndex = i * messagesPerPage;
    const endIndex = Math.min(startIndex + messagesPerPage, report.messages.length);

    for (let j = startIndex; j < endIndex; j++) {
      const msg = report.messages[j];
      const yPos = 15 + (j - startIndex) * 25;

      // 留言卡片
      slide.addShape(pptx.ShapeType.rect, {
        x: '5%',
        y: `${yPos}%`,
        w: '90%',
        h: '22%',
        fill: { color: 'FFFFFF' },
        line: { color: secondaryColor, width: 1 },
      });

      // 作者和时间
      slide.addText(`${msg.authorName} - ${msg.createdAt}`, {
        x: '8%',
        y: `${yPos + 2}%`,
        w: '84%',
        h: '4%',
        fontSize: 14,
        bold: true,
        color: primaryColor,
        fontFace: 'Microsoft YaHei',
      });

      // 分类和情感
      const sentimentColor = msg.sentiment === 'positive' ? '4CAF50' : msg.sentiment === 'negative' ? 'F44336' : '9E9E9E';
      slide.addText(`分类: ${msg.category} | 情感: ${msg.sentiment}`, {
        x: '8%',
        y: `${yPos + 6}%`,
        w: '84%',
        h: '3%',
        fontSize: 12,
        color: sentimentColor,
        fontFace: 'Microsoft YaHei',
      });

      // 内容
      slide.addText(msg.content, {
        x: '8%',
        y: `${yPos + 10}%`,
        w: '84%',
        h: '10%',
        fontSize: 14,
        color: '333333',
        align: 'justify',
        valign: 'top',
        fontFace: 'Microsoft YaHei',
      });
    }
  }

  // 生成Buffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return buffer;
}
