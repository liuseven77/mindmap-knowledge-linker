// File System Access API 类型补充
// TypeScript lib.dom 尚未覆盖 queryPermission / requestPermission / entries 等方法

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: string | FileSystemHandle;
  }): Promise<FileSystemDirectoryHandle>;
}
