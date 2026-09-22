import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';
import { buildCorsOrigin } from './common/utils/cors-origin.util';
import { parseTrustProxy } from './common/throttle';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: parseTrustProxy(process.env.TRUST_PROXY) }),
  );

  // FRONTEND_DIST_PATH is only set in the single-container demo bundle (see
  // Dockerfile), where this same Fastify instance also serves the built Vue
  // app so the whole demo lives behind one origin/port. Normal deployments
  // (frontend on its own origin) never set this and behave exactly as before.
  const frontendDistPath = process.env.FRONTEND_DIST_PATH;

  // Security headers. The web app (another origin) loads images from /uploads,
  // so resources must stay embeddable cross-origin; everything else is default.
  // CSP is dropped entirely in bundled-demo mode - Helmet's default policy has
  // no reason to fight the Vite-built SPA it's now serving alongside the API.
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: frontendDistPath ? false : undefined,
  });

  await app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await app.register(fastifyStatic, {
    root: join(process.cwd(), process.env.STORAGE_ROOT ?? './storage/uploads'),
    prefix: '/uploads/',
  });

  if (frontendDistPath) {
    await app.register(fastifyStatic, {
      root: frontendDistPath,
      prefix: '/',
      decorateReply: false,
    });

    // Vue Router uses history mode, so any path that isn't a real static
    // file or an API route (/v1, /uploads, /socket.io) is a client-side
    // route - serve index.html and let the SPA's router take over.
    app.getHttpAdapter().getInstance().setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
      const url = request.raw.url ?? '';
      if (url.startsWith('/v1/') || url.startsWith('/uploads/') || url.startsWith('/socket.io/')) {
        reply.status(404).send({ statusCode: 404, message: 'Not Found' });
        return;
      }
      reply.type('text/html').sendFile('index.html', frontendDistPath);
    });
  }

  app.enableCors({
    origin: buildCorsOrigin(process.env.CORS_ORIGIN, process.env.ROOT_DOMAIN),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new BigIntInterceptor());

  app.setGlobalPrefix('v1');

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
