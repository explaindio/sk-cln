import { prisma } from '../lib/prisma';

export class CategoryService {
  async create(data: {
    name: string;
    description?: string;
    communityId: string;
    position?: number;
  }) {
    return await prisma.category.create({
      data,
    });
  }
  
  async listByCommunity(communityId: string) {
    return await prisma.category.findMany({
      where: { communityId },
      orderBy: { position: 'asc' },
    });
  }
  
  async update(id: string, data: {
    name?: string;
    description?: string;
    position?: number;
  }) {
    return await prisma.category.update({
      where: { id },
      data,
    });
  }
  
  async delete(id: string) {
    return await prisma.category.delete({
      where: { id },
    });
  }
}

export const categoryService = new CategoryService();