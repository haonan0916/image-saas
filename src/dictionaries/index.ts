export const locales = ['zh', 'en'] as const;
export const defaultLocale = 'zh' as const;

export type Locale = typeof locales[number];

// 字典类型定义
export interface Dictionary {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    upload: string;
    download: string;
    create: string;
    update: string;
    submit: string;
    go: string;
    close: string;
    open: string;
    view: string;
    name: string;
    description: string;
    version: string;
    status: string;
    type: string;
    category: string;
    tags: string;
    size: string;
    format: string;
    createdAt: string;
    updatedAt: string;
    noDescription: string;
    noData: string;
    retry: string;
    refresh: string;
  };
  navigation: {
    dashboard: string;
    admin: string;
    settings: string;
    profile: string;
    logout: string;
  };
  dashboard: {
    title: string;
    description: string;
    welcome: string;
    createApp: string;
    appName: string;
    appDescription: string;
    appNotExist: string;
    chooseAnotherApp: string;
    createNew: string;
  };
  files: {
    title: string;
    dropHere: string;
    makeUrl: string;
    deleteSuccess: string;
    storageConfigRequired: string;
    configureStorageFirst: string;
    goToConfiguration: string;
  };
  image: {
    upload: string;
    processing: string;
    processed: string;
    download: string;
    delete: string;
    beforeDehaze: string;
    afterDehaze: string;
    dragSlider: string;
    viewOriginal: string;
    viewDehazed: string;
    downloadDehazed: string;
    loadError: string;
    downloadStart: string;
  };
  chat: {
    title: string;
    placeholder: string;
    send: string;
    clear: string;
    newChat: string;
    deleteChat: string;
    editTitle: string;
    confirmDelete: string;
    deleteConfirmMessage: string;
    aiAssistant: string;
    connecting: string;
    connected: string;
    disconnected: string;
    thinking: string;
    waitingForReply: string;
    useRAG: string;
    ragEnabled: string;
    ragDisabled: string;
  };
  tasks: {
    title: string;
    createTask: string;
    taskName: string;
    selectDataset: string;
    selectModel: string;
    inputImages: string;
    dehazeTask: string;
    taskManager: string;
    taskDetail: string;
    taskStats: string;
    noTasks: string;
    createSuccess: string;
    cancelSuccess: string;
    status: {
      pending: string;
      processing: string;
      completed: string;
      failed: string;
    };
    processingTime: string;
    unknown: string;
    seconds: string;
    minutes: string;
  };
  datasets: {
    title: string;
    createDataset: string;
    editDataset: string;
    datasetName: string;
    datasetDescription: string;
    datasetTags: string;
    addTag: string;
    removeTag: string;
    noDatasets: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    enterName: string;
  };
  models: {
    title: string;
    createModel: string;
    editModel: string;
    modelName: string;
    modelDescription: string;
    modelCategory: string;
    modelVersion: string;
    fileUrl: string;
    fileSize: string;
    fileFormat: string;
    isDefault: string;
    noModels: string;
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    categories: {
      general: string;
      highFidelity: string;
      fastProcessing: string;
    };
    formats: {
      pth: string;
      onnx: string;
      pb: string;
    };
  };
  services: {
    title: string;
    statusTest: string;
    checkStatus: string;
    startServices: string;
    serviceManagement: string;
    serviceStatus: string;
    serviceStarted: string;
    serviceInitialized: string;
    taskScheduler: string;
    runningStatus: string;
    checkInterval: string;
    activeBatches: string;
    description: string;
  };
  test: {
    dehazeTitle: string;
    imageCompare: string;
    debugVersion: string;
    normalVersion: string;
    imageLoadTest: string;
    dialogTest: string;
    openDehazeDialog: string;
    functionDescription: string;
    imageCompareFeatures: string;
    dehazeDialogFeatures: string;
    troubleshooting: string;
    streamTest: string;
    inputTestMessage: string;
    sending: string;
    aiReply: string;
  };
  rag: {
    title: string;
    admin: string;
    upload: string;
    process: string;
    query: string;
  };
  auth: {
    login: string;
  };
  home: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
      getStarted: string;
      learnMore: string;
      watchDemo: string;
    };
    features: {
      title: string;
      subtitle: string;
      multiCloud: {
        title: string;
        description: string;
      };
      aiProcessing: {
        title: string;
        description: string;
      };
      apiFirst: {
        title: string;
        description: string;
      };
      dataOwnership: {
        title: string;
        description: string;
      };
      realtime: {
        title: string;
        description: string;
      };
      scalable: {
        title: string;
        description: string;
      };
    };
    demo: {
      title: string;
      subtitle: string;
      beforeAfter: string;
    };
    integration: {
      title: string;
      subtitle: string;
      steps: {
        install: string;
        configure: string;
        upload: string;
      };
    };
    pricing: {
      title: string;
      subtitle: string;
      free: {
        title: string;
        price: string;
        period: string;
        features: string[];
      };
      pro: {
        title: string;
        price: string;
        period: string;
        features: string[];
      };
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  docs: {
    title: string;
    subtitle: string;
    quickStart: {
      title: string;
      subtitle: string;
      step1: {
        title: string;
        description: string;
      };
      step2: {
        title: string;
        description: string;
      };
      step3: {
        title: string;
        description: string;
      };
    };
    installation: {
      title: string;
      subtitle: string;
      npm: string;
      yarn: string;
      pnpm: string;
    };
    authentication: {
      title: string;
      subtitle: string;
      apiKey: {
        title: string;
        description: string;
      };
      signedToken: {
        title: string;
        description: string;
      };
    };
    usage: {
      title: string;
      subtitle: string;
      basicUpload: {
        title: string;
        description: string;
      };
      dehazeTask: {
        title: string;
        description: string;
      };
      reactIntegration: {
        title: string;
        description: string;
      };
      vueIntegration: {
        title: string;
        description: string;
      };
    };
    api: {
      title: string;
      subtitle: string;
      endpoints: {
        upload: string;
        task: string;
        status: string;
      };
    };
    examples: {
      title: string;
      subtitle: string;
    };
  };
}