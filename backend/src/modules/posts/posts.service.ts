import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const POST_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, name: true, profile: true } },
} as const;

// The original Laravel `PostController` only implemented `index`
// (`Post::all()`, no visibility filtering at all). This pass completes the
// resource with full CRUD and adds a visibility rule per the task spec:
// admins see everything, everyone else sees published posts plus their own
// (published or not).
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const isAdmin = user.roles.includes('admin');
    return this.prisma.post.findMany({
      where: isAdmin ? undefined : this.visibilityFilter(user),
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: bigint) {
    const isAdmin = user.roles.includes('admin');
    const post = await this.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (!isAdmin && !post.publish && post.userId !== user.id) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async create(user: AuthenticatedUser, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        userId: user.id,
        title: dto.title,
        description: dto.description,
        publish: dto.publish ?? false,
      },
      include: POST_INCLUDE,
    });
  }

  async update(user: AuthenticatedUser, id: bigint, dto: UpdatePostDto) {
    const post = await this.getOwnedOrAdminOrThrow(user, id);
    return this.prisma.post.update({
      where: { id: post.id },
      data: {
        title: dto.title,
        description: dto.description,
        publish: dto.publish,
      },
      include: POST_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: bigint) {
    const post = await this.getOwnedOrAdminOrThrow(user, id);
    await this.prisma.post.delete({ where: { id: post.id } });
    return { message: 'Post deleted' };
  }

  private visibilityFilter(user: AuthenticatedUser): Prisma.PostWhereInput {
    return { OR: [{ publish: true }, { userId: user.id }] };
  }

  private async getOwnedOrAdminOrThrow(user: AuthenticatedUser, id: bigint) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const isOwner = post.userId === user.id;
    const isAdmin = user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot modify this post');
    }
    return post;
  }
}
