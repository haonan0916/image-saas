import { NextResponse } from 'next/server';
import { startBackgroundServices, getServiceStatus } from '@/server/startup';

// 在模块加载时自动启动服务
let initPromise: Promise<void> | null = null;

async function ensureServicesStarted() {
  if (!initPromise) {
    initPromise = startBackgroundServices().catch((error) => {
      console.error('Failed to start background services:', error);
      initPromise = null; // 重置，允许重试
      throw error;
    });
  }
  return initPromise;
}

// 在模块加载时启动服务
ensureServicesStarted().catch(console.error);

export async function GET() {
  try {
    await ensureServicesStarted();
    
    const status = getServiceStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Background services are running',
      status,
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get service status',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    await ensureServicesStarted();
    
    return NextResponse.json({
      success: true,
      message: 'Background services started successfully',
      status: getServiceStatus(),
    });
  } catch (error) {
    console.error('Error starting services:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to start background services',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}