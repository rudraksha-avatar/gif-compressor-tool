export class MemoryManager {
  private urls = new Map<string, string>();

  setObjectUrl(key: string, source: Blob | MediaSource): string {
    this.revokeObjectUrl(key);
    const url = URL.createObjectURL(source);
    this.urls.set(key, url);
    return url;
  }

  revokeObjectUrl(key: string): void {
    const current = this.urls.get(key);
    if (!current) {
      return;
    }

    URL.revokeObjectURL(current);
    this.urls.delete(key);
  }

  revokeAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }

    this.urls.clear();
  }
}
