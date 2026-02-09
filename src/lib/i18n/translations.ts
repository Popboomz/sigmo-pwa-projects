export type Language = 'en' | 'zh';

export const translations = {
  en: {
    // Navigation
    nav: {
      brand: 'SIGMÖ',
      home: 'Home',
      collection: 'Collection',
      account: 'Account',
      pwa: 'PWA',
    },
    // Home Page
    home: {
      title: 'Welcome to Our Brand',
      subtitle: 'We create innovative solutions that inspire and empower. Discover our collection and join us on this journey.',
      explore: 'Explore Collection',
      tagline: 'Sustainable Living, Natural Beauty',
      features: {
        quality: {
          title: 'Quality Content',
          description: 'Curated selection of premium content designed to inspire and educate.',
        },
        products: {
          title: 'Premium Products',
          description: 'Discover our exclusive collection of products crafted with care.',
        },
        customer: {
          title: 'Customer Focus',
          description: 'Your satisfaction is our priority. We are here to support you.',
        },
      },
    },
    // Brand Story
    brand: {
      story: {
        title: 'The Story of SIGMÖ',
        subtitle: 'Making cat care easier, cleaner, and more like home.',
        origin: 'Sigmö was born from a simple wish — to make cat care easier, cleaner, and more like home.',
        philosophy: 'We found many pet products were too eager: cramming packaging with information and making big promises. Products that truly stay with a family for a long time don\'t rely on stimulation and persuasion, but on a stable daily routine that doesn\'t disturb you, yet always gets things done.',
        meaning: {
          title: 'Starting from Σ',
          content: 'It means "adding up many details together." The experience of keeping cats is never determined by a single point, but by dust, odor, clumping efficiency, cleaning rhythm, spatial aesthetics... These details stack together to determine how you feel when facing the litter box at the end of the day.',
        },
        approach: 'So Sigmö doesn\'t pursue more complex concepts. Instead, we reorganize these details — using more restrained language, a more systematic product system, and a more stable experience — to gather scattered trivialities into a reliable result.',
        result: 'After every cleaning, you feel fresher, more composed, and more relaxed.',
        benefit: 'Every detail adds up to a better experience.',
        vision: {
          title: 'A Quiet Helper',
          content: 'Sigmö wants to become a quiet helper in your shared space: serious as a laboratory, gentle as a home.',
          tagline: 'No noise, only stability in daily life.',
        },
      },
    },
    // Collection Page
    collection: {
      title: 'Product Lines',
      subtitle: 'Discover the SIGMÖ product ecosystem powered by MODRA™ Architecture',
      core: {
        name: 'SIGMÖ CORE™',
        badge: 'Standard / Mainstream / Long-term',
        description: 'Core product line for the mass market, providing stable and reliable standard solutions suitable for long-term use and large-scale deployment.',
        products: [
          {
            id: 'Σ-01',
            name: 'SIGMÖ CORE™ / Σ-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System',
            status: 'available',
          },
          {
            id: 'Σ-02',
            name: 'SIGMÖ CORE™ / Σ-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System',
            status: 'available',
          },
        ],
      },
      x: {
        name: 'SIGMÖ X™',
        badge: 'High Performance / Premium',
        description: 'High-end product line for ultimate performance needs, featuring MODRA™ Lock technology for performance leaps, suitable for high-load and professional scenarios.',
        products: [
          {
            id: 'Δ-01',
            name: 'SIGMÖ X™ / Δ-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Lock',
            status: 'limited',
          },
          {
            id: 'Δ-02',
            name: 'SIGMÖ X™ / Δ-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Lock',
            status: 'comingSoon',
          },
        ],
      },
      lab: {
        name: 'SIGMÖ LAB™',
        badge: 'Experimental / Forward-looking',
        description: 'Technical experiment and concept verification platform, exploring cutting-edge materials, structures and technical solutions to provide innovation foundation for future product iterations.',
        products: [
          {
            id: 'EXP-01',
            name: 'SIGMÖ LAB™ / EXP-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Interface',
            status: 'limited',
          },
          {
            id: 'EXP-02',
            name: 'SIGMÖ LAB™ / EXP-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Grid',
            status: 'comingSoon',
          },
        ],
      },
      status: {
        available: 'Available',
        limited: 'Limited',
        comingSoon: 'Coming Soon',
      },
      viewDetails: 'View Details',
      modraArchitecture: 'Powered by MODRA™ Architecture',
    },
    // Account Page
    account: {
      title: 'Account',
      subtitle: 'View your account status and information',
      notLoggedIn: {
        title: 'Not Logged In',
        description: 'You are currently not logged in. Please log in to access your account.',
        adminHint: 'Please use the admin entry point to log in if you are an administrator.',
      },
      noPermission: {
        title: 'No Admin Permission',
        description: 'You are logged in but do not have administrator privileges.',
        note: 'Only administrators can access the management interface. Please contact the site administrator if you believe this is an error.',
      },
      adminAccount: {
        title: 'Admin Account',
        description: 'You have administrator privileges.',
        goToDashboard: 'Go to Admin Dashboard',
        adminAccessHint: 'You can access the admin dashboard to manage surveys, protocols, and messages.',
      },
    },
    // Admin
    admin: {
      entry: 'Admin Entry',
      portal: 'Admin Portal',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      emailTab: 'Email',
      googleTab: 'Google',
      email: 'Email',
      password: 'Password',
      placeholder: {
        email: 'admin@example.com',
        password: '••••••••',
        title: 'Protocol title',
        description: 'Protocol description',
      },
      required: 'Required',
      optional: 'Optional',
      description: 'Sign in to access the management interface',
      googleDescription: 'Sign in with your Google account',
      signInWithGoogle: 'Sign in with Google',
      viewSite: 'View Site',
      logout: 'Logout',
      dashboard: 'Admin Dashboard',
      tabs: {
        protocols: 'Protocols',
        surveys: 'Surveys',
        messages: 'Messages',
      },
      createProtocol: {
        title: 'Create New Protocol',
        description: 'Create a new test protocol and generate a share link',
        create: 'Create Protocol',
        creating: 'Creating...',
        titleLabel: 'Title',
        descriptionLabel: 'Description (Optional)',
      },
      existingProtocols: {
        title: 'Existing Protocols',
        description: 'Manage your test protocols',
        noProtocols: 'No protocols yet. Create your first protocol above.',
        shareLink: 'Share Link',
        created: 'Created: ',
      },
      surveys: {
        title: 'User Surveys',
        description: 'View all submitted survey responses',
        noSurveys: 'No surveys submitted yet.',
        surveyId: 'Survey ID: ',
      },
      messages: {
        title: 'Admin Messages',
        description: 'View and manage messages from administrators',
        noMessages: 'No messages yet. Be the first to leave a message.',
        leaveMessage: 'Leave a Message',
        nameLabel: 'Your Name',
        messageLabel: 'Your Message',
        namePlaceholder: 'Enter your name',
        messagePlaceholder: 'Enter your message...',
        submit: 'Send Message',
        submitting: 'Sending...',
        success: 'Message sent successfully!',
        cancel: 'Cancel',
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this message?',
        author: 'Author',
        time: 'Posted at',
        analyze: 'Generate AI Analysis',
        analyzing: 'Analyzing...',
        analysisSuccess: 'Analysis generated successfully!',
        generatePPT: 'Generate PPT Report',
        generatingPPT: 'Generating PPT...',
        pptSuccess: 'PPT generated successfully!',
        downloadPPT: 'Download PPT',
        noMessagesToAnalyze: 'No messages to analyze.',
        analysisFailed: 'Analysis failed: {{error}}',
        analysisError: 'An error occurred while analyzing messages.',
        pleaseAnalyzeFirst: 'Please analyze messages first before generating PPT.',
        pptGenerationFailed: 'PPT generation failed: {{error}}',
        pptGenerationError: 'An error occurred while generating PPT.',
        overallSummary: 'Overall Summary',
        keyPoints: 'Key Points',
        sentimentTrend: 'Sentiment Trend',
        improvementSuggestions: 'Improvement Suggestions',
        authorInsights: 'Author Insights',
        messageCategories: 'Message Categories',
        analysisResult: 'Analysis Result',
        analysisResultDescription: 'AI-powered insights from user messages',
        analysis: {
          summary: 'Overall Summary',
          keyPoints: 'Key Points',
          sentimentAnalysis: 'Sentiment Analysis',
          recommendations: 'Recommendations',
          authorInsights: 'Author Insights',
          messages: 'Message Details',
          category: 'Category',
          sentiment: 'Sentiment',
          messageCount: 'Message Count',
          keyThemes: 'Key Themes',
          positive: 'Positive',
          neutral: 'Neutral',
          negative: 'Negative',
        },
      },
      errors: {
        loginFailed: 'Login failed',
        invalidPassword: 'Invalid password',
        noAdminPermission: 'No admin permission',
        networkError: 'Network error. Please try again.',
        titleRequired: 'Title is required',
        shareLinkRequired: 'Share link and content are required',
        protocolNotFound: 'Protocol not found',
        invalidJson: 'Invalid JSON format or network error',
      },
    },
  },
  zh: {
    // 导航
    nav: {
      brand: '思革猫',
      home: '首页',
      collection: '产品',
      account: '账户',
      pwa: 'PWA应用',
    },
    // 首页
    home: {
      title: '欢迎来到我们的品牌',
      subtitle: '我们创造创新解决方案，激励和赋能。发现我们的产品系列，与我们一起踏上这段旅程。',
      explore: '探索产品系列',
      tagline: '可持续生活，自然之美',
      features: {
        quality: {
          title: '优质内容',
          description: '精选优质内容，旨在激发灵感和教育。',
        },
        products: {
          title: '优质产品',
          description: '发现我们精心打造的独家产品系列。',
        },
        customer: {
          title: '客户至上',
          description: '您的满意是我们的首要任务。我们在这里为您提供支持。',
        },
      },
    },
    // 品牌故事
    brand: {
      story: {
        title: 'SIGMÖ 的故事',
        subtitle: '让猫砂盆打理更简单、更洁净、更像家。',
        origin: 'Sigmö 诞生于一个简单的愿望——让猫砂盆打理更简单、更洁净、更像家。',
        philosophy: '我们发现许多宠物产品过于急切：包装上堆满信息，做出宏大承诺。那些真正能在家庭中长久留存的产品，不依赖刺激和说服，而是依靠稳定的日常惯例——不打扰你，却总能把事情做好。',
        meaning: {
          title: '从 Σ 开始',
          content: '它的意思是"把许多细节加在一起"。养猫的体验从来不是由单一点决定的，而是由粉尘、异味、结团效率、清洁节奏、空间美学……这些细节堆叠在一起，决定了一天结束时你面对猫砂盆时的感受。',
        },
        approach: '所以 Sigmö 不追求更复杂的概念。相反，我们重新组织这些细节——使用更克制的语言、更系统的产品体系、更稳定的体验——将散落的琐事汇聚成可靠的结果。',
        result: '每次清洁后，你会感觉更清爽、更从容、更放松。',
        benefit: '每一个细节，都汇集成更好的体验。',
        vision: {
          title: '安静的助手',
          content: 'Sigmö 想要成为你共享空间中的安静助手：像实验室一样严谨，像家一样温柔。',
          tagline: '没有喧哗，只有日常的安稳。',
        },
      },
    },
    // 产品页
    collection: {
      title: '产品系列',
      subtitle: '探索由 MODRA™ 架构驱动的 SIGMÖ 产品生态系统',
      core: {
        name: 'SIGMÖ CORE™',
        badge: '标准 / 主力 / 长期',
        description: '面向大众市场的核心产品线，提供稳定可靠的标准解决方案，适合长期使用和大规模部署。',
        products: [
          {
            id: 'Σ-01',
            name: 'SIGMÖ CORE™ / Σ-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System',
            status: 'available',
          },
          {
            id: 'Σ-02',
            name: 'SIGMÖ CORE™ / Σ-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System',
            status: 'available',
          },
        ],
      },
      x: {
        name: 'SIGMÖ X™',
        badge: '高性能 / 溢价',
        description: '针对极限性能需求的高端产品线，采用 MODRA™ Lock 技术实现性能跃迁，适用于高负载和专业场景。',
        products: [
          {
            id: 'Δ-01',
            name: 'SIGMÖ X™ / Δ-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Lock',
            status: 'limited',
          },
          {
            id: 'Δ-02',
            name: 'SIGMÖ X™ / Δ-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Lock',
            status: 'comingSoon',
          },
        ],
      },
      lab: {
        name: 'SIGMÖ LAB™',
        badge: '实验 / 前瞻',
        description: '技术试验和概念验证平台，探索前沿材料、结构和技术方案，为未来产品迭代提供创新基础。',
        products: [
          {
            id: 'EXP-01',
            name: 'SIGMÖ LAB™ / EXP-01',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Interface',
            status: 'limited',
          },
          {
            id: 'EXP-02',
            name: 'SIGMÖ LAB™ / EXP-02',
            description: 'Powered by MODRA™ Architecture • Built on MODRA™ Stack System • Enhanced with MODRA™ Grid',
            status: 'comingSoon',
          },
        ],
      },
      status: {
        available: '有货',
        limited: '限量',
        comingSoon: '即将推出',
      },
      viewDetails: '查看详情',
      modraArchitecture: 'Powered by MODRA™ Architecture',
    },
    // 账户页
    account: {
      title: '账户',
      subtitle: '查看您的账户状态和信息',
      notLoggedIn: {
        title: '未登录',
        description: '您当前未登录。请登录以访问您的账户。',
        adminHint: '如果您是管理员，请使用管理员入口登录。',
      },
      noPermission: {
        title: '无管理员权限',
        description: '您已登录但没有管理员权限。',
        note: '只有管理员才能访问管理界面。如果您认为这是错误，请联系网站管理员。',
      },
      adminAccount: {
        title: '管理员账户',
        description: '您拥有管理员权限。',
        goToDashboard: '前往管理仪表盘',
        adminAccessHint: '您可以访问管理仪表盘来管理问卷、协议和留言。',
      },
    },
    // 管理员
    admin: {
      entry: '管理员入口',
      portal: '管理门户',
      signIn: '登录',
      signingIn: '登录中...',
      emailTab: '邮箱',
      googleTab: '谷歌',
      email: '邮箱',
      password: '密码',
      placeholder: {
        email: 'admin@example.com',
        password: '••••••••',
        title: '协议标题',
        description: '协议描述',
      },
      required: '必填',
      optional: '可选',
      description: '登录以访问管理界面',
      googleDescription: '使用您的 Google 账户登录',
      signInWithGoogle: '使用 Google 登录',
      viewSite: '查看网站',
      logout: '退出登录',
      dashboard: '管理仪表盘',
      tabs: {
        protocols: '协议',
        surveys: '问卷',
        messages: '留言',
      },
      createProtocol: {
        title: '创建新协议',
        description: '创建新的测试协议并生成分享链接',
        create: '创建协议',
        creating: '创建中...',
        titleLabel: '标题',
        descriptionLabel: '描述（可选）',
      },
      existingProtocols: {
        title: '现有协议',
        description: '管理您的测试协议',
        noProtocols: '还没有协议。在上方创建您的第一个协议。',
        shareLink: '分享链接',
        created: '创建于: ',
      },
      surveys: {
        title: '用户问卷',
        description: '查看所有提交的问卷响应',
        noSurveys: '尚未提交问卷。',
        surveyId: '问卷ID: ',
      },
      messages: {
        title: '管理员留言',
        description: '查看和管理管理员的留言',
        noMessages: '还没有留言。成为第一个留言的人吧。',
        leaveMessage: '发表留言',
        nameLabel: '您的姓名',
        messageLabel: '留言内容',
        namePlaceholder: '请输入您的姓名',
        messagePlaceholder: '请输入您的留言...',
        submit: '发送留言',
        submitting: '发送中...',
        success: '留言发送成功！',
        cancel: '取消',
        delete: '删除',
        deleteConfirm: '确定要删除这条留言吗？',
        author: '作者',
        time: '发布时间',
        analyze: '生成AI分析',
        analyzing: '分析中...',
        analysisSuccess: '分析生成成功！',
        generatePPT: '生成PPT报告',
        generatingPPT: '生成PPT中...',
        pptSuccess: 'PPT生成成功！',
        downloadPPT: '下载PPT',
        noMessagesToAnalyze: '没有留言可供分析。',
        analysisFailed: '分析失败：{{error}}',
        analysisError: '分析留言时发生错误。',
        pleaseAnalyzeFirst: '请先分析留言，然后再生成PPT。',
        pptGenerationFailed: 'PPT生成失败：{{error}}',
        pptGenerationError: '生成PPT时发生错误。',
        overallSummary: '整体总结',
        keyPoints: '关键观点',
        sentimentTrend: '情感趋势',
        improvementSuggestions: '改进建议',
        authorInsights: '作者洞察',
        messageCategories: '留言分类',
        analysisResult: '分析结果',
        analysisResultDescription: 'AI驱动的用户留言洞察',
        analysis: {
          summary: '整体总结',
          keyPoints: '关键观点',
          sentimentAnalysis: '情感分析',
          recommendations: '改进建议',
          authorInsights: '作者洞察',
          messages: '留言详情',
          category: '分类',
          sentiment: '情感',
          messageCount: '留言数',
          keyThemes: '关注点',
          positive: '积极',
          neutral: '中性',
          negative: '消极',
        },
      },
      errors: {
        loginFailed: '登录失败',
        invalidPassword: '密码无效',
        noAdminPermission: '无管理员权限',
        networkError: '网络错误，请重试。',
        titleRequired: '标题必填',
        shareLinkRequired: '分享链接和内容必填',
        protocolNotFound: '协议未找到',
        invalidJson: '无效的 JSON 格式或网络错误',
      },
    },
  },
};

export function getTranslation(lang: Language, path: string): string {
  const keys = path.split('.');
  let current: any = translations[lang];

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`Translation not found for path: ${path}`);
      return path;
    }
  }

  return typeof current === 'string' ? current : path;
}
