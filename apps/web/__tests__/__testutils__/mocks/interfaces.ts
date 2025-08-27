/**
 * Type-safe interfaces for mocked services
 * These interfaces ensure that mocks match their real counterparts
 * while adding the correct Mock types for test functionality
 */
import { MockedFunction } from 'vitest';

import { Logger } from '../../../utils/logger';
import { BlobPathService } from '../../../utils/services/BlobPathService';
import { BlobService } from '../../../utils/services/BlobService';
import { VercelBlobAssetService } from '../../../utils/services/VercelBlobAssetService';

/**
 * Type-safe mock for the Logger service
 */
export interface MockLogger extends Logger {
  info: MockedFunction<Logger['info']>;
  debug: MockedFunction<Logger['debug']>;
  warn: MockedFunction<Logger['warn']>;
  error: MockedFunction<Logger['error']>;
  child: MockedFunction<Logger['child']>;
}

/**
 * Type-safe mock for the BlobService
 */
export interface MockBlobService extends Omit<BlobService, 'uploadFile'> {
  uploadFile: MockedFunction<BlobService['uploadFile']>;
  uploadText: MockedFunction<BlobService['uploadText']>;
  listFiles: MockedFunction<BlobService['listFiles']>;
  getFileInfo: MockedFunction<BlobService['getFileInfo']>;
  deleteFile: MockedFunction<BlobService['deleteFile']>;
  getUrlForPath: MockedFunction<BlobService['getUrlForPath']>;
  fetchText: MockedFunction<BlobService['fetchText']>;
}

/**
 * Type-safe mock for the BlobPathService
 */
export interface MockBlobPathService extends BlobPathService {
  getAssetPath: MockedFunction<BlobPathService['getAssetPath']>;
  getBookImagePath: MockedFunction<BlobPathService['getBookImagePath']>;
  getBrainrotTextPath: MockedFunction<BlobPathService['getBrainrotTextPath']>;
  getFulltextPath: MockedFunction<BlobPathService['getFulltextPath']>;
  getSourceTextPath: MockedFunction<BlobPathService['getSourceTextPath']>;
  getSharedImagePath: MockedFunction<BlobPathService['getSharedImagePath']>;
  getSiteAssetPath: MockedFunction<BlobPathService['getSiteAssetPath']>;
  getAudioPath: MockedFunction<BlobPathService['getAudioPath']>;
  convertLegacyPath: MockedFunction<BlobPathService['convertLegacyPath']>;
  getBookSlugFromPath: MockedFunction<BlobPathService['getBookSlugFromPath']>;
}

/**
 * Type-safe mock for VercelBlobAssetService
 */
export interface MockVercelBlobAssetService
  extends Omit<
    VercelBlobAssetService,
    | 'getAssetUrl'
    | 'assetExists'
    | 'fetchAsset'
    | 'fetchTextAsset'
    | 'uploadAsset'
    | 'deleteAsset'
    | 'listAssets'
  > {
  getAssetUrl: MockedFunction<VercelBlobAssetService['getAssetUrl']>;
  assetExists: MockedFunction<VercelBlobAssetService['assetExists']>;
  fetchAsset: MockedFunction<VercelBlobAssetService['fetchAsset']>;
  fetchTextAsset: MockedFunction<VercelBlobAssetService['fetchTextAsset']>;
  uploadAsset: MockedFunction<VercelBlobAssetService['uploadAsset']>;
  deleteAsset: MockedFunction<VercelBlobAssetService['deleteAsset']>;
  listAssets: MockedFunction<VercelBlobAssetService['listAssets']>;
}

/**
 * Type-safe mock for Vercel Blob's primary functions
 */
export interface MockVercelBlob {
  put: MockedFunction<(typeof import('@vercel/blob'))['put']>;
  list: MockedFunction<(typeof import('@vercel/blob'))['list']>;
  head: MockedFunction<(typeof import('@vercel/blob'))['head']>;
  del: MockedFunction<(typeof import('@vercel/blob'))['del']>;
}

/**
 * Type-safe mock for fetch Response
 */
export interface MockResponse
  extends Omit<
    Response,
    'json' | 'text' | 'arrayBuffer' | 'blob' | 'formData' | 'clone' | 'bytes'
  > {
  json: MockedFunction<Response['json']>;
  text: MockedFunction<Response['text']>;
  arrayBuffer: MockedFunction<Response['arrayBuffer']>;
  blob: MockedFunction<Response['blob']>;
  formData: MockedFunction<Response['formData']>;
  clone: MockedFunction<Response['clone']>;
  bytes: MockedFunction<Response['bytes']>;
}

/**
 * Type-safe mock for fetch function
 */
export type MockFetch = MockedFunction<typeof global.fetch>;

/**
 * Type-safe mock for AssetPathService
 */
export interface MockAssetPathService {
  getAssetPath: MockedFunction<
    (assetType: string, bookSlug: string | null, assetName: string) => string
  >;
  normalizeLegacyPath: MockedFunction<(legacyPath: string) => string>;
  getTextPath: MockedFunction<
    (bookSlug: string, textType: string, chapter?: string | number) => string
  >;
  getBookSlugFromPath: MockedFunction<(path: string) => string | null>;
  getAudioPath: MockedFunction<(bookSlug: string, chapter: string | number) => string>;
  getImagePath: MockedFunction<
    (bookSlug: string, imageType: string, chapter?: string | number, extension?: string) => string
  >;
}
