import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post as HttpPost,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Laravel only had `GET post/list` (auth-gated `Post::all()`, no visibility
// filtering) - this completes the resource with full CRUD per
// MIGRATION_ROADMAP.md's Phase 6 note. All routes require auth, matching the
// original's `auth:sanctum` group.
@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.postsService.list(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(user, BigInt(id));
  }

  @HttpPost()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePostDto) {
    return this.postsService.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user, BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.postsService.remove(user, BigInt(id));
  }
}
