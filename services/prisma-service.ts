import { PrismaClient } from '@prisma/client';

class PrismaService {
  static instance: PrismaService;
  public prisma: PrismaClient = new PrismaClient();
  
  static getInstance(): PrismaService {
    if(!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
      console.log('New prisma service instance has been created.');
    }
    return PrismaService.instance;
  }
}

export default PrismaService;