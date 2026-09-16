// 类型定义
export type TabKey = "posts" | "upload" | "media" | "publish";

export interface Section {
  name: string;
  title: string;
}

export interface PostMeta {
  [key: string]: unknown;
}

export interface Post {
  name: string;
  path: string;
  title: string;
  date: string;
  draft: boolean;
  tags: string[];
  mtime: string;
}

export interface PostDetail {
  path: string;
  meta: PostMeta;
  body: string;
}

export interface MediaFile {
  path: string;
  url: string;
  thumb: string; // 网格缩略图（480px webp，无缩略图时回退原图）
  folder: string;
  size: number;
  mtime: string;
}

export interface UploadResult {
  ok: boolean;
  filename: string;
  folder: string;
  url: string;
  markdown: string;
  sizeBefore: number;
  sizeAfter: number;
  compressed: boolean;
}

export interface HugoStatus {
  running: boolean;
  url: string;
  log: string;
}

export interface PublishStatus {
  running: boolean;
  log: string;
}

export interface SectionList {
  sections: Section[];
}

export interface PostList {
  posts: Post[];
}

export interface MediaList {
  files: MediaFile[];
  folders: string[];
}
