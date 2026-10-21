import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';

const { outputText } = ts.transpileModule(readFileSync('lib/messaging/attachments.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const loaded = { exports: {} };
runInThisContext(`(function(exports){${outputText}\n})`)(loaded.exports);
const { attachmentContentType, attachmentError, MAX_ATTACHMENT_BYTES } = loaded.exports;

test('mixed document and image attachments are accepted', () => {
  for (const [fileName, contentType] of [
    ['photo.png', 'image/png'], ['brief.pdf', 'application/pdf'],
    ['copy.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['data.csv', 'text/csv'], ['notes.txt', 'text/plain'], ['assets.zip', 'application/zip'],
  ]) {
    assert.equal(attachmentError({ fileName, contentType, size: 1024 }), null);
  }
});

test('documents without browser MIME metadata use their extensions', () => {
  assert.equal(attachmentContentType('BRIEF.PDF', ''), 'application/pdf');
  assert.equal(attachmentContentType('data.csv', 'application/octet-stream'), 'text/csv');
  assert.equal(attachmentContentType('photo.png', 'image/png'), 'image/png');
  assert.equal(attachmentContentType('unknown.exe', ''), 'application/octet-stream');
});

test('empty, oversized, and unsupported attachments are rejected', () => {
  const file = { fileName: 'brief.pdf', contentType: 'application/pdf', size: 1 };
  assert.match(attachmentError({ ...file, size: 0 }), /empty/);
  assert.equal(attachmentError({ ...file, size: MAX_ATTACHMENT_BYTES }), null);
  assert.match(attachmentError({ ...file, size: MAX_ATTACHMENT_BYTES + 1 }), /50 MB/);
  assert.match(attachmentError({ ...file, contentType: 'application/octet-stream' }), /not allowed/);
});
