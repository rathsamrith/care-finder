import { BadRequestException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export interface ParsedMultipartFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface ParsedMultipart {
  fields: Record<string, string>;
  files: ParsedMultipartFile[];
}

// Shared by every module that accepts a multipart form carrying both plain
// fields (hospitalId, name, ...) and file(s) in the same request (Departments,
// Hospital Services, Preview Images, Hospital Promotions).
//
// @fastify/multipart's built-in `request.file()`/`request.files()` helpers
// expose a `.fields` snapshot on the returned part, but that snapshot only
// contains whatever fields busboy had already parsed *before* it reached that
// file part in the stream - order-dependent and easy to get wrong depending
// on how the client's FormData happens to serialize its entries. Iterating
// `request.parts()` ourselves and fully draining each file part (via
// `toBuffer()`) before moving to the next one sidesteps that: every field is
// guaranteed to be collected by the time this resolves, regardless of
// whether the client sent fields before or after the file(s).
export async function parseMultipart(req: FastifyRequest): Promise<ParsedMultipart> {
  if (!req.isMultipart()) {
    throw new BadRequestException('Expected a multipart/form-data request');
  }

  const fields: Record<string, string> = {};
  const files: ParsedMultipartFile[] = [];

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer();
      files.push({
        fieldname: part.fieldname,
        filename: part.filename,
        mimetype: part.mimetype,
        buffer,
      });
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }

  return { fields, files };
}
